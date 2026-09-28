import { useEffect, useRef, useState } from 'react';
import { ArrowRight, LoaderCircle, MessageSquarePlus } from 'lucide-react';
import { conversationStore } from '@/entities/conversation';
import type { Session } from '@/entities/session';
import { getErrorMessage } from '@/shared/api';
import { formatPhone, normalizePhone } from '@/shared/lib';
import { Dialog } from '@/shared/ui';

export function NewChatDialog({ session, onClose }: { session: Session; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    const signal = AbortSignal.any([request.signal, session.controller.signal]);
    setError('');
    setBusy(true);
    try {
      const normalized = normalizePhone(phone);
      const store = conversationStore.getState();
      const existing = Object.values(store.chats).find((chat) => chat.phone === normalized);
      const id = existing?.id ?? (await session.api.checkAccount(normalized, signal));
      signal.throwIfAborted();
      if (!conversationStore.getState().chats[id])
        store.addChats([{ id, title: formatPhone(normalized), phone: normalized }]);
      store.activate(id);
      onClose();
    } catch (cause) {
      if (!signal.aborted) setError(getErrorMessage(cause));
    } finally {
      if (!signal.aborted) {
        setBusy(false);
        controller.current = null;
      }
    }
  }
  return (
    <Dialog title="Новый чат" onClose={onClose}>
      <div className="dialog-illustration">
        <MessageSquarePlus size={28} />
      </div>
      <p className="dialog-description">
        Введите номер телефона человека, которому хотите написать в MAX.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="recipient-phone">Номер телефона</label>
          <input
            id="recipient-phone"
            type="tel"
            autoComplete="tel"
            autoFocus
            placeholder="+7 999 123 45 67"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={busy}
            required
            maxLength={30}
            aria-describedby="phone-help"
          />
          <small id="phone-help">Поддерживаются номера России и Беларуси</small>
        </div>
        {session.mode === 'demo' && <p className="hint">Деморежим: номер не отправляется в MAX.</p>}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="button button--primary button--full" disabled={busy || !phone.trim()}>
          {busy ? (
            <>
              <LoaderCircle size={18} className="spin" />
              Ищем получателя…
            </>
          ) : (
            <>
              Начать переписку
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </Dialog>
  );
}
