import { delay, isRecord } from '@/shared/lib';
import { ApiError, httpError } from './errors';
import type { Credentials, GreenApi, InstanceSettings, Receipt } from './types';

// The MAX cluster supports CORS. A custom host is restricted so credentials
// cannot accidentally be sent to an unrelated server.
export const DEFAULT_API_URL = 'https://3100.api.green-api.com';
export function normalizeApiUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ApiError('Введите корректный apiUrl из личного кабинета GREEN-API.');
  }
  if (
    url.protocol !== 'https:' ||
    !/^(\d{4}\.)?api\.green-api\.com$/.test(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/(v3\/?)?$/.test(url.pathname)
  ) {
    throw new ApiError(
      'Разрешён только HTTPS-адрес сервера api.green-api.com или XXXX.api.green-api.com.',
    );
  }
  return url.origin;
}

export function createGreenApi(
  credentials: Credentials,
  transport: typeof fetch = fetch,
): GreenApi {
  const apiUrl = normalizeApiUrl(credentials.apiUrl);
  if (!/^\d+$/.test(credentials.idInstance) || !/^[\w-]+$/.test(credentials.apiTokenInstance)) {
    throw new ApiError('Проверьте формат idInstance и apiTokenInstance.');
  }
  const base = `${apiUrl}/v3/waInstance${credentials.idInstance}`;
  const rateLimitedMethods = new Set(['getStateInstance', 'getSettings', 'getChatHistory']);
  const nextRequestAt = new Map<string, number>();
  async function request(
    method: string,
    signal: AbortSignal,
    options: {
      verb?: string;
      body?: unknown;
      suffix?: string;
      query?: string;
      timeout?: number;
    } = {},
  ): Promise<unknown> {
    signal.throwIfAborted();
    // GREEN-API allows one call per second for these methods. Reserve a slot
    // before waiting so overlapping requests, including aborted ones, stay spaced.
    if (rateLimitedMethods.has(method)) {
      const now = Date.now();
      const scheduled = Math.max(now, nextRequestAt.get(method) ?? 0);
      nextRequestAt.set(method, scheduled + 1100);
      if (scheduled > now) await delay(scheduled - now, signal);
      signal.throwIfAborted();
    }
    const timeout = AbortSignal.timeout(options.timeout ?? 30_000);
    let response: Response;
    try {
      response = await transport(
        `${base}/${method}/${credentials.apiTokenInstance}${options.suffix ?? ''}${options.query ?? ''}`,
        {
          method: options.verb ?? 'GET',
          headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          signal: AbortSignal.any([signal, timeout]),
          credentials: 'omit',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
        },
      );
    } catch {
      signal.throwIfAborted();
      throw new ApiError(
        timeout.aborted
          ? 'Сервер не ответил вовремя.'
          : 'Нет связи с GREEN-API. Проверьте интернет и адрес сервера API.',
        true,
        true,
      );
    }
    if (!response.ok) throw httpError(response.status);
    let text: string;
    try {
      text = await response.text();
    } catch {
      signal.throwIfAborted();
      throw new ApiError('Соединение прервалось при получении ответа.', true, true);
    }
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(
        'GREEN-API вернул неожиданный формат ответа.',
        false,
        method === 'sendMessage',
      );
    }
  }
  function record(value: unknown): Record<string, unknown> {
    if (!isRecord(value))
      throw new ApiError('GREEN-API вернул неполный ответ. Повторите подключение.');
    return value;
  }
  async function list(method: string, signal: AbortSignal, body?: unknown): Promise<unknown[]> {
    const data = await request(method, signal, { verb: body ? 'POST' : 'GET', body });
    if (!Array.isArray(data)) throw new ApiError('Не удалось прочитать список из GREEN-API.');
    return data;
  }
  return {
    async getState(signal) {
      const data = record(await request('getStateInstance', signal));
      if (typeof data.stateInstance !== 'string')
        throw new ApiError('Инстанс ещё создаётся. Повторите подключение позже.');
      return data.stateInstance;
    },
    async getSettings(signal) {
      const data = record(await request('getSettings', signal));
      const fields = [
        'typeInstance',
        'webhookUrl',
        'incomingWebhook',
        'outgoingWebhook',
        'outgoingAPIMessageWebhook',
        'outgoingMessageWebhook',
      ] as const;
      return Object.fromEntries(
        fields.map((key) => [key, typeof data[key] === 'string' ? data[key] : '']),
      ) as unknown as InstanceSettings;
    },
    getHistory: (chatId, signal) => list('getChatHistory', signal, { chatId, count: 100 }),
    async checkAccount(phone, signal) {
      const data = record(
        await request('checkAccount', signal, {
          verb: 'POST',
          body: { phoneNumber: Number(phone) },
        }),
      );
      if (data.exist === false)
        throw new ApiError(
          'Не удалось найти MAX по этому номеру. Проверьте номер и настройки приватности получателя.',
        );
      if (data.exist !== true || typeof data.chatId !== 'string' || !data.chatId)
        throw new ApiError(
          'MAX не подтвердил поиск номера. Проверьте состояние инстанса и лимит проверок.',
        );
      return data.chatId;
    },
    async sendMessage(chatId, text, signal) {
      const data = await request('sendMessage', signal, {
        verb: 'POST',
        body: { chatId, message: text },
      });
      if (!isRecord(data) || typeof data.idMessage !== 'string' || !data.idMessage)
        throw new ApiError(
          'Не удалось подтвердить отправку. Проверьте историю чата перед повтором.',
          false,
          true,
        );
      return data.idMessage;
    },
    async receiveNotification(signal) {
      const data = await request('receiveNotification', signal, {
        query: '?receiveTimeout=25',
        timeout: 35_000,
      });
      if (data === null) return null;
      const receipt = record(data);
      if (!Number.isSafeInteger(receipt.receiptId) || !isRecord(receipt.body))
        throw new ApiError('Не удалось прочитать уведомление GREEN-API.');
      return receipt as unknown as Receipt;
    },
    async deleteNotification(receiptId, signal) {
      const data = record(
        await request('deleteNotification', signal, { verb: 'DELETE', suffix: `/${receiptId}` }),
      );
      // false means the receipt was already removed or is no longer current.
      if (typeof data.result !== 'boolean')
        throw new ApiError('Сервер не подтвердил обработку уведомления.', true);
    },
  };
}
