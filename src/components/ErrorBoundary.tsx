import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}