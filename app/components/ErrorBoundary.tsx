import { LinkButton } from '@revealui/presentation';
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({ error }: { error: Error | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-destructive">Error</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">
        {error?.message ?? 'An unexpected error occurred while rendering this page.'}
      </p>
      <LinkButton href="/" className="mt-6">Return home</LinkButton>
    </div>
  );
}
