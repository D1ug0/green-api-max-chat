import { useCallback, useEffect, useState } from 'react';
import { conversationStore, parseHistory } from '@/entities/conversation';
import type { Session } from '@/entities/session';
import { getErrorMessage } from '@/shared/api';

export function useHistory(session: Session, chatId: string | null) {
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!chatId) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, session.controller.signal]);
    const store = conversationStore.getState();
    let inFlight = false;
    const load = (showLoading: boolean) => {
      if (signal.aborted || inFlight) return;
      inFlight = true;
      if (showLoading) store.setHistory(chatId, 'loading');
      void session.api
        .getHistory(chatId, signal)
        .then((items) => {
          if (!signal.aborted)
            store.mergeHistory(
              chatId,
              items.flatMap((item) => {
                const message = parseHistory(item);
                return message ? [message] : [];
              }),
            );
        })
        .catch((error) => {
          if (!signal.aborted) store.setHistory(chatId, 'error', getErrorMessage(error));
        })
        .finally(() => {
          inFlight = false;
        });
    };
    load(true);
    // Reconcile the active chat if a notification was missed or history arrived later.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, 30_000);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, [session, chatId, revision]);
  return reload;
}
