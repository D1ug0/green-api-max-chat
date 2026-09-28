import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { conversationStore } from '@/entities/conversation';
import { useSession } from '@/entities/session';
import { createGreenApi } from '@/shared/api';
import { setupConversationPersistence } from './conversation-persistence';

const credentials = {
  idInstance: '3100000000',
  apiTokenInstance: 'test-token',
  apiUrl: 'https://3100.api.green-api.com',
};

function connect() {
  useSession.getState().connect({
    id: crypto.randomUUID(),
    instanceId: credentials.idInstance,
    mode: 'live',
    api: createGreenApi(credentials),
    controller: new AbortController(),
    tracksStatus: true,
    credentials,
  });
}

beforeEach(() => {
  localStorage.clear();
  conversationStore.getState().reset();
  useSession.getState().disconnect();
});
afterEach(() => {
  useSession.getState().disconnect();
  conversationStore.getState().reset();
  localStorage.clear();
});

describe('conversation persistence', () => {
  it('restores manually added chats, the selected chat and drafts after a reload', () => {
    const stop = setupConversationPersistence();
    connect();
    const chat = { id: 'chat-1', title: 'Собеседник', phone: '79991234567' };
    conversationStore.getState().addChats([chat]);
    conversationStore.getState().activate(chat.id);
    conversationStore.getState().setDraft(chat.id, 'Неотправленный текст');
    conversationStore.getState().addMessage(chat, {
      id: 'message-1',
      text: 'Ответ из MAX',
      direction: 'incoming',
      timestamp: 1000,
    });

    stop();
    conversationStore.getState().reset();
    const stopAfterReload = setupConversationPersistence();
    const restored = conversationStore.getState();
    expect(Object.keys(restored.chats)).toEqual([chat.id]);
    expect(restored.chats[chat.id]).toMatchObject(chat);
    expect(restored.chats[chat.id].messages).toEqual([]);
    expect(restored.activeId).toBe(chat.id);
    expect(restored.drafts[chat.id]).toBe('Неотправленный текст');

    stopAfterReload();
  });

  it('removes saved chats and drafts when signing out', () => {
    const stop = setupConversationPersistence();
    connect();
    conversationStore.getState().addChats([{ id: 'chat-1', title: 'Собеседник' }]);
    conversationStore.getState().setDraft('chat-1', 'Черновик');
    useSession.getState().disconnect();

    expect(conversationStore.getState().chats).toEqual({});
    expect(conversationStore.getState().drafts).toEqual({});
    expect(localStorage.getItem('green-api-max-chat:conversations:v1')).toBeNull();
    stop();
  });

  it('does not carry a chat list into a different instance', () => {
    const stop = setupConversationPersistence();
    connect();
    conversationStore.getState().addChats([{ id: 'chat-1', title: 'Первый аккаунт' }]);
    conversationStore.getState().setDraft('chat-1', 'Личный черновик');

    const other = { ...credentials, idInstance: '3100000001' };
    useSession.getState().connect({
      id: crypto.randomUUID(),
      instanceId: other.idInstance,
      mode: 'live',
      api: createGreenApi(other),
      controller: new AbortController(),
      tracksStatus: true,
      credentials: other,
    });

    expect(conversationStore.getState().chats).toEqual({});
    expect(conversationStore.getState().drafts).toEqual({});
    stop();
  });
});
