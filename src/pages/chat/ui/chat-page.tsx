import './chat-page.css';
import { useState } from 'react';
import { ArrowUpRight, CircleAlert, LogOut, MessageCircle, RefreshCw, X } from 'lucide-react';
import { ChatSidebar } from '@/widgets/chat-sidebar';
import { ConversationPanel } from '@/widgets/conversation';
import { NewChatDialog } from '@/features/start-chat';
import { useReceiveMessages } from '@/features/receive-messages';
import { conversationStore, useConversations } from '@/entities/conversation';
import { useSession } from '@/entities/session';
import type { Session } from '@/entities/session';
import { Brand, Dialog } from '@/shared/ui';

export function ChatPage({ session }: { session: Session }) {
  const [newChat, setNewChat] = useState(false);
  const [disconnectDialog, setDisconnectDialog] = useState(false);
  const [statusHintDismissed, setStatusHintDismissed] = useState(false);
  const activeId = useConversations((state) => state.activeId);
  const disconnect = useSession((state) => state.disconnect);
  const { status, retry } = useReceiveMessages(session);
  const disabled = status.state !== 'connected';
  const statusText = {
    connected: 'Подключено',
    connecting: 'Подключение…',
    retrying: 'Восстанавливаем связь',
    error: 'Нет подключения',
    waiting: 'Другая вкладка',
  }[status.state];
  return (
    <div className="chat-page">
      <header className="workspace-header">
        <Brand />
        <span className="workspace-subtitle">ТЕКСТОВЫЙ ЧАТ</span>
        <div className="workspace-connection">
          {session.mode === 'demo' ? (
            <span className="demo-badge">Деморежим</span>
          ) : (
            <span
              className={`connection-label ${status.state !== 'connected' ? 'connection-label--warning' : ''}`}
            >
              <span className="status-dot" />
              {statusText}
            </span>
          )}
          <span className="powered-label">с GREEN-API</span>
        </div>
      </header>
      {session.mode === 'demo' && (
        <div className="demo-banner">
          <span>Вы в деморежиме. Сообщения и ответы создаются в браузере.</span>
          <button
            onClick={() => {
              disconnect();
              conversationStore.getState().reset();
            }}
          >
            Подключить свой MAX
            <ArrowUpRight size={15} />
          </button>
        </div>
      )}
      <main className={`chat-shell ${activeId ? 'chat-shell--selected' : ''}`}>
        <nav className="navigation-rail" aria-label="Навигация">
          <div className="rail-top">
            <Brand compact />
            <button
              className="rail-button rail-button--active"
              title="Сообщения"
              aria-label="Показать список чатов"
              onClick={() => conversationStore.getState().activate(null)}
            >
              <MessageCircle size={23} />
              <span>Чаты</span>
            </button>
          </div>
          <div className="rail-bottom">
            <button
              className="rail-button"
              aria-label="Отключиться"
              title="Отключиться"
              onClick={() => setDisconnectDialog(true)}
            >
              <LogOut size={22} />
              <span>Выйти</span>
            </button>
            <span className="self-avatar">
              {session.mode === 'demo' ? 'Д' : session.instanceId.slice(-2)}
            </span>
          </div>
        </nav>
        <ChatSidebar onNewChat={() => setNewChat(true)} />
        <div className="conversation-container">
          {status.state !== 'connected' && status.state !== 'connecting' && (
            <div className="connection-banner" role="status">
              <CircleAlert size={18} />
              <span>{status.detail ?? statusText}</span>
              {status.state === 'error' && (
                <button onClick={retry} aria-label="Восстановить подключение">
                  <RefreshCw size={17} />
                </button>
              )}
            </div>
          )}
          {!session.tracksStatus && !statusHintDismissed && (
            <div className="connection-banner connection-banner--muted">
              <span>
                Для статусов доставки включите исходящие уведомления в GREEN-API. Подтверждение
                принятия сообщения не означает доставку.
              </span>
              <button aria-label="Скрыть подсказку" onClick={() => setStatusHintDismissed(true)}>
                <X size={16} />
              </button>
            </div>
          )}
          <ConversationPanel
            session={session}
            disabled={disabled}
            onNewChat={() => setNewChat(true)}
          />
        </div>
      </main>
      <footer className="workspace-footer">
        <span>
          MAX чат <span className="footer-cross">×</span>
          <span className="green-word"> GREEN-API</span>
        </span>
        <span>
          {session.mode === 'demo'
            ? 'Попробуйте написать первое сообщение'
            : `Инстанс ${session.instanceId}`}
        </span>
      </footer>
      {newChat && <NewChatDialog session={session} onClose={() => setNewChat(false)} />}
      {disconnectDialog && (
        <Dialog title="Отключиться от чата?" onClose={() => setDisconnectDialog(false)}>
          <p className="dialog-description">
            Данные доступа, список чатов и черновики будут удалены из этого браузера. Для входа
            потребуется снова ввести данные инстанса.
          </p>
          <div className="dialog-actions">
            <button className="button button--secondary" onClick={() => setDisconnectDialog(false)}>
              Остаться
            </button>
            <button
              className="button button--primary"
              onClick={() => {
                disconnect();
                conversationStore.getState().reset();
              }}
            >
              Отключиться
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
