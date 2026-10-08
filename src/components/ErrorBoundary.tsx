import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  declare state: State;
  declare props: Props;
  declare setState: (updater: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NoteSphere ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px] text-center">
          <div className="relative p-6 max-w-lg w-full bg-slate-900/90 border border-red-500/30 rounded-2xl shadow-2xl backdrop-blur-xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              {this.props.fallbackTitle || 'Произошла ошибка при отрисовке'}
            </h3>

            <p className="text-xs text-slate-400 mb-4 break-words font-mono bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
              {this.state.error?.message || 'Неизвестная ошибка'}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Повторить
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 transition active:scale-95"
              >
                Перезагрузить приложение
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
