
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center text-slate-200 mb-2">
              System Critical Error
            </h1>
            <p className="text-slate-500 text-center mb-6">
              The Personal AI Operator has encountered an unrecoverable error.
            </p>

            {/* Error Details */}
            <div className="bg-slate-950 rounded-xl p-4 mb-6 border border-slate-800">
              <p className="text-rose-400 font-mono text-sm break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="text-slate-500 text-xs cursor-pointer hover:text-slate-400">
                    View stack trace
                  </summary>
                  <pre className="mt-2 text-xs text-slate-600 overflow-auto max-h-32 font-mono">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Home className="w-4 h-4" />
                Reset & Clear Data
              </button>
            </div>

            {/* Support */}
            <p className="mt-6 text-center text-xs text-slate-600">
              If this error persists, please check the console logs or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
