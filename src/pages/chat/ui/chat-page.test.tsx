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
  it('returns to the chat list with the back button or Esc without removing the chat', () => {
    const session: Session = {
      id: 'demo-session',
      instanceId: 'demo',
      mode: 'demo',
      tracksStatus: true,
      controller: new AbortController(),
      api: createDemoApi(),
    };
    conversationStore.getState().addChats([{ id: 'chat-1', title: 'Александр' }]);
    conversationStore.getState().activate('chat-1');
    conversationStore.getState().setDraft('chat-1', 'Продолжим позже');
    render(<ChatPage session={session} />);

    fireEvent.click(screen.getByRole('button', { name: 'Назад к чатам' }));
    expect(conversationStore.getState().activeId).toBeNull();
    expect(screen.getByText('Ваш следующий разговор — здесь')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Александр/ }));
    expect(screen.getByRole('textbox', { name: 'Сообщение' })).toHaveValue('Продолжим позже');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(conversationStore.getState().activeId).toBeNull();
    expect(conversationStore.getState().chats['chat-1']).toBeDefined();
  });

  it('keeps the active chat open when Esc is used inside a dialog', () => {
    const session: Session = {
      id: 'demo-session',
      instanceId: 'demo',
      mode: 'demo',
      tracksStatus: true,
      controller: new AbortController(),
      api: createDemoApi(),
    };
    conversationStore.getState().addChats([{ id: 'chat-1', title: 'Александр' }]);
    conversationStore.getState().activate('chat-1');
    render(<ChatPage session={session} />);

    fireEvent.click(screen.getByRole('button', { name: 'Новый чат' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(conversationStore.getState().activeId).toBe('chat-1');
  });

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
