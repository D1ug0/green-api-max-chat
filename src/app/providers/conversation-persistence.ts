import { conversationStore } from '@/entities/conversation';
import type { ChatInfo } from '@/entities/conversation';
import { useSession } from '@/entities/session';
import type { Session } from '@/entities/session';

const STORAGE_KEY = 'green-api-max-chat:conversations:v1';

interface SavedConversations {
  instanceId: string;
  chats: ChatInfo[];
  drafts: Record<string, string>;
  activeId: string | null;
}

function readSaved(instanceId: string): SavedConversations | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const saved = data as Record<string, unknown>;
    if (saved.instanceId !== instanceId || !Array.isArray(saved.chats)) return null;
    const chats: ChatInfo[] = saved.chats
      .filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === 'object' && !Array.isArray(item),
      )
      .filter(
        (item) =>
          typeof item.id === 'string' &&
          !!item.id &&
          !['__proto__', 'constructor', 'prototype'].includes(item.id) &&
          typeof item.title === 'string' &&
          (item.phone === undefined || typeof item.phone === 'string'),
      )
      .slice(0, 500)
      .map((item) => ({
        id: item.id as string,
        title: item.title as string,
        phone: item.phone as string | undefined,
      }));
    const ids = new Set(chats.map((chat) => chat.id));
    const drafts =
      saved.drafts && typeof saved.drafts === 'object' && !Array.isArray(saved.drafts)
        ? Object.fromEntries(
            Object.entries(saved.drafts).filter(
              ([id, text]) => ids.has(id) && typeof text === 'string',
            ),
          )
        : {};
    return {
      instanceId,
      chats,
      drafts,
      activeId:
        typeof saved.activeId === 'string' && ids.has(saved.activeId) ? saved.activeId : null,
    };
  } catch {
    return null;
  }
}

function snapshot(instanceId: string): SavedConversations {
  const { chats, drafts, activeId } = conversationStore.getState();
  return {
    instanceId,
    chats: Object.values(chats).map(({ id, title, phone }) => ({ id, title, phone })),
    drafts: Object.fromEntries(
      Object.entries(drafts).filter(([id, text]) => !!chats[id] && !!text),
    ),
    activeId: activeId && chats[activeId] ? activeId : null,
  };
}

function start(instanceId: string) {
  const saved = readSaved(instanceId);
  const store = conversationStore.getState();
  store.reset();
  if (saved) {
    store.addChats(saved.chats);
    for (const [id, text] of Object.entries(saved.drafts)) store.setDraft(id, text);
    store.activate(saved.activeId);
  }
  let lastWritten = '';
  const save = () => {
    const value = JSON.stringify(snapshot(instanceId));
    if (value === lastWritten) return;
    try {
      localStorage.setItem(STORAGE_KEY, value);
      lastWritten = value;
    } catch {
      // The active chat still works if browser storage is unavailable.
    }
  };
  save();
  return conversationStore.subscribe(save);
}

export function setupConversationPersistence() {
  let previous: Session | null = useSession.getState().session;
  let stop = previous?.mode === 'live' ? start(previous.instanceId) : undefined;
  const unsubscribeSession = useSession.subscribe((state) => {
    const next = state.session;
    if (next === previous) return;
    stop?.();
    if (previous?.mode === 'live' && (!next || next.instanceId !== previous.instanceId)) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Browser storage may be unavailable.
      }
    }
    stop = next?.mode === 'live' ? start(next.instanceId) : undefined;
    if (!next) conversationStore.getState().reset();
    previous = next;
  });
  return () => {
    unsubscribeSession();
    stop?.();
  };
}
