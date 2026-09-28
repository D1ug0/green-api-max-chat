import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { conversationStore } from '@/entities/conversation';
import type { Session } from '@/entities/session';
import { createDemoApi } from '@/shared/api';
import { ChatPage } from './chat-page';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
beforeEach(() => conversationStore.getState().reset());
afterEach(() => {
  cleanup();
  conversationStore.getState().reset();
});

describe('manual chat flow', () => {
  it('starts empty and shows only a chat opened by phone before sending and receiving text', async () => {
    const session: Session = {
      id: 'demo-session',
      instanceId: 'demo',
      mode: 'demo',
      tracksStatus: true,
      controller: new AbortController(),
      api: createDemoApi(),
    };
    render(<ChatPage session={session} />);

    expect(screen.getByText('Пока нет диалогов')).toBeInTheDocument();
    expect(conversationStore.getState().chats).toEqual({});

    fireEvent.click(screen.getByRole('button', { name: 'Создать первый чат' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Номер телефона' }), {
      target: { value: '+7 999 123 45 67' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Начать переписку' }));
    await waitFor(() => expect(Object.keys(conversationStore.getState().chats)).toHaveLength(1));

    fireEvent.change(screen.getByRole('textbox', { name: 'Сообщение' }), {
      target: { value: 'Привет' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
    const messages = within(screen.getByRole('log', { name: 'Сообщения в чате' }));
    expect(await messages.findByText('Привет')).toBeInTheDocument();
    expect(
      await messages.findByText(
        /Сообщение получено! Это автоматический ответ деморежима/,
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  }, 10_000);
});
