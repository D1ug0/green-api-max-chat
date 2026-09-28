import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationStore } from '@/entities/conversation';
import type { Session } from '@/entities/session';
import type { GreenApi } from '@/shared/api';
import { useHistory } from './use-history';

beforeEach(() => {
  vi.useFakeTimers();
  conversationStore.getState().reset();
  conversationStore.getState().addChats([{ id: 'chat-1', title: 'Собеседник' }]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('active chat history', () => {
  it('recovers an incoming message that appears in history after the initial load', async () => {
    const outgoing = {
      idMessage: 'sent-1',
      timestamp: 10,
      type: 'outgoing',
      typeMessage: 'textMessage',
      textMessage: 'Привет',
      statusMessage: 'sent',
    };
    const incoming = {
      idMessage: 'reply-1',
      timestamp: 11,
      type: 'incoming',
      typeMessage: 'textMessage',
      textMessage: 'Ответ',
    };
    const getHistory = vi
      .fn()
      .mockResolvedValueOnce([outgoing])
      .mockResolvedValueOnce([incoming, outgoing]);
    const session: Session = {
      id: 'session',
      instanceId: '3100000000',
      mode: 'live',
      tracksStatus: false,
      controller: new AbortController(),
      api: { getHistory } as unknown as GreenApi,
    };

    renderHook(() => useHistory(session, 'chat-1'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(conversationStore.getState().chats['chat-1'].messages).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(getHistory).toHaveBeenCalledTimes(2);
    expect(conversationStore.getState().chats['chat-1'].messages).toEqual([
      expect.objectContaining({ id: 'sent-1', direction: 'outgoing' }),
      expect.objectContaining({ id: 'reply-1', direction: 'incoming', text: 'Ответ' }),
    ]);
  });
});
