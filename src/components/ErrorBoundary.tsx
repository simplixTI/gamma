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
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-4">⚓</div>
          <h2 className="text-xl font-bold text-foreground mb-2">Algo deu errado</h2>
          <p className="text-sm text-muted mb-6 max-w-xs">
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
