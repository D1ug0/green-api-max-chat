import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGreenApi, normalizeApiUrl } from './client';
import { ApiError } from './errors';

const credentials = {
  idInstance: '3100000000',
  apiTokenInstance: 'test-token',
  apiUrl: 'https://3100.api.green-api.com',
};
const signal = () => new AbortController().signal;
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
afterEach(() => vi.useRealTimers());
describe('API boundary', () => {
  it('sends the documented MAX request and returns the message ID', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ idMessage: 'message-1' }));
    const id = await createGreenApi(credentials, fetcher).sendMessage('123', 'Привет', signal());
    expect(id).toBe('message-1');
    expect(fetcher).toHaveBeenCalledWith(
      'https://3100.api.green-api.com/v3/waInstance3100000000/sendMessage/test-token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ chatId: '123', message: 'Привет' }),
        credentials: 'omit',
      }),
    );
  });
  it('handles empty long-poll responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(''));
    expect(await createGreenApi(credentials, fetcher).receiveNotification(signal())).toBeNull();
  });
  it('spaces consecutive GetChatHistory requests to respect the API limit', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => json([]));
    const api = createGreenApi(credentials, fetcher);
    const first = api.getHistory('first', signal());
    const second = api.getHistory('second', signal());
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1099);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([first, second]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid receipts without acknowledging them', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ receiptId: 'invalid', body: {} }));
    await expect(
      createGreenApi(credentials, fetcher).receiveNotification(signal()),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not expose the upstream body or token in errors', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json({ error: 'test-token should stay private' }, 403));
    const error = await createGreenApi(credentials, fetcher)
      .getState(signal())
      .catch((value) => value);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).not.toContain('test-token');
    expect(error.retryable).toBe(false);
  });
  it('marks a lost send response as uncertain', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('Failed to fetch secret URL'));
    await expect(
      createGreenApi(credentials, fetcher).sendMessage('123', 'Hi', signal()),
    ).rejects.toMatchObject({ uncertain: true });
  });
  it('resolves a phone number to a stable chat identifier', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ exist: true, chatId: '123' }));
    expect(await createGreenApi(credentials, fetcher).checkAccount('79991234567', signal())).toBe(
      '123',
    );
  });
  it('handles an unsuccessful lookup returned with HTTP 200', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ exist: false, chatId: '' }));
    await expect(
      createGreenApi(credentials, fetcher).checkAccount('79991234567', signal()),
    ).rejects.toThrow('Не удалось найти');
  });
  it.each([
    'https://evil.example',
    'http://3100.api.green-api.com',
    'https://3100.api.green-api.com.evil.example',
    'https://user:pass@3100.api.green-api.com',
    'https://3100.api.green-api.com/path',
  ])('rejects untrusted API host %s', (host) => expect(() => normalizeApiUrl(host)).toThrow());
  it('accepts a cabinet API URL with a v3 suffix', () =>
    expect(normalizeApiUrl('https://3100.api.green-api.com/v3/')).toBe(credentials.apiUrl));
});
