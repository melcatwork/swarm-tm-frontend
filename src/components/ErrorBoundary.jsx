/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree and displays
 * a fallback UI instead of crashing the entire application.
 */

import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <AlertTriangle size={64} className="error-icon" />
            <h1>Something Went Wrong</h1>
            <p className="error-message">
              An unexpected error occurred. Please try reloading the page.
            </p>

            {this.state.error && (
              <div className="error-details">
                <details>
                  <summary>Error Details</summary>
                  <pre className="error-stack">
                    <strong>{this.state.error.toString()}</strong>
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              </div>
            )}

            <div className="error-actions">
              <button className="btn btn-primary" onClick={this.handleReload}>
                Reload Page
              </button>
              <button className="btn btn-secondary" onClick={this.handleReset}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
