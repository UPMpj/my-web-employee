import nodemailer from "nodemailer";

function transporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
}

const APP = "UDM CMS";
const FROM = () => `"${APP}" <${process.env.MAIL_USER}>`;

export async function sendApprovalRequest(opts: {
  toEmail: string;
  toName: string;
  requesterName: string;
  entityName: string;
  action: string;
  frontendUrl: string;
}) {
  if (!process.env.MAIL_USER) return;
  await transporter().sendMail({
    from: FROM(),
    to: opts.toEmail,
    subject: `[${APP}] ຄຳຂໍ Approval ໃໝ່ — ${opts.entityName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px;background:#f9fafb;border-radius:12px;">
        <h2 style="color:#1a1a2e;margin:0 0 8px">ຄຳຂໍ Approval ໃໝ່</h2>
        <p style="color:#6b7280;margin:0 0 16px">
          <strong>${opts.requesterName}</strong> ຂໍ${opts.action}ຂໍ້ມູນ: <strong>${opts.entityName}</strong>
        </p>
        <a href="${opts.frontendUrl}/users" style="display:inline-block;padding:11px 24px;background:#2f4aad;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">
          ເບິ່ງ Approvals
        </a>
      </div>`,
  }).catch(console.error);
}

/* Secondary, isolated copy of each backup — sent over Gmail/SMTP (different credentials
   than Cloudinary) so a compromised Cloudinary account can't take the backups down with it. */
export async function sendBackupEmail(opts: {
  toEmail: string;
  buffer: Buffer;
  sizeKb: number;
  triggeredBy: string;
}) {
  if (!process.env.MAIL_USER) return;
  await transporter().sendMail({
    from: FROM(),
    to: opts.toEmail,
    subject: `[${APP}] 📦 Database Backup — ${new Date().toISOString().slice(0, 10)}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px;background:#f9fafb;border-radius:12px;">
        <h2 style="color:#1a1a2e;margin:0 0 8px">📦 ສຳຮອງຂໍ້ມູນ CCMS</h2>
        <p style="color:#6b7280;margin:0 0 8px">ໄຟລ໌ສຳຮອງ (${opts.sizeKb} KB) ແນບມານຳອີເມວນີ້ ເພື່ອເກັບໄວ້ນອກລະບົບ Cloudinary ຫຼັກ.</p>
        <p style="color:#9ca3af;font-size:13px;margin:0">ປະເພດ: ${opts.triggeredBy}</p>
      </div>`,
    attachments: [{ filename: `ccms_backup_${Date.now()}.zip`, content: opts.buffer }],
  });
}

export async function sendApprovalResult(opts: {
  toEmail: string;
  toName: string;
  entityName: string;
  approved: boolean;
  reason?: string;
}) {
  if (!process.env.MAIL_USER) return;
  const icon   = opts.approved ? "✅" : "❌";
  const status = opts.approved ? "ອະນຸມັດແລ້ວ" : "ຖືກປະຕິເສດ";
  await transporter().sendMail({
    from: FROM(),
    to: opts.toEmail,
    subject: `[${APP}] ${icon} ຄຳຂໍ ${status} — ${opts.entityName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px;background:#f9fafb;border-radius:12px;">
        <h2 style="color:#1a1a2e;margin:0 0 8px">${icon} ຄຳຂໍ ${status}</h2>
        <p style="color:#6b7280;margin:0 0 8px">ຄຳຂໍຂອງທ່ານສຳລັບ <strong>${opts.entityName}</strong> ${status}.</p>
        ${!opts.approved && opts.reason ? `<p style="color:#dc2626;margin:0;font-size:14px;">ເຫດຜົນ: ${opts.reason}</p>` : ""}
      </div>`,
  }).catch(console.error);
}
