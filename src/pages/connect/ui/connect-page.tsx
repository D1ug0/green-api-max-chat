import './connect-page.css';
import { ArrowUpRight, CheckCheck, MessageCircle, Radio } from 'lucide-react';
import { ConnectForm } from '@/features/connect-instance';
import { Brand } from '@/shared/ui';

export function ConnectPage() {
  return (
    <div className="connect-page">
      <header className="landing-header">
        <Brand />
        <a
          className="external-link"
          href="https://console.green-api.com/"
          target="_blank"
          rel="noreferrer"
        >
          Личный кабинет GREEN-API
          <ArrowUpRight size={16} />
        </a>
      </header>
      <main className="connect-main">
        <section className="intro">
          <div className="eyebrow">
            <span className="status-dot" />
            НА СВЯЗИ ЧЕРЕЗ GREEN-API
          </div>
          <h1>
            Разговор начинается
            <br />с одного <span>сообщения.</span>
          </h1>
          <p className="intro-description">
            Ваши диалоги в MAX — в простом и удобном
            <br className="desktop-break" /> веб-чате. Подключитесь и начните общаться.
          </p>
          <div className="chat-preview" aria-hidden="true">
            <div className="preview-orbit orbit-one" />
            <div className="preview-orbit orbit-two" />
            <div className="preview-card">
              <div className="preview-header">
                <span className="preview-avatar">А</span>
                <div>
                  <strong>Александра</strong>
                  <span>пример переписки</span>
                </div>
                <MessageCircle size={20} />
              </div>
              <div className="preview-messages">
                <div className="preview-bubble">
                  Привет! Теперь мы на связи 👋<small>12:40</small>
                </div>
                <div className="preview-bubble preview-bubble--out">
                  Привет! Как здорово, что всё так просто.
                  <small>
                    12:41 <CheckCheck size={14} />
                  </small>
                </div>
                <div className="preview-bubble">
                  И ничего лишнего 💜<small>12:41</small>
                </div>
              </div>
              <div className="preview-input">
                Напишите сообщение…<span>↑</span>
              </div>
            </div>
            <div className="preview-label">
              <Radio size={17} />
              <span>Сообщения в реальном времени</span>
            </div>
          </div>
        </section>
        <section className="connect-card" aria-labelledby="connect-title">
          <div className="card-eyebrow">ДОБРО ПОЖАЛОВАТЬ</div>
          <h2 id="connect-title">Подключите свой MAX</h2>
          <p className="card-description">
            Введите данные инстанса из
            <br />
            <a href="https://console.green-api.com/" target="_blank" rel="noreferrer">
              личного кабинета GREEN-API <ArrowUpRight size={13} />
            </a>
          </p>
          <ConnectForm />
          <p className="setup-note">
            Первое подключение?{' '}
            <a href="https://green-api.com/v3/docs/before-start/" target="_blank" rel="noreferrer">
              Как настроить инстанс
            </a>
          </p>
        </section>
      </main>
      <footer className="landing-footer">
        <span>
          MAX чат <span className="footer-cross">×</span>{' '}
          <span className="green-word">GREEN-API</span>
        </span>
        <span>Только текст. Всё для разговора.</span>
      </footer>
    </div>
  );
}
