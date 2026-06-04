import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";
import { sendApprovalRequest, sendApprovalResult } from "../mailer";

const router = Router();

/* ══════════════════════════════════════════════
   GET /api/approvals  — Super Admin: ລາຍການທີ່ຍັງ pending
══════════════════════════════════════════════ */
router.get("/", auth, allow("Super Admin"), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT ar.*, u.fullname AS requester_name, u.email AS requester_email
       FROM approval_requests ar
       LEFT JOIN users u ON u.user_id = ar.requested_by
       ORDER BY ar.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET APPROVALS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* GET /api/approvals/pending-count */
router.get("/pending-count", auth, allow("Super Admin"), async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT COUNT(*) FROM approval_requests WHERE status='pending'`
    );
    res.json({ count: parseInt(r.rows[0].count) });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

/* ══════════════════════════════════════════════
   GET /api/approvals/my — Company Admin: ເຫັນ request ຂອງຕົນ
══════════════════════════════════════════════ */
router.get("/my", auth, async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT ar.*, u.fullname AS reviewer_name
       FROM approval_requests ar
       LEFT JOIN users u ON u.user_id = ar.reviewed_by
       WHERE ar.requested_by = $1
       ORDER BY ar.created_at DESC
       LIMIT 50`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("MY APPROVALS ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ══════════════════════════════════════════════
   POST /api/approvals  — Company Admin: ສ້າງ request
   body: { request_type, entity_type, entity_id, entity_name, old_data, new_data }
══════════════════════════════════════════════ */
router.post("/", auth, async (req: any, res) => {
  try {
    const { request_type, entity_type, entity_id, entity_name, old_data, new_data } = req.body;
    const requested_by = req.user.user_id;

    const userInfo = await pool.query(
      `SELECT fullname FROM users WHERE user_id=$1`, [requested_by]
    );
    const requester_name = userInfo.rows[0]?.fullname || req.user.email || "Company Admin";

    const result = await pool.query(
      `INSERT INTO approval_requests
         (request_type, entity_type, entity_id, entity_name, requested_by, requested_by_name, old_data, new_data, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
       RETURNING *`,
      [request_type, entity_type, entity_id, entity_name, requested_by, requester_name,
       JSON.stringify(old_data || {}), JSON.stringify(new_data || {})]
    );

    /* ສ້າງ notification ໃຫ້ Super Admin ຮູ້ */
    const action = request_type === "delete" ? "ຂໍລຶບ" : "ຂໍແກ້ໄຂ";
    await pool.query(
      `INSERT INTO notifications (from_user_id, message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [
        requested_by,
        `${requester_name} ${action}ຂໍ້ມູນ ${entity_name} — ລໍຖ້າການອະນຸມັດ`,
        entity_type,
        entity_id,
      ]
    ).catch(() => {});

    /* Email Super Admin */
    pool.query(`SELECT email, fullname FROM users u JOIN role r ON r.role_id=u.role_id WHERE r.role_name='Super Admin' LIMIT 5`)
      .then(admins => admins.rows.forEach(a =>
        sendApprovalRequest({
          toEmail: a.email, toName: a.fullname, requesterName: requester_name,
          entityName: entity_name, action,
          frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
        })
      )).catch(() => {});

    res.status(201).json({ pending: true, approval: result.rows[0] });
  } catch (err) {
    console.error("CREATE APPROVAL ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ══════════════════════════════════════════════
   PATCH /api/approvals/:id/approve  — Super Admin: ອະນຸມັດ + execute
══════════════════════════════════════════════ */
router.patch("/:id/approve", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;

    const arRes = await pool.query(
      `SELECT * FROM approval_requests WHERE id=$1`, [id]
    );
    if (arRes.rows.length === 0) {
      return res.status(404).json({ message: "ບໍ່ພົບ request" });
    }
    const ar = arRes.rows[0];
    if (ar.status !== "pending") {
      return res.status(400).json({ message: "ຮ່ວງດຳເນີນການແລ້ວ" });
    }

    /* ── Execute the change ── */
    if (ar.entity_type === "employee") {
      if (ar.request_type === "delete") {
        await pool.query(
          `UPDATE employees SET deleted_at=NOW() WHERE employee_id=$1`, [ar.entity_id]
        );
        await pool.query(
          `INSERT INTO audit_log (action, entity_type, entity_id, user_id)
           VALUES ('DELETE','EMPLOYEE',$1,$2)`,
          [ar.entity_id, req.user.user_id]
        ).catch(() => {});
      } else if (ar.request_type === "edit") {
        const d = ar.new_data;
        await pool.query(
          `UPDATE employees SET
             employee_code=$1, company_id=$2, firstname=$3, lastname=$4,
             gender=$5, date_of_birth=$6, nationality=$7, contact_no=$8,
             position=$9, status=$10, hired_at=$11,
             email=$12, notes=$13, photo=$14,
             employee_type=$15, province=$16, district=$17, village=$18,
             dormitory=$19, room_no=$20, office_building=$21,
             updated_at=NOW()
           WHERE employee_id=$22`,
          [
            d.employee_code, d.company_id, d.firstname, d.lastname,
            d.gender, d.date_of_birth || null, d.nationality, d.contact_no,
            d.position, d.status, d.hired_at || null,
            d.email || null, d.notes || null, d.photo || null,
            d.employee_type || null, d.province || null, d.district || null,
            d.village || null, d.dormitory || null, d.room_no || null,
            d.office_building || null, ar.entity_id,
          ]
        );
        await pool.query(
          `INSERT INTO audit_log (action, entity_type, entity_id, user_id)
           VALUES ('UPDATE','EMPLOYEE',$1,$2)`,
          [ar.entity_id, req.user.user_id]
        ).catch(() => {});
      }
    } else if (ar.entity_type === "company") {
      if (ar.request_type === "delete") {
        await pool.query(`DELETE FROM companies WHERE company_id=$1`, [ar.entity_id]);
      } else if (ar.request_type === "edit") {
        const d = ar.new_data;
        await pool.query(
          `UPDATE companies SET companies_name=$1, contact=$2, status=$3
           WHERE company_id=$4`,
          [d.companies_name, d.contact, d.status, ar.entity_id]
        );
      }
    }

    /* Mark approved */
    await pool.query(
      `UPDATE approval_requests
       SET status='approved', reviewed_by=$1, reviewed_at=NOW()
       WHERE id=$2`,
      [req.user.user_id, id]
    );

    /* Notify requester */
    const action = ar.request_type === "delete" ? "ລຶບ" : "ແກ້ໄຂ";
    await pool.query(
      `INSERT INTO notifications (from_user_id, to_user_id, message, entity_type, entity_id, is_read_by_target)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [req.user.user_id, ar.requested_by,
       `✅ Super Admin ອະນຸມັດການ${action}ຂໍ້ມູນ: ${ar.entity_name} ແລ້ວ`,
       ar.entity_type, ar.entity_id]
    ).catch(() => {});

    /* Email requester */
    pool.query(`SELECT email, fullname FROM users WHERE user_id=$1`, [ar.requested_by])
      .then(r => { if (r.rows[0]) sendApprovalResult({ toEmail: r.rows[0].email, toName: r.rows[0].fullname, entityName: ar.entity_name, approved: true }); })
      .catch(() => {});

    res.json({ ok: true, message: "ອະນຸມັດສຳເລັດ" });
  } catch (err) {
    console.error("APPROVE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ══════════════════════════════════════════════
   PATCH /api/approvals/:id/reject  — Super Admin: ປະຕິເສດ
══════════════════════════════════════════════ */
router.patch("/:id/reject", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const arRes = await pool.query(
      `SELECT * FROM approval_requests WHERE id=$1`, [id]
    );
    if (arRes.rows.length === 0) {
      return res.status(404).json({ message: "ບໍ່ພົບ request" });
    }
    const ar = arRes.rows[0];

    await pool.query(
      `UPDATE approval_requests
       SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), reject_reason=$2
       WHERE id=$3`,
      [req.user.user_id, reason || null, id]
    );

    const action2 = ar.request_type === "delete" ? "ລຶບ" : "ແກ້ໄຂ";
    await pool.query(
      `INSERT INTO notifications (from_user_id, to_user_id, message, entity_type, entity_id, is_read_by_target)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [req.user.user_id, ar.requested_by,
       `❌ Super Admin ປະຕິເສດການ${action2}ຂໍ້ມູນ: ${ar.entity_name}${reason ? ` — ${reason}` : ""}`,
       ar.entity_type, ar.entity_id]
    ).catch(() => {});

    /* Email requester */
    pool.query(`SELECT email, fullname FROM users WHERE user_id=$1`, [ar.requested_by])
      .then(r => { if (r.rows[0]) sendApprovalResult({ toEmail: r.rows[0].email, toName: r.rows[0].fullname, entityName: ar.entity_name, approved: false, reason: reason || undefined }); })
      .catch(() => {});

    res.json({ ok: true, message: "ປະຕິເສດແລ້ວ" });
  } catch (err) {
    console.error("REJECT ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
