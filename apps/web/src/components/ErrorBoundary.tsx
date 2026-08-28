'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="card p-6">
          <h2 className="text-lg font-medium">Algo deu errado</h2>
          <p className="mt-2 text-sm text-muted">Esta área falhou ao renderizar. O menu e o restante do app continuam disponíveis.</p>
          <button type="button" className="mt-4 rounded-xl bg-violet-500 px-4 py-2 text-sm" onClick={() => this.setState({ error: null })}>
            Tentar de novo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
