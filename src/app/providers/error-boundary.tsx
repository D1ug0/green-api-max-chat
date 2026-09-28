import { Component } from 'react';
import type { ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error">
          <h1>Не удалось открыть чат</h1>
          <p>Обновите страницу и подключитесь ещё раз.</p>
          <button className="button button--primary" onClick={() => location.reload()}>
            Обновить страницу
          </button>
        </main>
      );
    return this.props.children;
  }
}
