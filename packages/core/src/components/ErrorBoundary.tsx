import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[hsl(var(--danger))]/30 bg-surface-secondary p-8 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-[hsl(var(--danger))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {this.state.error?.message ?? 'Something went wrong'}
            </p>
            <button
              type="button"
              aria-label="Retry error boundary"
              className="rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
              onClick={this.resetErrorBoundary}
            >
              ↻
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
