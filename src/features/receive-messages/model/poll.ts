import { ApiError, getErrorMessage } from '@/shared/api';
import type { GreenApi, Receipt } from '@/shared/api';
import { delay } from '@/shared/lib';

export type ConnectionStatus = {
  state: 'connecting' | 'connected' | 'retrying' | 'error' | 'waiting';
  detail?: string;
};
export async function pollNotifications(
  api: GreenApi,
  signal: AbortSignal,
  onNotification: (body: unknown) => ConnectionStatus | void,
  onStatus: (status: ConnectionStatus) => void,
) {
  let attempt = 0;
  let pending: Receipt | null = null;
  let terminalStatus: ConnectionStatus | void = undefined;
  while (!signal.aborted) {
    try {
      if (!pending) {
        pending = await api.receiveNotification(signal);
        signal.throwIfAborted();
        if (pending) terminalStatus = onNotification(pending.body);
      }
      if (pending) {
        await api.deleteNotification(pending.receiptId, signal);
        pending = null;
        if (terminalStatus) {
          onStatus(terminalStatus);
          return;
        }
        await delay(150, signal);
      } else {
        // Some clusters return an empty response before receiveTimeout expires.
        // Avoid a tight loop of empty ReceiveNotification requests.
        await delay(1000, signal);
      }
      onStatus({ state: 'connected' });
      attempt = 0;
    } catch (error) {
      if (signal.aborted) return;
      if (!(error instanceof ApiError) || !error.retryable) {
        onStatus({ state: 'error', detail: getErrorMessage(error) });
        return;
      }
      onStatus({ state: 'retrying', detail: getErrorMessage(error) });
      const wait = Math.min(1000 * 2 ** attempt++, 30_000);
      try {
        await delay(wait, signal);
      } catch {
        return;
      }
    }
  }
}
