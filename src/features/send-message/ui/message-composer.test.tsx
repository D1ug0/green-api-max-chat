import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MessageComposer } from './message-composer';
import { conversationStore } from '@/entities/conversation';
import type { Session } from '@/entities/session';
import { ApiError } from '@/shared/api';
import type { GreenApi } from '@/shared/api';

const chat = { id: '123', title: 'Контакт' };
beforeEach(() => {
  conversationStore.getState().reset();
  conversationStore.getState().addChats([chat]);
});
afterEach(cleanup);
function setup(send = vi.fn().mockResolvedValue('server-1')) {
  const session: Session = {
    id: 'session',
    instanceId: '3100000000',
    mode: 'live',
    tracksStatus: true,
    controller: new AbortController(),
    api: { sendMessage: send } as unknown as GreenApi,
  };
  render(<MessageComposer chat={chat} session={session} disabled={false} />);
  return { send, input: screen.getByRole('textbox', { name: 'Сообщение' }) };
}
describe('message composer', () => {
  it('sends one trimmed message on Enter and clears the draft', async () => {
    const { send, input } = setup();
    fireEvent.change(input, { target: { value: ' Привет! ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(conversationStore.getState().chats['123'].messages[0]?.status).toBe('queued'),
    );
    expect(send).toHaveBeenCalledExactlyOnceWith('123', 'Привет!', expect.any(AbortSignal));
    expect(input).toHaveValue('');
  });
  it('does not submit on Shift+Enter, IME composition, empty or oversized input', () => {
    const { send, input } = setup();
    fireEvent.change(input, { target: { value: 'Привет' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.change(input, { target: { value: ' ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'a'.repeat(4001) } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Отправить сообщение' })).toBeDisabled();
    expect(send).not.toHaveBeenCalled();
  });
  it('keeps a lost response as uncertain and never automatically resends', async () => {
    const { send, input } = setup(
      vi.fn().mockRejectedValue(new ApiError('Нет ответа', true, true)),
    );
    fireEvent.change(input, { target: { value: 'Проверка' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
    await waitFor(() =>
      expect(conversationStore.getState().chats['123'].messages[0]?.status).toBe('uncertain'),
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(conversationStore.getState().chats['123'].messages[0]?.text).toBe('Проверка');
  });
});
