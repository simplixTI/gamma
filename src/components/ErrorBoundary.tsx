import * as Sentry from '@sentry/react';
import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
    try {
      Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    } catch { /* Sentry must never cause a secondary failure */ }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <svg className="w-12 h-12 text-muted-foreground mb-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          <h2 className="text-xl font-bold text-foreground mb-2">Algo deu errado</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Ocorreu um erro inesperado. Por favor, tente novamente.
          </p>
          <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}>
            Voltar ao início
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
