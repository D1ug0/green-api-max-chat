import './connect-form.css';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  ChevronDown,
  LoaderCircle,
  Play,
  LockKeyhole,
} from 'lucide-react';
import { useSession } from '@/entities/session';
import { conversationStore } from '@/entities/conversation';
import { createGreenApi, createDemoApi, DEFAULT_API_URL, getErrorMessage } from '@/shared/api';

export function ConnectForm() {
  const [id, setId] = useState('');
  const [token, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const connect = useSession((state) => state.connect);
  useEffect(() => () => request.current?.abort(), []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const credentials = { idInstance: id.trim(), apiTokenInstance: token.trim(), apiUrl };
      const api = createGreenApi(credentials);
      const state = await api.getState(controller.signal);
      if (state !== 'authorized') {
        const reason: Record<string, string> = {
          notAuthorized: 'Авторизуйте инстанс MAX в личном кабинете GREEN-API.',
          starting: 'Инстанс запускается. Подождите несколько минут.',
          blocked: 'Аккаунт MAX заблокирован.',
          suspended: 'На аккаунте MAX действуют временные ограничения.',
        };
        throw new Error(
          reason[state] ?? 'Инстанс не готов к работе. Проверьте его состояние в личном кабинете.',
        );
      }
      const settings = await api.getSettings(controller.signal);
      if (settings.typeInstance !== 'v3')
        throw new Error('Используйте данные инстанса MAX. Этот чат работает с MAX API v3.');
      if (settings.webhookUrl || settings.incomingWebhook !== 'yes')
        throw new Error(
          'В настройках инстанса очистите webhookUrl и включите получение входящих сообщений. Затем повторите подключение.',
        );
      controller.signal.throwIfAborted();
      conversationStore.getState().reset();
      connect({
        id: crypto.randomUUID(),
        instanceId: id.trim(),
        mode: 'live',
        api,
        controller: new AbortController(),
        tracksStatus:
          settings.outgoingWebhook === 'yes' &&
          settings.outgoingAPIMessageWebhook === 'yes' &&
          settings.outgoingMessageWebhook === 'yes',
        credentials,
      });
    } catch (cause) {
      if (!controller.signal.aborted) setError(getErrorMessage(cause));
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        request.current = null;
      }
    }
  }
  function demo() {
    conversationStore.getState().reset();
    connect({
      id: crypto.randomUUID(),
      instanceId: 'demo',
      mode: 'demo',
      api: createDemoApi(),
      controller: new AbortController(),
      tracksStatus: true,
    });
  }
  return (
    <form className="connect-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="instance-id">idInstance</label>
        <input
          id="instance-id"
          name="instanceId"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Например, 3100••••••"
          value={id}
          onChange={(event) => setId(event.target.value)}
          required
          maxLength={20}
          disabled={busy}
        />
      </div>
      <div className="field">
        <label htmlFor="instance-token">apiTokenInstance</label>
        <div className="password-field">
          <input
            id="instance-token"
            name="apiToken"
            type={visible ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            placeholder="Ваш ключ доступа"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            maxLength={256}
            disabled={busy}
          />
          <button
            className="icon-button"
            type="button"
            aria-label={visible ? 'Скрыть токен' : 'Показать токен'}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <details className="api-settings">
        <summary>
          Сервер API <ChevronDown size={15} />
        </summary>
        <div className="field">
          <label htmlFor="api-url">apiUrl</label>
          <input
            id="api-url"
            type="url"
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            disabled={busy}
            required
            spellCheck={false}
          />
          <small>
            Проверьте адрес сервера в личном кабинете. По умолчанию выбран кластер 3100.
          </small>
        </div>
      </details>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <button
        className="button button--primary button--full"
        disabled={busy || !id.trim() || !token.trim()}
      >
        {busy ? (
          <>
            <LoaderCircle size={19} className="spin" />
            Подключаемся…
          </>
        ) : (
          <>
            Открыть чат <ArrowRight size={19} />
          </>
        )}
      </button>
      <p className="privacy-note">
        <LockKeyhole size={14} />
        Данные доступа, чаты и черновики сохраняются в этом браузере до выхода
      </p>
      <div className="form-divider">
        <span>или познакомьтесь с интерфейсом</span>
      </div>
      <button
        className="button button--secondary button--full"
        type="button"
        onClick={demo}
        disabled={busy}
      >
        <Play size={16} />
        Попробовать демо
      </button>
    </form>
  );
}
