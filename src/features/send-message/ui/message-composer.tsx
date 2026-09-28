import './message-composer.css';
import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, LoaderCircle } from 'lucide-react';
import { conversationStore, useConversations } from '@/entities/conversation';
import type { ChatInfo } from '@/entities/conversation';
import type { Session } from '@/entities/session';
import { ApiError, getErrorMessage } from '@/shared/api';

export function MessageComposer({
  chat,
  session,
  disabled,
}: {
  chat: ChatInfo;
  session: Session;
  disabled: boolean;
}) {
  const draft = useConversations((state) => state.drafts[chat.id] ?? '');
  const setDraft = useConversations((state) => state.setDraft);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = 'auto';
      textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 160)}px`;
    }
  }, [draft]);
  async function send() {
    const text = draft.trim();
    if (!text || text.length > 4000 || busyRef.current || disabled) return;
    busyRef.current = true;
    setBusy(true);
    const store = conversationStore.getState();
    const localId = `local-${crypto.randomUUID()}`;
    store.addMessage(chat, {
      id: localId,
      text,
      direction: 'outgoing',
      timestamp: Date.now(),
      status: 'sending',
    });
    setDraft(chat.id, '');
    textarea.current?.focus();
    try {
      const serverId = await session.api.sendMessage(chat.id, text, session.controller.signal);
      if (!session.controller.signal.aborted) store.settleMessage(chat.id, localId, serverId);
    } catch (error) {
      if (!session.controller.signal.aborted)
        store.failMessage(
          chat.id,
          localId,
          error instanceof ApiError && error.uncertain ? 'uncertain' : 'failed',
          getErrorMessage(error),
        );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="composer-wrap">
      <form
        className={`composer ${disabled ? 'composer--disabled' : ''}`}
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <textarea
          ref={textarea}
          aria-label="Сообщение"
          placeholder={
            disabled ? 'Восстановите подключение, чтобы написать' : 'Напишите сообщение…'
          }
          value={draft}
          onChange={(event) => setDraft(chat.id, event.target.value)}
          rows={1}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void send();
            }
          }}
        />
        <button
          className="send-button"
          aria-label="Отправить сообщение"
          disabled={disabled || busy || !draft.trim() || draft.trim().length > 4000}
        >
          {busy ? <LoaderCircle size={22} className="spin" /> : <ArrowUp size={24} />}
        </button>
      </form>
      <div className="composer-hint">
        <span>
          Enter — отправить <span className="hint-dot">·</span> Shift + Enter — новая строка
        </span>
        {draft.length > 3500 && (
          <span className={draft.trim().length > 4000 ? 'text-danger' : ''} role="status">
            {draft.trim().length} / 4000
          </span>
        )}
      </div>
    </div>
  );
}
