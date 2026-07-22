import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh",
        fontFamily: "inherit", color: "#111827", padding: "2rem",
      }}>
        <div style={{
          maxWidth: 480, textAlign: "center",
          background: "#fff", borderRadius: 16,
          padding: "2.5rem 2rem",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid #f3f4f6",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
            ເກີດຂໍ້ຜິດພາດ
          </h2>
          <p style={{ color: "#6b7280", margin: "0 0 24px", fontSize: 14 }}>
            ຫນ້ານີ້ລົ້ມເຫລວ — ກົດປຸ່ມລຸ່ມນີ້ເພື່ອໂຫຼດໃໝ່
          </p>
          <details style={{ textAlign: "left", marginBottom: 24, fontSize: 12, color: "#9ca3af" }}>
            <summary style={{ cursor: "pointer", marginBottom: 6 }}>ລາຍລະອຽດ error</summary>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {this.state.error?.message}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "var(--primary)", color: "#fff",
              border: "none", borderRadius: 8,
              padding: "10px 28px", fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            ໂຫຼດໃໝ່
          </button>
        </div>
      </div>
    );
  }
}
