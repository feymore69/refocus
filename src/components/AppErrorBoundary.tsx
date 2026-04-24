import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  private readonly onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? `${reason.name}: ${reason.message}` : "Unhandled promise rejection";
    console.error("Unhandled promise rejection", reason);
    this.setState({ hasError: true, message });
  };

  private readonly onWindowError = (event: ErrorEvent) => {
    const message = event.error instanceof Error ? `${event.error.name}: ${event.error.message}` : event.message;
    console.error("Unhandled window error", event.error ?? event.message);
    this.setState({ hasError: true, message: message || "Unhandled window error" });
  };

  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message =
      error instanceof Error ? `${error.name}: ${error.message}` : "Unexpected runtime error";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("Refocus runtime crash", error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener("unhandledrejection", this.onUnhandledRejection);
    window.addEventListener("error", this.onWindowError);
  }

  componentWillUnmount() {
    window.removeEventListener("unhandledrejection", this.onUnhandledRejection);
    window.removeEventListener("error", this.onWindowError);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#070812",
          color: "#f5f8ff",
          fontFamily: "Inter, Segoe UI, sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "min(560px, 92vw)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "16px",
            background: "rgba(16,19,39,0.75)",
            padding: "18px 20px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.08em", opacity: 0.75, textTransform: "uppercase" }}>
            Refocus
          </p>
          <h1 style={{ margin: "10px 0 6px", fontSize: "22px", lineHeight: 1.2 }}>
            The app hit a runtime error
          </h1>
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.88 }}>
            {this.state.message || "An unknown error occurred while rendering the app."}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              marginTop: "14px",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.16)",
              color: "#fff",
              borderRadius: "10px",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Reload Refocus
          </button>
        </div>
      </div>
    );
  }
}
