import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api';
import type { GreenApi } from '@/shared/api';
import { pollNotifications } from './poll';

afterEach(() => vi.useRealTimers());
function fakeApi() {
  return { receiveNotification: vi.fn(), deleteNotification: vi.fn() };
}
describe('notification queue', () => {
  it('waits after an empty response before polling again', async () => {
    vi.useFakeTimers();
    const api = fakeApi();
    const controller = new AbortController();
    api.receiveNotification.mockImplementation(async () => {
      if (api.receiveNotification.mock.calls.length === 2) controller.abort();
      return null;
    });
    const run = pollNotifications(api as unknown as GreenApi, controller.signal, vi.fn(), vi.fn());
    await vi.advanceTimersByTimeAsync(999);
    expect(api.receiveNotification).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await run;
    expect(api.receiveNotification).toHaveBeenCalledTimes(2);
  });
  it('processes before acknowledging and retries only the acknowledgement', async () => {
    vi.useFakeTimers();
    const api = fakeApi();
    const controller = new AbortController();
    const order: string[] = [];
    api.receiveNotification.mockResolvedValue({ receiptId: 1, body: { type: 'text' } });
    api.deleteNotification
      .mockImplementationOnce(async () => {
        order.push('delete-failed');
        throw new ApiError('offline', true);
      })
      .mockImplementationOnce(async () => {
        order.push('delete-success');
        controller.abort();
      });
    const run = pollNotifications(
      api as unknown as GreenApi,
      controller.signal,
      () => {
        order.push('process');
      },
      vi.fn(),
    );
    await vi.advanceTimersByTimeAsync(1100);
    await run;
    expect(order).toEqual(['process', 'delete-failed', 'delete-success']);
    expect(api.receiveNotification).toHaveBeenCalledTimes(1);
  });
  it('stops on permanent authentication errors', async () => {
    const api = fakeApi();
    api.receiveNotification.mockRejectedValue(new ApiError('unauthorized'));
    const status = vi.fn();
    await pollNotifications(
      api as unknown as GreenApi,
      new AbortController().signal,
      vi.fn(),
      status,
    );
    expect(status).toHaveBeenLastCalledWith({ state: 'error', detail: 'unauthorized' });
    expect(api.deleteNotification).not.toHaveBeenCalled();
  });
  it('acknowledges a terminal service event before stopping', async () => {
    const api = fakeApi();
    api.receiveNotification.mockResolvedValue({ receiptId: 2, body: {} });
    api.deleteNotification.mockResolvedValue(undefined);
    const status = vi.fn();
    await pollNotifications(
      api as unknown as GreenApi,
      new AbortController().signal,
      () => ({ state: 'error', detail: 'instance stopped' }),
      status,
    );
    expect(api.deleteNotification).toHaveBeenCalledWith(2, expect.any(AbortSignal));
    expect(status).toHaveBeenLastCalledWith({ state: 'error', detail: 'instance stopped' });
  });
});
