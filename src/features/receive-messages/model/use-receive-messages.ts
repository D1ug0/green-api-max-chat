import { useEffect, useState } from 'react';
import { conversationStore, parseIncoming, parseStatus } from '@/entities/conversation';
import type { Session } from '@/entities/session';
import { isRecord } from '@/shared/lib';
import { getErrorMessage } from '@/shared/api';
import { pollNotifications } from './poll';
import type { ConnectionStatus } from './poll';

export function useReceiveMessages(session: Session) {
  const [status, setStatus] = useState<ConnectionStatus>({ state: 'connecting' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, session.controller.signal]);
    const onStatus = (next: ConnectionStatus) => {
      if (!signal.aborted) setStatus(next);
    };
    const receive = (body: unknown): ConnectionStatus | void => {
      const parsed = parseIncoming(body);
      if (parsed && conversationStore.getState().chats[parsed.chat.id])
        conversationStore.getState().addMessage(parsed.chat, parsed.message);
      if (!isRecord(body)) return;
      if (
        body.typeWebhook === 'outgoingMessageStatus' &&
        typeof body.chatId === 'string' &&
        typeof body.idMessage === 'string'
      ) {
        const next = parseStatus(body.status);
        if (next) conversationStore.getState().updateStatus(body.chatId, body.idMessage, next);
      }
      if (body.typeWebhook === 'stateInstanceChanged' && body.stateInstance !== 'authorized') {
        return {
          state: 'error',
          detail:
            'Состояние аккаунта изменилось. Проверьте инстанс в GREEN-API и подключитесь заново.',
        };
      }
      if (body.typeWebhook === 'quotaExceeded') {
        return {
          state: 'error',
          detail: 'Достигнут лимит тарифа GREEN-API. Проверьте его в личном кабинете.',
        };
      }
    };
    const run = async () => {
      const consume = async () => {
        if (signal.aborted) return;
        // A newly entered connection was checked by ConnectForm. A restored one
        // must be checked again before the UI reports that it is connected.
        if (session.mode === 'live' && session.restored) {
          try {
            const state = await session.api.getState(signal);
            if (state !== 'authorized') {
              onStatus({
                state: 'error',
                detail: 'Инстанс MAX больше не авторизован. Проверьте его в GREEN-API.',
              });
              return;
            }
            const settings = await session.api.getSettings(signal);
            if (settings.webhookUrl || settings.incomingWebhook !== 'yes') {
              onStatus({
                state: 'error',
                detail: 'Для получения сообщений очистите webhookUrl и включите incomingWebhook.',
              });
              return;
            }
          } catch (error) {
            if (!signal.aborted) onStatus({ state: 'error', detail: getErrorMessage(error) });
            return;
          }
        }
        if (signal.aborted) return;
        onStatus({ state: 'connected' });
        await pollNotifications(session.api, signal, receive, onStatus);
      };
      // One queue consumer per instance and origin, including multiple tabs.
      if (session.mode === 'live' && navigator.locks) {
        onStatus({
          state: 'waiting',
          detail: 'Ожидание получения сообщений. Если чат открыт в другой вкладке, закройте её.',
        });
        try {
          await navigator.locks.request(`green-api-max:${session.instanceId}`, { signal }, consume);
        } catch (error) {
          if (!signal.aborted) onStatus({ state: 'error', detail: getErrorMessage(error) });
        }
      } else {
        await consume();
      }
    };
    void run();
    return () => controller.abort();
  }, [session, revision]);
  return { status, retry: () => setRevision((value) => value + 1) };
}
