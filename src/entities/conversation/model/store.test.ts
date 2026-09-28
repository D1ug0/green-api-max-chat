import { describe, expect, it } from 'vitest';
import { createConversationStore, mergeMessages } from './store';
import { parseHistory, parseIncoming } from './parse';
import type { Message } from './types';

const chat = { id: '123', title: 'Тестовый контакт' };
const message: Message = { id: 'server-1', text: 'Привет', direction: 'incoming', timestamp: 1000 };
describe('conversation updates', () => {
  it('adds a repeated notification once, including its unread count', () => {
    const store = createConversationStore();
    store.getState().addMessage(chat, message);
    store.getState().addMessage(chat, message);
    expect(store.getState().chats['123'].messages).toHaveLength(1);
    expect(store.getState().chats['123'].unread).toBe(1);
    store.getState().activate('123');
    expect(store.getState().chats['123'].unread).toBe(0);
  });
  it('merges a server echo arriving before the send response', () => {
    const store = createConversationStore();
    store
      .getState()
      .addMessage(chat, { ...message, id: 'local-1', direction: 'outgoing', status: 'sending' });
    store.getState().addMessage(chat, { ...message, direction: 'outgoing', status: 'read' });
    store.getState().settleMessage('123', 'local-1', 'server-1');
    expect(store.getState().chats['123'].messages).toHaveLength(1);
    expect(store.getState().chats['123'].messages[0]).toMatchObject({
      id: 'server-1',
      clientId: 'local-1',
      status: 'read',
    });
  });
  it('retains a status arriving before a message', () => {
    const store = createConversationStore();
    store.getState().updateStatus('123', 'server-1', 'read');
    store
      .getState()
      .addMessage(chat, { ...message, id: 'local-1', direction: 'outgoing', status: 'sending' });
    store.getState().settleMessage('123', 'local-1', 'server-1');
    expect(store.getState().chats['123'].messages[0].status).toBe('read');
  });
  it('merges history without dropping live messages or regressing statuses', () => {
    const merged = mergeMessages(
      [
        { ...message, direction: 'outgoing', status: 'read' },
        { ...message, id: 'new', timestamp: 2000 },
      ],
      [{ ...message, direction: 'outgoing', status: 'sent' }],
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].status).toBe('read');
  });
  it('does not repopulate a disconnected store from an old send response', () => {
    const store = createConversationStore();
    store.getState().addMessage(chat, { ...message, id: 'local-1' });
    store.getState().reset();
    store.getState().settleMessage('123', 'local-1', 'server-1');
    expect(store.getState().chats).toEqual({});
  });
});
describe('notification parsing', () => {
  const incoming = {
    typeWebhook: 'incomingMessageReceived',
    idMessage: '1',
    timestamp: 10,
    senderData: { chatId: '123', chatType: 'user', chatName: 'Контакт' },
    messageData: {
      typeMessage: 'extendedTextMessage',
      extendedTextMessageData: { text: 'https://example.com' },
    },
  };
  it('supports text containing a URL and converts seconds to milliseconds', () => {
    expect(parseIncoming(incoming)?.message).toMatchObject({
      text: 'https://example.com',
      timestamp: 10000,
    });
  });
  it('skips unsupported media and groups', () => {
    expect(parseIncoming({ ...incoming, messageData: { typeMessage: 'imageMessage' } })).toBeNull();
    expect(
      parseIncoming({ ...incoming, senderData: { chatId: '-123', chatType: 'group' } }),
    ).toBeNull();
  });
  it('skips malformed history entries', () => {
    expect(parseHistory(null)).toBeNull();
    expect(parseHistory({ idMessage: '1', timestamp: NaN })).toBeNull();
  });
  it('reads incoming text from the MAX chat history response', () => {
    expect(
      parseHistory({
        idMessage: '2',
        timestamp: 10,
        type: 'incoming',
        typeMessage: 'textMessage',
        textMessage: 'Ответ из MAX',
      }),
    ).toMatchObject({
      id: '2',
      text: 'Ответ из MAX',
      direction: 'incoming',
      timestamp: 10000,
    });
  });
});
