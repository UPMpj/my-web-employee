import { pool } from "../db";

export async function runExpiryAlertCheck(): Promise<{ checked: number; alertsSent: number }> {
  const enabledRow = await pool.query(`SELECT value FROM app_settings WHERE key='id_card_expiry_alerts_enabled'`);
  if (enabledRow.rows[0]?.value === "false") return { checked: 0, alertsSent: 0 };

  const daysRow = await pool.query(`SELECT value FROM app_settings WHERE key='id_card_expiry_alert_days'`);
  const days = parseInt(daysRow.rows[0]?.value || "30", 10);

  const result = await pool.query(
    `SELECT p.permit_id, p.permit_type, p.expires_at, e.firstname, e.lastname
     FROM employee_permits p
     JOIN employees e ON e.employee_id = p.employee_id
     WHERE p.status = 'Valid'
       AND p.expires_at IS NOT NULL
       AND p.expires_at <= (NOW() + ($1 || ' days')::interval)
       AND p.expires_at >= NOW()
       AND NOT EXISTS (
         SELECT 1 FROM expiry_alert_log a
         WHERE a.permit_id = p.permit_id AND a.alert_date = (NOW() AT TIME ZONE 'Asia/Vientiane')::date
       )`,
    [days]
  );

  let alertsSent = 0;
  for (const row of result.rows) {
    /* Insert the dedup row first — if a concurrent call already alerted this permit today, skip */
    const inserted = await pool.query(
      `INSERT INTO expiry_alert_log (permit_id, alert_date)
       VALUES ($1, (NOW() AT TIME ZONE 'Asia/Vientiane')::date)
       ON CONFLICT (permit_id, alert_date) DO NOTHING RETURNING id`,
      [row.permit_id]
    );
    if (inserted.rows.length === 0) continue;

    const msg = `⚠️ ໃບອະນຸຍາດ (${row.permit_type}) ຂອງ ${row.firstname} ${row.lastname} ຈະໝົດອາຍຸ ${row.expires_at} — ກະລຸນາກວດສອບ`;
    await pool.query(
      `INSERT INTO notifications (message, entity_type, entity_id) VALUES ($1,'permit',$2)`,
      [msg, row.permit_id]
    ).catch(() => {});
    alertsSent++;
  }

  return { checked: result.rows.length, alertsSent };
}

/* In-memory cooldown so this doesn't run on every single authenticated request —
   only shortly after the app wakes up (first request after the cooldown window) */
let lastCheckAt = 0;
const CHECK_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

export function maybeRunExpiryAlertCheck() {
  const now = Date.now();
  if (now - lastCheckAt < CHECK_COOLDOWN_MS) return;
  lastCheckAt = now;
  runExpiryAlertCheck().catch(err => console.error("EXPIRY ALERT CHECK ERROR", err));
}
