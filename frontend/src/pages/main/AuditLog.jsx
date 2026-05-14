import { useEffect, useState } from "react";
import { api } from "../../api";

const ACTION_COLOR = {
  INSERT: { bg: "#dcfce7", color: "#166534" },
  UPDATE: { bg: "#dbeafe", color: "#1e40af" },
  DELETE: { bg: "#fee2e2", color: "#991b1b" },
};

function fmtDate(d) {
  if (!d) return "–";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLog() {
  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/audit", { params: { page, limit } });
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch { setLogs([]); }
    setLoading(false);
  };

  const pages = Math.ceil(total / limit);
  const from  = total === 0 ? 0 : (page - 1) * limit + 1;
  const to    = Math.min(page * limit, total);

  return (
    <div style={{ padding: "28px 32px", background: "#f4f6fb", minHeight: "100vh" }}>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", color: "#1a1a2e" }}>Audit Log</h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px", fontSize: 14 }}>ປະຫວັດການໃຊ້ງານລະບົບທັງໝົດ</p>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.07)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>Loading...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "2px solid #f3f4f6" }}>
                {["#", "Action", "Entity", "ຜູ້ໃຊ້", "Company", "ວັນທີ"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>ບໍ່ມີຂໍ້ມູນ</td></tr>
              ) : logs.map((log, i) => {
                const ac = ACTION_COLOR[log.action?.toUpperCase()] || { bg: "#f3f4f6", color: "#374151" };
                return (
                  <tr key={log.audit_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#9ca3af" }}>{from + i}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: ac.bg, color: ac.color }}>
                        {log.action || "–"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 14, color: "#374151" }}>{log.entity_type || "–"}</td>
                    <td style={{ padding: "13px 16px", fontSize: 14, color: "#374151" }}>{log.fullname || "–"}</td>
                    <td style={{ padding: "13px 16px", fontSize: 14, color: "#6b7280" }}>{log.companies_name || "–"}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#6b7280" }}>{fmtDate(log.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #f3f4f6" }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Showing {from}–{to} of {total}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer", opacity: page === 1 ? 0.4 : 1 }}>
              Prev
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: 6, background: page === n ? "#2f4aad" : "#fff", color: page === n ? "#fff" : "#374151", cursor: "pointer", fontWeight: page === n ? 700 : 400 }}>
                {n}
              </button>
            ))}
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
              style={{ padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer", opacity: page >= pages ? 0.4 : 1 }}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
