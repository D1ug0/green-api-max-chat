import './conversation-panel.css';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  CircleAlert,
  MessageCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useConversations } from '@/entities/conversation';
import type { Message, MessageStatus } from '@/entities/conversation';
import type { Session } from '@/entities/session';
import { MessageComposer } from '@/features/send-message';
import { useHistory } from '@/features/load-history';
import { Avatar } from '@/shared/ui';
import { dayKey, formatDay, formatPhone, formatTime } from '@/shared/lib';

const statusLabels: Record<MessageStatus, string> = {
  sending: 'Отправляем…',
  queued: 'Принято GREEN-API',
  sent: 'Отправлено в MAX',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
  uncertain: 'Нет подтверждения',
};
function DeliveryStatus({ status = 'queued' }: { status?: MessageStatus }) {
  const Icon =
    status === 'read' || status === 'delivered'
      ? CheckCheck
      : status === 'sent'
        ? Check
        : status === 'failed' || status === 'uncertain'
          ? CircleAlert
          : Clock3;
  return (
    <span
      className={`delivery-status delivery-status--${status}`}
      title={statusLabels[status]}
      aria-label={statusLabels[status]}
    >
      <Icon size={14} />
      <span>{statusLabels[status]}</span>
    </span>
  );
}
function Bubble({ message, onRestore }: { message: Message; onRestore: () => void }) {
  const failed = message.status === 'failed' || message.status === 'uncertain';
  return (
    <div className={`message-row message-row--${message.direction}`}>
      <div className={`message-bubble ${failed ? 'message-bubble--error' : ''}`}>
        <p>{message.text}</p>
        <div className="message-meta">
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {message.direction === 'outgoing' && <DeliveryStatus status={message.status} />}
        </div>
        {failed && (
          <div className="message-error">
            <span>{message.error ?? 'Не удалось отправить сообщение.'}</span>
            {message.status === 'uncertain' && (
              <span>Проверьте историю перед повторной отправкой: сообщение могло дойти.</span>
            )}
            <button onClick={onRestore}>Вернуть текст в поле ввода</button>
          </div>
        )}
      </div>
    </div>
  );
}
export function ConversationPanel({
  session,
  disabled,
  onNewChat,
}: {
  session: Session;
  disabled: boolean;
  onNewChat: () => void;
}) {
  const activeId = useConversations((state) => state.activeId);
  const chat = useConversations((state) =>
    state.activeId ? state.chats[state.activeId] : undefined,
  );
  const activate = useConversations((state) => state.activate);
  const setDraft = useConversations((state) => state.setDraft);
  const reload = useHistory(session, activeId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previousChat = useRef(activeId);
  const [newMessages, setNewMessages] = useState(false);
  const lastId = chat?.messages.at(-1)?.id;
  const count = chat?.messages.length ?? 0;
  const lastDirection = chat?.messages.at(-1)?.direction;
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (previousChat.current !== activeId || nearBottom.current || lastDirection === 'outgoing') {
      element.scrollTop = element.scrollHeight;
      nearBottom.current = true;
      setNewMessages(false);
    } else {
      setNewMessages(true);
    }
    previousChat.current = activeId;
  }, [activeId, lastId, count, lastDirection]);
  function scrollDown() {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    setNewMessages(false);
    nearBottom.current = true;
  }
  if (!chat)
    return (
      <section className="conversation-empty">
        <div className="empty-art" aria-hidden="true">
          <div className="empty-art-back" />
          <MessageCircle size={68} strokeWidth={1.35} />
          <span>+ hello</span>
        </div>
        <div className="eyebrow">ПРОСТО БУДЬТЕ НА СВЯЗИ</div>
        <h2>Ваш следующий разговор — здесь</h2>
        <p>
          Выберите диалог слева или создайте новый,
          <br />
          чтобы написать человеку в MAX.
        </p>
        <button className="button button--primary" onClick={onNewChat}>
          <Plus size={19} />
          Новый чат
        </button>
        <div className="empty-caption">Текстовые сообщения через GREEN-API</div>
      </section>
    );
  return (
    <section className="conversation-panel" aria-label={`Переписка: ${chat.title}`}>
      <header className="conversation-heading">
        <button
          className="icon-button conversation-back"
          aria-label="Назад к чатам"
          title="Назад к чатам (Esc)"
          onClick={() => activate(null)}
        >
          <ArrowLeft size={21} />
        </button>
        <Avatar name={chat.title} id={chat.id} />
        <div className="conversation-person">
          <h2>{chat.title}</h2>
          <p>
            {session.mode === 'demo'
              ? 'Демонстрационный диалог'
              : formatPhone(chat.phone) || 'Личный чат в MAX'}
          </p>
        </div>
        <button
          className={`icon-button ${chat.history === 'loading' ? 'spin-icon' : ''}`}
          aria-label="Обновить историю"
          title="Обновить историю"
          onClick={reload}
          disabled={chat.history === 'loading'}
        >
          <RefreshCw size={19} />
        </button>
      </header>
      {chat.history === 'error' && (
        <div className="history-error" role="alert">
          {chat.historyError}
          <button className="text-button" onClick={reload}>
            Повторить
          </button>
        </div>
      )}
      {session.mode === 'live' &&
        chat.history === 'loaded' &&
        count > 0 &&
        !chat.messages.some((message) => message.direction === 'incoming') && (
          <div className="history-note" role="status">
            В загруженной истории нет входящих текстовых сообщений. Попросите собеседника ответить в
            MAX; новые ответы появятся здесь автоматически.
          </div>
        )}
      <div
        className="message-area"
        ref={scrollRef}
        onScroll={() => {
          const element = scrollRef.current;
          if (element) {
            nearBottom.current =
              element.scrollHeight - element.scrollTop - element.clientHeight < 100;
            if (nearBottom.current) setNewMessages(false);
          }
        }}
      >
        <div
          className="messages"
          role="log"
          aria-label="Сообщения в чате"
          aria-relevant="additions"
          aria-live="polite"
        >
          {chat.history === 'loading' && !count && (
            <div className="history-loading" role="status">
              <RefreshCw size={16} className="spin" />
              Загружаем сообщения…
            </div>
          )}
          {!count && chat.history !== 'loading' && (
            <div className="first-message">
              <span>👋</span>
              <strong>Начните с «Привет!»</strong>
              <p>Первое сообщение — начало хорошего разговора.</p>
            </div>
          )}
          {chat.messages.map((message, index) => (
            <Fragment key={message.clientId ?? message.id}>
              {(!index ||
                dayKey(message.timestamp) !== dayKey(chat.messages[index - 1].timestamp)) && (
                <div className="day-separator">
                  <span>{formatDay(message.timestamp)}</span>
                </div>
              )}
              <Bubble message={message} onRestore={() => setDraft(chat.id, message.text)} />
            </Fragment>
          ))}
        </div>
      </div>
      {newMessages && (
        <button className="new-messages-button" onClick={scrollDown}>
          Новые сообщения
          <ArrowDown size={16} />
        </button>
      )}
      <MessageComposer key={chat.id} chat={chat} session={session} disabled={disabled} />
    </section>
  );
}
