import { Router } from "express";
import { pool } from "../db";
import { auth } from "../middleware/auth";
import { allow } from "../middleware/role";
import { sendApprovalResult } from "../mailer";
import { logAudit } from "../utils/auditLog";
import { deleteFileFromCloudinary } from "../cloudinary";
import { canAccessEmployee } from "../utils/employeeAccess";

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
          logAudit({ action: "DELETE", entityType: "EMPLOYEE", entityId: eid, userId: adminUserId });
        }
      }
    } else if (ar.request_type === "delete") {
      await pool.query(
        `UPDATE employees SET deleted_at=NOW() WHERE employee_id=$1`, [ar.entity_id]
      );
      logAudit({ action: "DELETE", entityType: "EMPLOYEE", entityId: ar.entity_id, userId: adminUserId });
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
      logAudit({ action: "UPDATE", entityType: "EMPLOYEE", entityId: ar.entity_id, userId: adminUserId });
      /* Delete old Cloudinary photo now that the approval is being executed */
      const oldP = ar.old_data?.photo;
      const newP = ar.new_data?.photo;
      if (oldP && newP && oldP !== newP && oldP.startsWith("https://res.cloudinary.com"))
        deleteFileFromCloudinary(oldP).catch(() => {});
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
      logAudit({ action: "DELETE", entityType: "COMPANY", entityId: ar.entity_id, userId: adminUserId, beforeData: ar.old_data });
    } else if (ar.request_type === "edit") {
      const d = ar.new_data;
      await pool.query(
        `UPDATE companies SET companies_name=$1, contact=$2, status=$3 WHERE company_id=$4`,
        [d.companies_name, d.contact, d.status, ar.entity_id]
      );
      logAudit({ action: "UPDATE", entityType: "COMPANY", entityId: ar.entity_id, userId: adminUserId, beforeData: ar.old_data, afterData: d });
    }
  } else if (ar.entity_type === "permit") {
    const d = ar.new_data;
    if (ar.request_type === "permit_create") {
      /* Defense-in-depth: verify the requester's access to the target employee,
         guarding against manipulated approval requests created via the generic POST /approvals endpoint */
      const roleRes = await pool.query(
        `SELECT r.role_name FROM users u JOIN role r ON r.role_id=u.role_id WHERE u.user_id=$1`,
        [ar.requested_by]
      );
      const requesterRole: string = roleRes.rows[0]?.role_name ?? "Company Admin";
      if (!await canAccessEmployee(requesterRole, ar.requested_by, d.emp_id))
        throw new Error(`Security: user ${ar.requested_by} is not authorized to create permits for employee ${d.emp_id}`);

      const inserted = await pool.query(
        `INSERT INTO employee_permits
           (employee_id, permit_type, permit_number, issued_date, expires_at, status, file_path, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING permit_id`,
        [d.emp_id, d.permit_type, d.permit_number || null, d.issued_date || null,
         d.expires_at || null, d.status || "Valid", d.file_path || null,
         d.notes || null, d.created_by || ar.requested_by]
      );
      logAudit({ action: "CREATE", entityType: "PERMIT", entityId: inserted.rows[0].permit_id, userId: adminUserId, afterData: d });
    } else if (ar.request_type === "permit_edit") {
      const setClauses = [
        "permit_type=$1", "permit_number=$2", "issued_date=$3",
        "expires_at=$4", "status=$5", "notes=$6", "updated_at=NOW()"
      ];
      const params: any[] = [
        d.permit_type, d.permit_number || null, d.issued_date || null,
        d.expires_at || null, d.status, d.notes || null,
      ];
      if (d.new_file_path !== undefined) {
        setClauses.push(`file_path=$${params.length + 1}`);
        params.push(d.new_file_path);
        if (d.old_file_path?.startsWith("http") && d.old_file_path !== d.new_file_path)
          deleteFileFromCloudinary(d.old_file_path).catch(() => {});
      }
      params.push(ar.entity_id);
      await pool.query(
        `UPDATE employee_permits SET ${setClauses.join(", ")} WHERE permit_id=$${params.length}`, params
      );
      logAudit({ action: "UPDATE", entityType: "PERMIT", entityId: ar.entity_id, userId: adminUserId, beforeData: ar.old_data, afterData: d });
    } else if (ar.request_type === "permit_delete") {
      const fp = ar.old_data?.file_path;
      if (fp?.startsWith("http")) await deleteFileFromCloudinary(fp).catch(() => {});
      await pool.query(`DELETE FROM employee_permits WHERE permit_id=$1`, [ar.entity_id]);
      logAudit({ action: "DELETE", entityType: "PERMIT", entityId: ar.entity_id, userId: adminUserId, beforeData: ar.old_data });
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
  } else if (ar.entity_type === "permit") {
    const pVerb = ar.request_type === "permit_create" ? "ເພີ່ມ" : ar.request_type === "permit_edit" ? "ແກ້ໄຂ" : "ລຶບ";
    approveMsg = `✅ Super Admin ອະນຸມັດການ${pVerb}: ${ar.entity_name} ແລ້ວ`;
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

    /* Verify the caller actually owns the target entity */
    if (req.user.role !== "Super Admin") {
      let targetEmpId: string | number | null = null;
      if (entity_type === "employee") {
        targetEmpId = entity_id;
      } else if (entity_type === "permit") {
        /* permit_create stores emp_id in new_data; permit_edit/delete use the permit's employee */
        if (new_data?.emp_id) {
          targetEmpId = new_data.emp_id;
        } else if (entity_id) {
          const pr = await pool.query(
            `SELECT employee_id FROM employee_permits WHERE permit_id=$1`, [entity_id]
          );
          targetEmpId = pr.rows[0]?.employee_id ?? null;
        }
      }
      if (targetEmpId && !await canAccessEmployee(req.user.role, req.user.user_id, targetEmpId))
        return res.status(403).json({ message: "ບໍ່ມີສິດສ້າງ request ສຳລັບ employee ນີ້" });
    }

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

    /* Cleanup orphaned Cloudinary files for rejected permit requests */
    if (ar.entity_type === "permit") {
      const d = ar.new_data || {};
      if (ar.request_type === "permit_create" && d.file_path?.startsWith("http"))
        deleteFileFromCloudinary(d.file_path).catch(() => {});
      if (ar.request_type === "permit_edit" && d.new_file_path?.startsWith("http"))
        deleteFileFromCloudinary(d.new_file_path).catch(() => {});
    }

    let rejectMsg: string;
    if (ar.request_type === "bulk_delete") {
      const cnt = (ar.old_data?.ids || []).length;
      rejectMsg = `❌ Super Admin ປະຕິເສດການລຶບພະນັກງານ ${cnt} ຄົນ${reason ? ` — ${reason}` : ""}`;
    } else if (ar.entity_type === "permit") {
      const pAction = ar.request_type === "permit_create" ? "ເພີ່ມ" : ar.request_type === "permit_edit" ? "ແກ້ໄຂ" : "ລຶບ";
      rejectMsg = `❌ Super Admin ປະຕິເສດການ${pAction}: ${ar.entity_name}${reason ? ` — ${reason}` : ""}`;
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

    /* cleanup orphaned Cloudinary files + notify ທຸກ requester */
    for (const ar of pending) {
      /* Cloudinary cleanup for rejected permit requests */
      if (ar.entity_type === "permit") {
        if (ar.request_type === "permit_create" && ar.new_data?.file_path?.startsWith("http"))
          deleteFileFromCloudinary(ar.new_data.file_path).catch(() => {});
        if (ar.request_type === "permit_edit" && ar.new_data?.new_file_path?.startsWith("http") &&
            ar.new_data.new_file_path !== ar.new_data.old_file_path)
          deleteFileFromCloudinary(ar.new_data.new_file_path).catch(() => {});
      }

      let rejectMsg: string;
      if (ar.request_type === "bulk_delete") {
        const cnt = (ar.old_data?.ids || []).length;
        rejectMsg = `❌ Super Admin ປະຕິເສດການລຶບພະນັກງານ ${cnt} ຄົນ${reason ? ` — ${reason}` : ""}`;
      } else if (ar.entity_type === "permit") {
        const pVerb = ar.request_type === "permit_create" ? "ເພີ່ມ" : ar.request_type === "permit_edit" ? "ແກ້ໄຂ" : "ລຶບ";
        rejectMsg = `❌ Super Admin ປະຕິເສດການ${pVerb}: ${ar.entity_name}${reason ? ` — ${reason}` : ""}`;
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
