import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";
import { sendApprovalResult } from "../mailer";

const router = Router();

/* ═══════════════════════════════════════════════════════════
   HELPER — execute a single approved request + notify requester
═══════════════════════════════════════════════════════════ */
async function executeApproval(ar: any, adminUserId: number) {
  if (ar.entity_type === "employee") {
    if (ar.request_type === "bulk_delete") {
      const bulkIds: number[] = ar.old_data?.ids || [];
      if (bulkIds.length > 0) {
        const ph = bulkIds.map((_: any, i: number) => `$${i + 1}`).join(",");
        await pool.query(
          `UPDATE employees SET deleted_at=NOW() WHERE employee_id IN (${ph})`, bulkIds
        );
        for (const eid of bulkIds) {
          await pool.query(
            `INSERT INTO audit_log (action, entity_type, entity_id, user_id)
             VALUES ('DELETE','EMPLOYEE',$1,$2)`,
            [eid, adminUserId]
          ).catch(() => {});
        }
      }
    } else if (ar.request_type === "delete") {
      await pool.query(
        `UPDATE employees SET deleted_at=NOW() WHERE employee_id=$1`, [ar.entity_id]
      );
      await pool.query(
        `INSERT INTO audit_log (action, entity_type, entity_id, user_id)
         VALUES ('DELETE','EMPLOYEE',$1,$2)`,
        [ar.entity_id, adminUserId]
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
           office_floor=$22, office_room_no=$23, room_id=$24,
           updated_at=NOW()
         WHERE employee_id=$25`,
        [
          d.employee_code, d.company_id, d.firstname, d.lastname,
          d.gender, d.date_of_birth || null, d.nationality, d.contact_no,
          d.position, d.status, d.hired_at || null,
          d.email || null, d.notes || null, d.photo || null,
          d.employee_type || null, d.province || null, d.district || null,
          d.village || null, d.dormitory || null, d.room_no || null,
          d.office_building || null,
          d.office_floor || null, d.office_room_no || null,
          d.room_id ? Number(d.room_id) : null,
          ar.entity_id,
        ]
      );
      await pool.query(
        `INSERT INTO audit_log (action, entity_type, entity_id, user_id)
         VALUES ('UPDATE','EMPLOYEE',$1,$2)`,
        [ar.entity_id, adminUserId]
      ).catch(() => {});
    }
    /* sync room status if room_id changed */
    if (ar.request_type === "edit" && ar.entity_type === "employee") {
      const oldRoomId = ar.old_data?.room_id ? Number(ar.old_data.room_id) : null;
      const newRoomId = ar.new_data?.room_id ? Number(ar.new_data.room_id) : null;
      if (newRoomId !== oldRoomId) {
        const syncRoom = async (rid: number) => {
          const occ = await pool.query(
            `SELECT COUNT(*) FROM employees WHERE room_id=$1 AND deleted_at IS NULL AND status!='Resigned'`, [rid]
          );
          const cap = await pool.query(`SELECT capacity FROM rooms WHERE room_id=$1`, [rid]);
          if (cap.rows.length === 0) return;
          const count    = parseInt(occ.rows[0].count);
          const capacity = cap.rows[0].capacity;
          const st = count === 0 ? "Available" : count >= capacity ? "Occupied" : "Partial";
          await pool.query(`UPDATE rooms SET status=$1, updated_at=NOW() WHERE room_id=$2`, [st, rid]);
        };
        if (newRoomId) await syncRoom(newRoomId).catch(() => {});
        if (oldRoomId) await syncRoom(oldRoomId).catch(() => {});
      }
    }
  } else if (ar.entity_type === "company") {
    if (ar.request_type === "delete") {
      await pool.query(`DELETE FROM companies WHERE company_id=$1`, [ar.entity_id]);
    } else if (ar.request_type === "edit") {
      const d = ar.new_data;
      await pool.query(
        `UPDATE companies SET companies_name=$1, contact=$2, status=$3 WHERE company_id=$4`,
        [d.companies_name, d.contact, d.status, ar.entity_id]
      );
    }
  }

  /* Mark approved */
  await pool.query(
    `UPDATE approval_requests SET status='approved', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2`,
    [adminUserId, ar.id]
  );

  /* Notify requester */
  let approveMsg: string;
  if (ar.request_type === "bulk_delete") {
    const cnt = (ar.old_data?.ids || []).length;
    approveMsg = `✅ Super Admin ອະນຸມັດການລຶບພະນັກງານ ${cnt} ຄົນແລ້ວ`;
  } else {
    const action = ar.request_type === "delete" ? "ລຶບ" : "ແກ້ໄຂ";
    approveMsg = `✅ Super Admin ອະນຸມັດການ${action}ຂໍ້ມູນ: ${ar.entity_name} ແລ້ວ`;
  }
  await pool.query(
    `INSERT INTO notifications (from_user_id, to_user_id, message, entity_type, entity_id, is_read_by_target)
     VALUES ($1, $2, $3, $4, $5, false)`,
    [adminUserId, ar.requested_by, approveMsg, ar.entity_type, ar.entity_id]
  ).catch(() => {});

  /* Email requester */
  pool.query(`SELECT email, fullname FROM users WHERE user_id=$1`, [ar.requested_by])
    .then(r => {
      if (r.rows[0]) sendApprovalResult({ toEmail: r.rows[0].email, toName: r.rows[0].fullname, entityName: ar.entity_name, approved: true });
    }).catch(() => {});
}

/* ═══════════════════════════════════════════════════════════
   GET /api/approvals  — Super Admin: ລາຍການທັງໝົດ
═══════════════════════════════════════════════════════════ */
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
    const r = await pool.query(`SELECT COUNT(*) FROM approval_requests WHERE status='pending'`);
    res.json({ count: parseInt(r.rows[0].count) });
  } catch {
    res.status(500).json({ count: 0 });
  }
});

/* GET /api/approvals/my — Company Admin: request ຂອງຕົນ */
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

/* POST /api/approvals — Company Admin: ສ້າງ request */
router.post("/", auth, async (req: any, res) => {
  try {
    const { request_type, entity_type, entity_id, entity_name, old_data, new_data } = req.body;
    const requested_by = req.user.user_id;

    const userInfo = await pool.query(`SELECT fullname FROM users WHERE user_id=$1`, [requested_by]);
    const requester_name = userInfo.rows[0]?.fullname || req.user.email || "Company Admin";

    const result = await pool.query(
      `INSERT INTO approval_requests
         (request_type, entity_type, entity_id, entity_name, requested_by, requested_by_name, old_data, new_data, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
       RETURNING *`,
      [request_type, entity_type, entity_id, entity_name, requested_by, requester_name,
       JSON.stringify(old_data || {}), JSON.stringify(new_data || {})]
    );

    const action = request_type === "delete" ? "ຂໍລຶບ" : "ຂໍແກ້ໄຂ";
    await pool.query(
      `INSERT INTO notifications (from_user_id, message, entity_type, entity_id)
       VALUES ($1, $2, $3, $4)`,
      [requested_by, `${requester_name} ${action}ຂໍ້ມູນ ${entity_name} — ລໍຖ້າການອະນຸມັດ`, entity_type, entity_id]
    ).catch(() => {});

    res.status(201).json({ pending: true, approval: result.rows[0] });
  } catch (err) {
    console.error("CREATE APPROVAL ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ═══════════════════════════════════════════════════════════
   PATCH /api/approvals/:id/approve  — Super Admin: ອະນຸມັດ 1 ລາຍການ
═══════════════════════════════════════════════════════════ */
router.patch("/:id/approve", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const arRes = await pool.query(`SELECT * FROM approval_requests WHERE id=$1`, [id]);
    if (arRes.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ request" });
    const ar = arRes.rows[0];
    if (ar.status !== "pending") return res.status(400).json({ message: "ຮ່ວງດຳເນີນການແລ້ວ" });

    await executeApproval(ar, req.user.user_id);
    res.json({ ok: true, message: "ອະນຸມັດສຳເລັດ" });
  } catch (err) {
    console.error("APPROVE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ═══════════════════════════════════════════════════════════
   POST /api/approvals/bulk-approve  — Super Admin: ອະນຸມັດທັງໝົດ
   body: { ids: [1,2,3,...] }
═══════════════════════════════════════════════════════════ */
router.post("/bulk-approve", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const ids: number[] = req.body.ids || [];
    if (ids.length === 0) return res.status(400).json({ message: "ບໍ່ມີ id" });

    const ph = ids.map((_: any, i: number) => `$${i + 1}`).join(",");
    const arRes = await pool.query(
      `SELECT * FROM approval_requests WHERE id IN (${ph}) AND status='pending'`, ids
    );
    const pending = arRes.rows;
    if (pending.length === 0) return res.status(404).json({ message: "ບໍ່ມີ request pending" });

    let done = 0;
    for (const ar of pending) {
      try {
        await executeApproval(ar, req.user.user_id);
        done++;
      } catch (e) {
        console.error("BULK APPROVE single error", ar.id, e);
      }
    }

    res.json({ ok: true, approved: done, total: pending.length });
  } catch (err) {
    console.error("BULK APPROVE ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ═══════════════════════════════════════════════════════════
   PATCH /api/approvals/:id/reject  — Super Admin: ປະຕິເສດ 1 ລາຍການ
═══════════════════════════════════════════════════════════ */
router.patch("/:id/reject", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const arRes = await pool.query(`SELECT * FROM approval_requests WHERE id=$1`, [id]);
    if (arRes.rows.length === 0) return res.status(404).json({ message: "ບໍ່ພົບ request" });
    const ar = arRes.rows[0];

    await pool.query(
      `UPDATE approval_requests SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), reject_reason=$2 WHERE id=$3`,
      [req.user.user_id, reason || null, id]
    );

    let rejectMsg: string;
    if (ar.request_type === "bulk_delete") {
      const cnt = (ar.old_data?.ids || []).length;
      rejectMsg = `❌ Super Admin ປະຕິເສດການລຶບພະນັກງານ ${cnt} ຄົນ${reason ? ` — ${reason}` : ""}`;
    } else {
      const action2 = ar.request_type === "delete" ? "ລຶບ" : "ແກ້ໄຂ";
      rejectMsg = `❌ Super Admin ປະຕິເສດການ${action2}ຂໍ້ມູນ: ${ar.entity_name}${reason ? ` — ${reason}` : ""}`;
    }
    await pool.query(
      `INSERT INTO notifications (from_user_id, to_user_id, message, entity_type, entity_id, is_read_by_target)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [req.user.user_id, ar.requested_by, rejectMsg, ar.entity_type, ar.entity_id]
    ).catch(() => {});

    pool.query(`SELECT email, fullname FROM users WHERE user_id=$1`, [ar.requested_by])
      .then(r => {
        if (r.rows[0]) sendApprovalResult({ toEmail: r.rows[0].email, toName: r.rows[0].fullname, entityName: ar.entity_name, approved: false, reason: reason || undefined });
      }).catch(() => {});

    res.json({ ok: true, message: "ປະຕິເສດແລ້ວ" });
  } catch (err) {
    console.error("REJECT ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

/* ═══════════════════════════════════════════════════════════
   POST /api/approvals/bulk-reject  — Super Admin: ປະຕິເສດທັງໝົດ
   body: { ids: [1,2,3,...], reason: "..." }
═══════════════════════════════════════════════════════════ */
router.post("/bulk-reject", auth, allow("Super Admin"), async (req: any, res) => {
  try {
    const ids: number[] = req.body.ids || [];
    const reason: string = req.body.reason || "";
    if (ids.length === 0) return res.status(400).json({ message: "ບໍ່ມີ id" });

    const ph = ids.map((_: any, i: number) => `$${i + 1}`).join(",");
    const arRes = await pool.query(
      `SELECT * FROM approval_requests WHERE id IN (${ph}) AND status='pending'`, ids
    );
    const pending = arRes.rows;
    if (pending.length === 0) return res.status(404).json({ message: "ບໍ່ມີ request pending" });

    /* reject ທຸກລາຍການ */
    const rejPh = pending.map((_: any, i: number) => `$${i + 3}`).join(",");
    await pool.query(
      `UPDATE approval_requests
       SET status='rejected', reviewed_by=$1, reviewed_at=NOW(), reject_reason=$2
       WHERE id IN (${rejPh})`,
      [req.user.user_id, reason || null, ...pending.map((a: any) => a.id)]
    );

    /* notify ທຸກ requester */
    for (const ar of pending) {
      let rejectMsg: string;
      if (ar.request_type === "bulk_delete") {
        const cnt = (ar.old_data?.ids || []).length;
        rejectMsg = `❌ Super Admin ປະຕິເສດການລຶບພະນັກງານ ${cnt} ຄົນ${reason ? ` — ${reason}` : ""}`;
      } else {
        const act = ar.request_type === "delete" ? "ລຶບ" : "ແກ້ໄຂ";
        rejectMsg = `❌ Super Admin ປະຕິເສດການ${act}ຂໍ້ມູນ: ${ar.entity_name}${reason ? ` — ${reason}` : ""}`;
      }
      await pool.query(
        `INSERT INTO notifications (from_user_id, to_user_id, message, entity_type, entity_id, is_read_by_target)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [req.user.user_id, ar.requested_by, rejectMsg, ar.entity_type, ar.entity_id]
      ).catch(() => {});
    }

    res.json({ ok: true, rejected: pending.length });
  } catch (err) {
    console.error("BULK REJECT ERROR", err);
    res.status(500).json({ message: "server error" });
  }
});

export default router;
