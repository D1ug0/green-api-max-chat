import './chat-sidebar.css';
import { useState } from 'react';
import { Search, Plus, MessageCircle, PencilLine, X } from 'lucide-react';
import { useConversations } from '@/entities/conversation';
import { Avatar } from '@/shared/ui';
import { formatTime } from '@/shared/lib';

export function ChatSidebar({ onNewChat }: { onNewChat: () => void }) {
  const chats = useConversations((state) => state.chats);
  const drafts = useConversations((state) => state.drafts);
  const activeId = useConversations((state) => state.activeId);
  const activate = useConversations((state) => state.activate);
  const [query, setQuery] = useState('');
  const list = Object.values(chats)
    .filter((chat) =>
      `${chat.title} ${chat.phone ?? ''}`
        .toLocaleLowerCase('ru')
        .includes(query.toLocaleLowerCase('ru').trim()),
    )
    .sort((a, b) => (b.messages.at(-1)?.timestamp ?? 0) - (a.messages.at(-1)?.timestamp ?? 0));
  return (
    <aside className="chat-sidebar" aria-label="Список чатов">
      <div className="sidebar-heading">
        <h1>Сообщения</h1>
        <button
          className="icon-button new-chat-button"
          onClick={onNewChat}
          aria-label="Новый чат"
          title="Новый чат"
        >
          <Plus size={22} />
        </button>
      </div>
      <div className="search-field">
        <Search size={17} />
        <input
          aria-label="Поиск чата"
          placeholder="Поиск"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button className="icon-button" aria-label="Очистить поиск" onClick={() => setQuery('')}>
            <X size={15} />
          </button>
        )}
      </div>
      <div className="sidebar-list-label">
        ЛИЧНЫЕ ЧАТЫ <span>{Object.keys(chats).length}</span>
      </div>
      <div className="chat-list">
        {list.map((chat) => {
          const last = chat.messages.at(-1);
          const draft = drafts[chat.id]?.trim();
          return (
            <button
              className={`chat-row ${activeId === chat.id ? 'chat-row--active' : ''}`}
              key={chat.id}
              onClick={() => activate(chat.id)}
              aria-current={activeId === chat.id ? 'true' : undefined}
            >
              <Avatar name={chat.title} id={chat.id} />
              <span className="chat-row-content">
                <span className="chat-row-top">
                  <strong>{chat.title}</strong>
                  {last && <time>{formatTime(last.timestamp)}</time>}
                </span>
                <span className="chat-row-bottom">
                  <span className={`chat-row-preview ${draft ? 'chat-row-preview--draft' : ''}`}>
                    {draft && (
                      <>
                        <PencilLine size={12} aria-hidden="true" />
                        <strong>Черновик:</strong>
                      </>
                    )}
                    <span className="chat-row-preview-text">
                      {draft ||
                        (last
                          ? `${last.direction === 'outgoing' ? 'Вы: ' : ''}${last.text}`
                          : chat.history === 'loaded'
                            ? 'Начните разговор'
                            : 'Открыть переписку')}
                    </span>
                  </span>
                  {chat.unread > 0 && (
                    <b className="unread-count">{chat.unread > 99 ? '99+' : chat.unread}</b>
                  )}
                </span>
              </span>
            </button>
          );
        })}
        {!list.length && (
          <div className="sidebar-empty">
            <MessageCircle size={30} />
            <strong>{query ? 'Чат не найден' : 'Пока нет диалогов'}</strong>
            <p>
              {query
                ? 'Попробуйте другое имя или номер'
                : 'Начните разговор с человеком, который вам важен'}
            </p>
            {!query && (
              <button className="text-button" onClick={onNewChat}>
                Создать первый чат
              </button>
            )}
          </div>
        )}
      </div>
      <div className="sidebar-footer">
        <span className="tiny-chat-icon">
          <MessageCircle size={14} />
        </span>
        <span>
          Меньше лишнего.
          <br />
          <strong>Больше общения.</strong>
        </span>
      </div>
    </aside>
  );
}
