import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";
import { issueCardForEmployee } from "../utils/issueCard";

const router = Router();

/* ── card_request_batches table ── */
pool.query(`
  CREATE TABLE IF NOT EXISTS card_request_batches (
    batch_id          SERIAL PRIMARY KEY,
    company_id        INTEGER REFERENCES companies(company_id) ON DELETE SET NULL,
    requested_by      INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    requested_by_name VARCHAR(255),
    employees_json    JSONB NOT NULL DEFAULT '[]',
    total_count       INT DEFAULT 0,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by        INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at        TIMESTAMP,
    reviewed_by_name    VARCHAR(255),
    reject_reason      TEXT,
    created_at         TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});
pool.query(`ALTER TABLE card_request_batches ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(255)`).catch(() => {});
pool.query(`ALTER TABLE card_request_batches ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMP`).catch(() => {});
pool.query(`ALTER TABLE card_request_batches ADD COLUMN IF NOT EXISTS first_viewed_by_name VARCHAR(255)`).catch(() => {});
/* explicit flag: set to true only when admin explicitly clicks "Create Cards" for this batch */
pool.query(`ALTER TABLE card_request_batches ADD COLUMN IF NOT EXISTS cards_issued BOOLEAN NOT NULL DEFAULT FALSE`).catch(() => {});

/* all_printed still derived live; all_issued now uses the explicit cards_issued flag */
const PROGRESS_JOIN_SQL = `
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(BOOL_AND(ec.printed_at IS NOT NULL), false) AS all_printed,
      MAX(ec.printed_at)                                    AS last_printed_at
    FROM jsonb_array_elements(b.employees_json) AS emp
    LEFT JOIN employee_card ec ON ec.employee_id = (emp->>'employee_id')::int
  ) agg ON true
`;

/* ── POST /api/card-requests — submit a batch of employees for ID card issuance ── */
router.post("/", auth, async (req: any, res) => {
  try {
    const { company_id, employees } = req.body;
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ message: "ກະລຸນາເລືອກພະນັກງານ" });
    }

    const requested_by = req.user.user_id;
    const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [requested_by]);
    const requested_by_name = userInfo.rows[0]?.fullname || req.user.email || "Company Admin";

    const result = await pool.query(
      `INSERT INTO card_request_batches
         (company_id, requested_by, requested_by_name, employees_json, total_count, status)
       VALUES ($1,$2,$3,$4,$5,'pending')
       RETURNING *`,
      [company_id || null, requested_by, requested_by_name, JSON.stringify(employees), employees.length]
    );

    res.status(201).json({ batch: result.rows[0] });
  } catch (err) {
    console.error("CREATE CARD REQUEST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── GET /api/card-requests — Super Admin: all requests ── */
router.get("/", auth, allow("Super Admin"), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.batch_id, b.company_id, b.requested_by, b.requested_by_name,
              b.total_count, b.status, b.reviewed_by, b.reviewed_at, b.reviewed_by_name, b.reject_reason,
              b.created_at, b.cards_issued AS all_issued, c.companies_name, agg.all_printed, agg.last_printed_at
       FROM card_request_batches b
       LEFT JOIN companies c ON c.company_id = b.company_id
       ${PROGRESS_JOIN_SQL}
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("LIST CARD REQUESTS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── GET /api/card-requests/:id — Super Admin: batch detail.
   First view while still pending marks "review started" with a real timestamp. ── */
router.get("/:id", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, b.cards_issued AS all_issued, c.companies_name, agg.all_printed, agg.last_printed_at
       FROM card_request_batches b
       LEFT JOIN companies c ON c.company_id = b.company_id
       ${PROGRESS_JOIN_SQL}
       WHERE b.batch_id=$1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ request" });
    const row = result.rows[0];

    if (row.status === "pending" && !row.first_viewed_at) {
      const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]);
      const viewerName = userInfo.rows[0]?.fullname || "System Admin";
      const upd = await pool.query(
        `UPDATE card_request_batches SET first_viewed_at=NOW(), first_viewed_by_name=$1
         WHERE batch_id=$2 RETURNING first_viewed_at, first_viewed_by_name`,
        [viewerName, req.params.id]
      );
      row.first_viewed_at      = upd.rows[0].first_viewed_at;
      row.first_viewed_by_name = upd.rows[0].first_viewed_by_name;
    }

    res.json(row);
  } catch (err) {
    console.error("GET CARD REQUEST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── PATCH /api/card-requests/:id/approve — Super Admin: approve (status change only) ── */
router.patch("/:id/approve", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const batchRes = await pool.query(`SELECT * FROM card_request_batches WHERE batch_id=$1`, [id]);
    if (batchRes.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ request" });
    const batch = batchRes.rows[0];
    if (batch.status !== "pending") return res.status(400).json({ message: "ຮ່ວງດຳເນີນການແລ້ວ" });

    const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]);
    const reviewerName = userInfo.rows[0]?.fullname || "System Admin";
    await pool.query(
      `UPDATE card_request_batches SET status='approved', reviewed_by=$1, reviewed_by_name=$2, reviewed_at=NOW() WHERE batch_id=$3`,
      [req.user.user_id, reviewerName, id]
    );

    const employees: any[] = batch.employees_json || [];
    if (batch.requested_by) {
      await pool.query(
        `INSERT INTO notifications (from_user_id, to_user_id, message, entity_type, entity_id, is_read_by_target)
         VALUES ($1, $2, $3, 'card_request', $4, false)`,
        [req.user.user_id, batch.requested_by, `✅ Super Admin ອະນຸມັດຄຳຂໍບັດ ${employees.length} ຄົນແລ້ວ`, id]
      ).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("APPROVE CARD REQUEST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── PATCH /api/card-requests/:id/issue — Super Admin: issue (create) cards for all employees ── */
router.patch("/:id/issue", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const batchRes = await pool.query(`SELECT * FROM card_request_batches WHERE batch_id=$1`, [id]);
    if (!batchRes.rows.length) return res.status(404).json({ message: "ບໍ່ພົບ" });
    const batch = batchRes.rows[0];
    if (batch.status !== "approved") return res.status(400).json({ message: "ຕ້ອງອະນຸມັດກ່ອນ" });

    const employees: any[] = batch.employees_json || [];
    let issued = 0;
    for (const emp of employees) {
      try {
        await issueCardForEmployee(emp.employee_id, req.user.user_id);
        issued++;
      } catch (e) {
        console.error("ISSUE CARD ERROR", emp.employee_id, e);
      }
    }
    await pool.query(
      `UPDATE card_request_batches SET cards_issued=true WHERE batch_id=$1`,
      [id]
    );
    res.json({ ok: true, issued, total: employees.length });
  } catch (err) {
    console.error("ISSUE CARDS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── PATCH /api/card-requests/:id/mark-printed — Super Admin: mark all cards in batch as printed ── */
router.patch("/:id/mark-printed", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const batchRes = await pool.query(`SELECT * FROM card_request_batches WHERE batch_id=$1`, [id]);
    if (!batchRes.rows.length) return res.status(404).json({ message: "ບໍ່ພົບ" });
    const batch = batchRes.rows[0];
    if (batch.status !== "approved") return res.status(400).json({ message: "ຍັງບໍ່ໄດ້ອະນຸມັດ" });

    const employees: any[] = batch.employees_json || [];
    const employeeIds = employees.map((e: any) => e.employee_id).filter(Boolean);
    if (employeeIds.length > 0) {
      await pool.query(
        `UPDATE employee_card SET printed_at=NOW() WHERE employee_id=ANY($1) AND printed_at IS NULL`,
        [employeeIds]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("MARK PRINTED ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── PATCH /api/card-requests/:id/rollback — Super Admin: roll back to a previous step ──
   target_step 2 → unapprove (back to pending)
   target_step 3 → un-issue  (approved but cards_issued=false)
   target_step 4 → un-print  (issued but reset printed_at)               */
router.patch("/:id/rollback", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { target_step } = req.body;
    const batchRes = await pool.query(`SELECT * FROM card_request_batches WHERE batch_id=$1`, [id]);
    if (!batchRes.rows.length) return res.status(404).json({ message: "ບໍ່ພົບ" });
    const batch = batchRes.rows[0];

    if (target_step === 2) {
      if (batch.cards_issued) return res.status(400).json({ message: "ສ້າງບັດແລ້ວ, ຍ້ອນກັບຕື່ມບໍ່ໄດ້" });
      await pool.query(
        `UPDATE card_request_batches SET status='pending', reviewed_by=NULL, reviewed_at=NULL, reviewed_by_name=NULL, cards_issued=false WHERE batch_id=$1`,
        [id]
      );
    } else if (target_step === 3) {
      if (batch.status !== "approved") return res.status(400).json({ message: "ຍັງບໍ່ໄດ້ອະນຸມັດ" });
      await pool.query(
        `UPDATE card_request_batches SET cards_issued=false WHERE batch_id=$1`,
        [id]
      );
    } else if (target_step === 4) {
      if (batch.status !== "approved") return res.status(400).json({ message: "ຍັງບໍ່ໄດ້ອະນຸມັດ" });
      const employees: any[] = batch.employees_json || [];
      const empIds = employees.map((e: any) => e.employee_id).filter(Boolean);
      if (empIds.length > 0) {
        await pool.query(`UPDATE employee_card SET printed_at=NULL WHERE employee_id=ANY($1)`, [empIds]);
      }
    } else {
      return res.status(400).json({ message: "target_step ບໍ່ຖືກຕ້ອງ" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("ROLLBACK ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ── PATCH /api/card-requests/:id/reject — Super Admin: reject ── */
router.patch("/:id/reject", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const batchRes = await pool.query(`SELECT * FROM card_request_batches WHERE batch_id=$1`, [id]);
    if (batchRes.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ request" });
    const batch = batchRes.rows[0];
    if (batch.status !== "pending") return res.status(400).json({ message: "ຮ່ວງດຳເນີນການແລ້ວ" });

    const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [req.user.user_id]);
    const reviewerName = userInfo.rows[0]?.fullname || "System Admin";
    await pool.query(
      `UPDATE card_request_batches SET status='rejected', reviewed_by=$1, reviewed_by_name=$2, reviewed_at=NOW(), reject_reason=$3 WHERE batch_id=$4`,
      [req.user.user_id, reviewerName, reason || null, id]
    );

    if (batch.requested_by) {
      const employees: any[] = batch.employees_json || [];
      await pool.query(
        `INSERT INTO notifications (from_user_id, to_user_id, message, entity_type, entity_id, is_read_by_target)
         VALUES ($1, $2, $3, 'card_request', $4, false)`,
        [req.user.user_id, batch.requested_by, `❌ Super Admin ປະຕິເສດຄຳຂໍບັດ ${employees.length} ຄົນ${reason ? ` — ${reason}` : ""}`, id]
      ).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("REJECT CARD REQUEST ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
