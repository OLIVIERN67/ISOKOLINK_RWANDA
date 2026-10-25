import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Unhandled UI error:", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-error">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="mt-1 max-w-md text-sm text-charcoal/60">{this.state.message}</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload the page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
