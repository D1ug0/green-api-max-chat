import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { ChatInfo, Conversation, Message, MessageStatus } from './types';

const rank: Record<MessageStatus, number> = {
  sending: 0,
  uncertain: 1,
  failed: 1,
  queued: 2,
  sent: 3,
  delivered: 4,
  read: 5,
};
export function advanceStatus(
  previous?: MessageStatus,
  next?: MessageStatus,
): MessageStatus | undefined {
  if (!previous) return next;
  if (!next) return previous;
  if (next === 'failed' && !['delivered', 'read'].includes(previous)) return next;
  return rank[next] >= rank[previous] ? next : previous;
}
export function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const messages = new Map(existing.map((message) => [message.id, message]));
  for (const next of incoming) {
    const previous = messages.get(next.id);
    messages.set(
      next.id,
      previous
        ? {
            ...previous,
            ...next,
            clientId: previous.clientId ?? next.clientId,
            status: advanceStatus(previous.status, next.status),
          }
        : next,
    );
  }
  return [...messages.values()].sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id),
  );
}
const createChat = (chat: ChatInfo): Conversation => ({
  ...chat,
  messages: [],
  unread: 0,
  history: 'idle',
});

interface ConversationState {
  chats: Record<string, Conversation>;
  activeId: string | null;
  drafts: Record<string, string>;
  pendingStatuses: Record<string, MessageStatus>;
  addChats: (chats: ChatInfo[]) => void;
  activate: (id: string | null) => void;
  setDraft: (id: string, text: string) => void;
  addMessage: (chat: ChatInfo, message: Message) => void;
  settleMessage: (chatId: string, localId: string, serverId: string) => void;
  failMessage: (chatId: string, id: string, status: 'failed' | 'uncertain', error: string) => void;
  updateStatus: (chatId: string, id: string, status: MessageStatus) => void;
  setHistory: (id: string, state: Conversation['history'], error?: string) => void;
  mergeHistory: (id: string, messages: Message[]) => void;
  reset: () => void;
}
const empty = () => ({ chats: {}, activeId: null, drafts: {}, pendingStatuses: {} });
export function createConversationStore() {
  return createStore<ConversationState>()((set) => ({
    ...empty(),
    addChats: (chats) =>
      set((state) => {
        const next = { ...state.chats };
        for (const chat of chats)
          next[chat.id] = next[chat.id]
            ? { ...next[chat.id], ...chat, phone: chat.phone ?? next[chat.id].phone }
            : createChat(chat);
        return { chats: next };
      }),
    activate: (id) =>
      set((state) => ({
        activeId: id,
        chats:
          id && state.chats[id]
            ? { ...state.chats, [id]: { ...state.chats[id], unread: 0 } }
            : state.chats,
      })),
    setDraft: (id, text) => set((state) => ({ drafts: { ...state.drafts, [id]: text } })),
    addMessage: (info, message) =>
      set((state) => {
        const chat = state.chats[info.id] ?? createChat(info);
        const duplicate = chat.messages.some((existing) => existing.id === message.id);
        const status = state.pendingStatuses[`${info.id}:${message.id}`];
        return {
          chats: {
            ...state.chats,
            [info.id]: {
              ...chat,
              messages: mergeMessages(chat.messages, [
                { ...message, status: advanceStatus(message.status, status) },
              ]),
              unread:
                chat.unread +
                (!duplicate && message.direction === 'incoming' && state.activeId !== info.id
                  ? 1
                  : 0),
            },
          },
        };
      }),
    settleMessage: (chatId, localId, serverId) =>
      set((state) => {
        const chat = state.chats[chatId];
        const local = chat?.messages.find((message) => message.id === localId);
        if (!chat || !local) return state;
        const remaining = chat.messages.filter((message) => message.id !== localId);
        return {
          chats: {
            ...state.chats,
            [chatId]: {
              ...chat,
              messages: mergeMessages(remaining, [
                {
                  ...local,
                  id: serverId,
                  clientId: localId,
                  status: state.pendingStatuses[`${chatId}:${serverId}`] ?? 'queued',
                },
              ]),
            },
          },
        };
      }),
    failMessage: (chatId, id, status, error) =>
      set((state) => {
        const chat = state.chats[chatId];
        if (!chat) return state;
        return {
          chats: {
            ...state.chats,
            [chatId]: {
              ...chat,
              messages: chat.messages.map((message) =>
                message.id === id ? { ...message, status, error } : message,
              ),
            },
          },
        };
      }),
    updateStatus: (chatId, id, status) =>
      set((state) => {
        const key = `${chatId}:${id}`;
        const pendingStatuses = {
          ...state.pendingStatuses,
          [key]: advanceStatus(state.pendingStatuses[key], status)!,
        };
        const chat = state.chats[chatId];
        if (!chat) return { pendingStatuses };
        return {
          pendingStatuses,
          chats: {
            ...state.chats,
            [chatId]: {
              ...chat,
              messages: chat.messages.map((message) =>
                message.id === id
                  ? { ...message, status: advanceStatus(message.status, status) }
                  : message,
              ),
            },
          },
        };
      }),
    setHistory: (id, history, historyError) =>
      set((state) => {
        const chat = state.chats[id];
        return chat
          ? { chats: { ...state.chats, [id]: { ...chat, history, historyError } } }
          : state;
      }),
    mergeHistory: (id, messages) =>
      set((state) => {
        const chat = state.chats[id];
        if (!chat) return state;
        const updated = messages.map((message) => ({
          ...message,
          status: advanceStatus(message.status, state.pendingStatuses[`${id}:${message.id}`]),
        }));
        return {
          chats: {
            ...state.chats,
            [id]: {
              ...chat,
              messages: mergeMessages(chat.messages, updated),
              history: 'loaded',
              historyError: undefined,
            },
          },
        };
      }),
    reset: () => set(empty()),
  }));
}
export const conversationStore = createConversationStore();
export const useConversations = <T>(selector: (state: ConversationState) => T) =>
  useStore(conversationStore, selector);
