import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-slate-950 p-4">
          <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-lg max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Что-то пошло не так</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Не удалось загрузить компонент страницы. Это может быть связано с проблемой сети.
            </p>
            <button
              onClick={this.handleRefresh}
              className="bg-accent hover:bg-accent-light text-white font-bold py-2 px-6 rounded-xl transition-colors"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;