"""
Employee Management System — Flow Chart Generator
Creates PNG images using matplotlib
"""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe

OUT = os.path.join(os.path.dirname(__file__), "flowcharts")
os.makedirs(OUT, exist_ok=True)

# ──────────────── COLOR PALETTE ────────────────
C = {
    "blue_dark":  "#1e3a8a",
    "blue":       "#2563eb",
    "blue_light": "#dbeafe",
    "green_dark": "#15803d",
    "green":      "#16a34a",
    "green_light":"#dcfce7",
    "yellow":     "#d97706",
    "yellow_light":"#fef3c7",
    "red":        "#dc2626",
    "red_light":  "#fee2e2",
    "purple":     "#7c3aed",
    "purple_light":"#ede9fe",
    "gray":       "#64748b",
    "gray_light": "#f1f5f9",
    "white":      "#ffffff",
    "text_dark":  "#0f172a",
}

# ──────────────── DRAWING HELPERS ────────────────
def box(ax, x, y, w, h, text, color=None, text_color=None,
        fontsize=9, style="round,pad=0.1", bold=False, wrap=True):
    fc = color or C["blue_light"]
    ec = C["blue"] if fc == C["blue_light"] else (
         C["green_dark"] if fc == C["green_light"] else (
         C["red"] if fc == C["red_light"] else (
         C["yellow"] if fc == C["yellow_light"] else
         C["purple"] if fc == C["purple_light"] else C["gray"])))
    if fc in (C["blue_dark"], C["blue"], C["green_dark"], C["green"], C["red"], C["purple"]):
        ec = fc
    patch = FancyBboxPatch((x - w/2, y - h/2), w, h,
                           boxstyle=style,
                           facecolor=fc, edgecolor=ec,
                           linewidth=1.4, zorder=3)
    ax.add_patch(patch)
    tc = text_color or (C["white"] if fc in (C["blue_dark"], C["blue"], C["green_dark"],
                                              C["green"], C["red"], C["purple"]) else C["text_dark"])
    weight = "bold" if bold else "normal"
    ax.text(x, y, text, ha="center", va="center",
            fontsize=fontsize, color=tc, fontweight=weight,
            wrap=True, zorder=4,
            multialignment="center")
    return (x, y, w, h)

def diamond(ax, x, y, w, h, text, color=None, fontsize=8.5):
    fc = color or C["yellow_light"]
    xs = [x, x+w/2, x, x-w/2, x]
    ys = [y+h/2, y, y-h/2, y, y+h/2]
    ax.fill(xs, ys, facecolor=fc, edgecolor=C["yellow"], linewidth=1.4, zorder=3)
    ax.text(x, y, text, ha="center", va="center",
            fontsize=fontsize, color=C["text_dark"],
            zorder=4, multialignment="center")

def arr(ax, x1, y1, x2, y2, label="", color="#475569", lw=1.5, style="-|>"):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color,
                                lw=lw, connectionstyle="arc3,rad=0.0"),
                zorder=2)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx+0.03, my, label, fontsize=7.5, color=color,
                ha="left", va="center", zorder=5,
                bbox=dict(facecolor="white", edgecolor="none", alpha=0.8, pad=1))

def arr_curve(ax, x1, y1, x2, y2, label="", rad=0.3, color="#475569"):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=color, lw=1.5,
                                connectionstyle=f"arc3,rad={rad}"),
                zorder=2)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx+0.05, my, label, fontsize=7.5, color=color,
                ha="left", va="center", zorder=5,
                bbox=dict(facecolor="white", edgecolor="none", alpha=0.8, pad=1))

def circle(ax, x, y, r, text, color=None, fontsize=9):
    fc = color or C["blue_dark"]
    c = plt.Circle((x, y), r, facecolor=fc, edgecolor=fc, linewidth=1.5, zorder=3)
    ax.add_patch(c)
    tc = C["white"]
    ax.text(x, y, text, ha="center", va="center",
            fontsize=fontsize, color=tc, fontweight="bold", zorder=4,
            multialignment="center")

def title_box(ax, text, sub=""):
    ax.text(0.5, 0.98, text, transform=ax.transAxes,
            ha="center", va="top", fontsize=14, fontweight="bold",
            color=C["blue_dark"])
    if sub:
        ax.text(0.5, 0.955, sub, transform=ax.transAxes,
                ha="center", va="top", fontsize=9, color=C["gray"])

def section_label(ax, x, y, w, text, color=None):
    fc = color or C["blue_dark"]
    patch = FancyBboxPatch((x - w/2, y - 0.16), w, 0.32,
                           boxstyle="round,pad=0.05",
                           facecolor=fc, edgecolor=fc, linewidth=0,
                           zorder=3, alpha=0.15)
    ax.add_patch(patch)
    ax.text(x, y, text, ha="center", va="center",
            fontsize=8, color=fc, fontweight="bold", zorder=4)

def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, dpi=150, bbox_inches="tight",
                facecolor="white", edgecolor="none")
    plt.close(fig)
    print(f"  ✅ {name}")


# ══════════════════════════════════════════════════════════
#  CHART 1: SYSTEM ARCHITECTURE OVERVIEW
# ══════════════════════════════════════════════════════════
def chart_architecture():
    fig, ax = plt.subplots(figsize=(16, 11))
    ax.set_xlim(0, 16); ax.set_ylim(0, 11)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    title_box(ax, "1. System Architecture Overview — ພາບລວມໂຄງສ້າງລະບົບ",
              "Employee Management System · Full-Stack Web Application")

    # Layer backgrounds
    layers = [
        (0.3, 8.2, 15.4, 2.0, C["blue_light"],  C["blue"],      "🖥️  CLIENT LAYER (Browser)"),
        (0.3, 5.8, 15.4, 2.0, C["green_light"],  C["green_dark"], "⚙️  SERVER LAYER (Node.js on Render)"),
        (0.3, 3.0, 15.4, 2.5, C["yellow_light"], C["yellow"],    "🗄️  DATABASE LAYER (PostgreSQL on Render)"),
        (0.3, 1.1, 15.4, 1.6, C["purple_light"], C["purple"],    "☁️  CLOUD SERVICES"),
    ]
    for lx, ly, lw, lh, fc, ec, lbl in layers:
        patch = FancyBboxPatch((lx, ly-lh/2+0.1), lw, lh,
                               boxstyle="round,pad=0.15",
                               facecolor=fc, edgecolor=ec,
                               linewidth=1.8, alpha=0.5, zorder=1)
        ax.add_patch(patch)
        ax.text(lx+0.2, ly+lh/2-0.25, lbl, fontsize=8.5, color=ec, fontweight="bold")

    # Client layer
    box(ax, 3.5, 8.2, 2.6, 0.7, "React + Vite\nFrontend SPA", C["blue_dark"], fontsize=9, bold=True)
    box(ax, 8.0, 8.2, 3.0, 0.7, "Pages & Components\nDashboard·Employees·IdCard\nBuilding·Reports·Import", C["blue_light"], fontsize=8)
    box(ax, 12.5, 8.2, 2.8, 0.7, "Context & Hooks\nLanguageContext\nuseCurrentUser()", C["blue_light"], fontsize=8)
    arr(ax, 4.8, 8.2, 6.5, 8.2)
    arr(ax, 9.5, 8.2, 11.1, 8.2)

    # Server layer
    box(ax, 3.5, 5.8, 2.6, 0.7, "Express + TypeScript\nREST API · Port 5001", C["green_dark"], fontsize=9, bold=True)
    box(ax, 8.0, 5.8, 3.0, 0.7, "Middleware\nJWT Auth · Role Guard\nHelmet · CORS · Gzip · Rate Limit", C["green_light"], fontsize=8)
    box(ax, 12.5, 5.8, 2.8, 0.7, "API Routes\n/api/auth · /api/employees\n/api/approvals · /api/import\n+10 more routes", C["green_light"], fontsize=8)
    arr(ax, 4.8, 5.8, 6.5, 5.8)
    arr(ax, 9.5, 5.8, 11.1, 5.8)

    # Database layer
    box(ax, 2.8, 3.5, 2.5, 0.65, "Core Tables\nemployees · companies\nusers · roles", C["yellow_light"], fontsize=8)
    box(ax, 5.8, 3.5, 2.7, 0.65, "Feature Tables\nemployee_card · buildings\nrooms · documents · permits", C["yellow_light"], fontsize=8)
    box(ax, 9.0, 3.5, 2.7, 0.65, "Workflow Tables\napproval_requests\nnotifications · import_batches\naudit_log", C["yellow_light"], fontsize=8)
    box(ax, 12.2, 3.5, 2.5, 0.65, "Auth Tables\nrevoked_tokens\napp_settings", C["yellow_light"], fontsize=8)

    # Cloud services
    box(ax, 5.5, 1.3, 3.5, 0.65, "☁️ Cloudinary\nEmployee Photos · Document Files\n(multer → Cloudinary upload)", C["purple_light"], fontsize=8.5)
    box(ax, 10.5, 1.3, 3.5, 0.65, "📧 Nodemailer / Email\nApproval Results\nPassword Reset Links", C["purple_light"], fontsize=8.5)

    # Vertical connections
    arr(ax, 8.0, 7.85, 8.0, 6.15, "HTTPS REST API\nJWT Bearer Token")
    arr(ax, 8.0, 5.45, 8.0, 3.82, "SQL Queries\nPooled connections")
    arr(ax, 5.8, 5.45, 5.5, 1.62, "", color=C["purple"])
    arr(ax, 10.5, 5.45, 10.5, 1.62, "", color=C["purple"])

    save(fig, "01_architecture.png")


# ══════════════════════════════════════════════════════════
#  CHART 2: AUTHENTICATION FLOW
# ══════════════════════════════════════════════════════════
def chart_auth():
    fig, ax = plt.subplots(figsize=(18, 14))
    ax.set_xlim(0, 18); ax.set_ylim(0, 14)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    title_box(ax, "2. Authentication & Authorization Flow — ການເຂົ້າສູ່ລະບົບ",
              "Login · Logout · Forgot Password · Token Validation · Rate Limiting")

    # === LOGIN PATH (left) ===
    circle(ax, 3.0, 12.8, 0.28, "START", fontsize=7)
    box(ax, 3.0, 12.1, 2.8, 0.55, "🌐 User opens browser\n→ /login page", C["blue_light"], fontsize=8.5)
    box(ax, 3.0, 11.2, 2.8, 0.55, "Enter Email + Password\nin Login form", C["blue_light"], fontsize=8.5)
    box(ax, 3.0, 10.3, 2.8, 0.55, "POST /api/auth/login", C["blue_dark"], fontsize=8.5, bold=True)
    diamond(ax, 3.0, 9.4, 2.8, 0.65, "Rate limit OK?\n10 attempts / 15 min", fontsize=8)
    box(ax, 5.8, 9.4, 2.2, 0.5, "429 Too Many\nRequests ❌", C["red_light"], fontsize=8)
    diamond(ax, 3.0, 8.4, 2.8, 0.65, "User exists in\ndatabase?", fontsize=8)
    box(ax, 5.8, 8.4, 2.2, 0.5, "401 Invalid\nCredentials ❌", C["red_light"], fontsize=8)
    diamond(ax, 3.0, 7.4, 2.8, 0.65, "bcrypt verify\npassword hash?", fontsize=8)
    box(ax, 5.8, 7.4, 2.2, 0.5, "401 Invalid\nCredentials ❌", C["red_light"], fontsize=8)
    box(ax, 3.0, 6.4, 2.8, 0.65, "Generate JWT Token\n96-char hex secret\nExpiry: 8 hours\nPayload: user_id, role, companies", C["green_light"], fontsize=8)
    box(ax, 3.0, 5.4, 2.8, 0.55, "Save to localStorage\ntoken + user info", C["blue_light"], fontsize=8.5)
    box(ax, 3.0, 4.6, 2.8, 0.55, "INSERT audit_log\naction = LOGIN", C["gray_light"], fontsize=8)
    box(ax, 3.0, 3.8, 2.8, 0.55, "Redirect to\n/dashboard ✅", C["green_dark"], fontsize=9, bold=True)

    arr(ax, 3.0, 12.52, 3.0, 12.38)
    arr(ax, 3.0, 11.82, 3.0, 11.48)
    arr(ax, 3.0, 10.92, 3.0, 10.58)
    arr(ax, 3.0, 10.02, 3.0, 9.72)
    arr(ax, 3.0, 9.07, 3.0, 8.72, label="✅ OK")
    arr(ax, 4.4, 9.4, 4.7, 9.4, label="❌ Limit")
    arr(ax, 3.0, 8.07, 3.0, 7.72, label="✅ Found")
    arr(ax, 4.4, 8.4, 4.7, 8.4, label="❌ Not found")
    arr(ax, 3.0, 7.07, 3.0, 6.73, label="✅ Match")
    arr(ax, 4.4, 7.4, 4.7, 7.4, label="❌ Wrong")
    arr(ax, 3.0, 6.07, 3.0, 5.68)
    arr(ax, 3.0, 5.12, 3.0, 4.88)
    arr(ax, 3.0, 4.32, 3.0, 4.08)

    # === TOKEN VERIFY (middle) ===
    ax.text(8.5, 13.3, "─── Token Validation ───", ha="center", fontsize=9,
            color=C["blue"], fontweight="bold")
    box(ax, 8.5, 12.7, 3.0, 0.55, "ProtectedRoute\nChecks localStorage token", C["blue_light"], fontsize=8.5)
    diamond(ax, 8.5, 11.8, 3.0, 0.65, "Token exists?", fontsize=8.5)
    box(ax, 11.5, 11.8, 2.5, 0.5, "Redirect\n→ /login", C["red_light"], fontsize=8.5)
    box(ax, 8.5, 10.8, 3.0, 0.55, "GET /api/auth/verify\n(Bearer token header)", C["blue_dark"], fontsize=8.5, bold=True)
    diamond(ax, 8.5, 9.8, 3.0, 0.65, "Token in\nrevoked_tokens?", fontsize=8)
    box(ax, 11.5, 9.8, 2.5, 0.55, "Clear localStorage\nRedirect /login ❌", C["red_light"], fontsize=8)
    box(ax, 8.5, 8.8, 3.0, 0.65, "✅ Enter Application\nMainLayout renders\nSidebar + Topbar + Content", C["green_dark"], fontsize=8.5, bold=True)

    arr(ax, 8.5, 12.42, 8.5, 12.12)
    arr(ax, 8.5, 11.47, 8.5, 11.08, label="✅ Has token")
    arr(ax, 10.0, 11.8, 10.25, 11.8, label="❌ No token")
    arr(ax, 8.5, 10.47, 8.5, 10.12)
    arr(ax, 8.5, 9.47, 8.5, 9.13, label="❌ Valid")
    arr(ax, 10.0, 9.8, 10.25, 9.8, label="✅ Revoked")

    # === FORGOT PASSWORD (right) ===
    ax.text(14.5, 13.3, "─── Forgot Password ───", ha="center", fontsize=9,
            color=C["purple"], fontweight="bold")
    box(ax, 14.5, 12.7, 3.0, 0.55, "Click Forgot Password\n→ /forgot-password", C["purple_light"], fontsize=8.5)
    box(ax, 14.5, 11.8, 3.0, 0.65, "Enter Email\nPOST /api/auth/forgot-password\nRate: 3 requests / hour", C["purple_light"], fontsize=8)
    box(ax, 14.5, 10.8, 3.0, 0.55, "Generate reset_token\nSave to users table\n(expires in 1 hour)", C["gray_light"], fontsize=8)
    box(ax, 14.5, 9.9, 3.0, 0.55, "📧 Send email\nvia Nodemailer\nwith reset link", C["purple_light"], fontsize=8.5)
    box(ax, 14.5, 9.0, 3.0, 0.55, "User clicks link\n→ /reset-password?token=xxx", C["blue_light"], fontsize=8.5)
    box(ax, 14.5, 8.1, 3.0, 0.65, "Enter new password\nPOST /api/auth/reset-password\nvalidatePassword() checks\nbcrypt hash rounds=12", C["green_light"], fontsize=8)
    box(ax, 14.5, 7.1, 3.0, 0.55, "Redirect → /login\n✅ Password changed", C["green_dark"], fontsize=8.5, bold=True)

    arr(ax, 14.5, 12.42, 14.5, 12.08)
    arr(ax, 14.5, 11.47, 14.5, 11.08)
    arr(ax, 14.5, 10.47, 14.5, 10.18)
    arr(ax, 14.5, 9.62, 14.5, 9.28)
    arr(ax, 14.5, 8.72, 14.5, 8.43)
    arr(ax, 14.5, 7.77, 14.5, 7.38)

    # === LOGOUT (bottom middle) ===
    ax.text(8.5, 7.5, "─── Logout ───", ha="center", fontsize=9,
            color=C["red"], fontweight="bold")
    box(ax, 8.5, 6.9, 3.0, 0.55, "User clicks Logout button", C["red_light"], fontsize=8.5)
    box(ax, 8.5, 6.0, 3.0, 0.65, "POST /api/auth/logout\nINSERT revoked_tokens\n(DB-backed, persists restarts)\nExpiry matches JWT exp", C["red_light"], fontsize=8)
    box(ax, 8.5, 5.1, 3.0, 0.55, "INSERT audit_log\naction = LOGOUT", C["gray_light"], fontsize=8)
    box(ax, 8.5, 4.2, 3.0, 0.55, "Clear localStorage\nRedirect → /login", C["blue_light"], fontsize=8.5)

    arr(ax, 8.5, 7.62, 8.5, 7.18)
    arr(ax, 8.5, 6.67, 8.5, 6.33)
    arr(ax, 8.5, 5.67, 8.5, 5.38)
    arr(ax, 8.5, 4.82, 8.5, 4.48)

    save(fig, "02_authentication.png")


# ══════════════════════════════════════════════════════════
#  CHART 3: ROLE-BASED ACCESS CONTROL
# ══════════════════════════════════════════════════════════
def chart_rbac():
    fig, ax = plt.subplots(figsize=(18, 12))
    ax.set_xlim(0, 18); ax.set_ylim(0, 12)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    title_box(ax, "3. Role-Based Access Control (RBAC) — ສິດການໃຊ້ງານ",
              "Super Admin · Company Admin · Route Guards · Approval Workflow")

    # Center decision
    diamond(ax, 9.0, 10.5, 3.2, 0.8, "User Role?", color=C["yellow_light"], fontsize=10)
    arr(ax, 9.0, 10.1, 9.0, 10.5-0.4-0.05)  # down arrow into diamond

    box(ax, 9.0, 11.2, 2.8, 0.55, "👤 Logged-in User", C["blue_dark"], fontsize=10, bold=True)

    # Super Admin column
    box(ax, 3.5, 9.3, 3.2, 0.7, "🔴 Super Admin", C["red"], fontsize=11, bold=True)
    sa_items = [
        (3.5, 8.4, "✅ Dashboard\n(ທຸກບໍລິສັດ)", C["green_light"]),
        (3.5, 7.5, "✅ Companies\n(CRUD ໂດຍກົງ)", C["green_light"]),
        (3.5, 6.6, "✅ Employees\n(CRUD ໂດຍກົງ, ບໍ່ຕ້ອງຂໍ)", C["green_light"]),
        (3.5, 5.7, "✅ Import\n(ອະນຸມັດ Batch ຂອງ Admin)", C["green_light"]),
        (3.5, 4.8, "✅ Users & Roles\n(CRUD ຜູ້ໃຊ້ງານ)", C["green_light"]),
        (3.5, 3.9, "✅ Audit Log\n(ເບິ່ງທຸກ activity)", C["green_light"]),
        (3.5, 3.0, "✅ Import Approval\n(ຈັດການ requests)", C["green_light"]),
        (3.5, 2.1, "✅ ID Cards, Building\nReports, Settings, Notifications", C["green_light"]),
    ]
    for sx, sy, st, sc in sa_items:
        box(ax, sx, sy, 3.2, 0.65, st, sc, fontsize=8)
        if sy < 9.3:
            arr(ax, sx, sy+0.325, sx, sy-0.325)

    # Company Admin column
    box(ax, 14.5, 9.3, 3.2, 0.7, "🔵 Company Admin", C["blue"], fontsize=11, bold=True)
    ca_items = [
        (14.5, 8.4, "✅ Dashboard\n(ສະເພາະບໍລິສັດຕົນ)", C["blue_light"]),
        (14.5, 7.5, "⚠️ Companies\n(ແກ້ໄຂຕ້ອງຂໍອະນຸມັດ)", C["yellow_light"]),
        (14.5, 6.6, "⚠️ Employees\n(Add/Edit/Delete\nຕ້ອງຜ່ານ approval)", C["yellow_light"]),
        (14.5, 5.7, "⚠️ Import\n(ສ້າງ batch, status=pending)", C["yellow_light"]),
        (14.5, 4.8, "❌ Users & Roles\n(ບໍ່ອະນຸຍາດ)", C["red_light"]),
        (14.5, 3.9, "❌ Audit Log\n(ບໍ່ອະນຸຍາດ)", C["red_light"]),
        (14.5, 3.0, "❌ Import Approval\n(ບໍ່ອະນຸຍາດ)", C["red_light"]),
        (14.5, 2.1, "✅ ID Cards, Building\nReports, Settings, Notifications", C["blue_light"]),
    ]
    for sx, sy, st, sc in ca_items:
        box(ax, sx, sy, 3.2, 0.65, st, sc, fontsize=8)
        if sy < 9.3:
            arr(ax, sx, sy+0.325, sx, sy-0.325)

    # Arrows from diamond to roles
    arr(ax, 7.4, 10.5, 5.1, 9.65, label="Super Admin", color=C["red"])
    arr(ax, 10.6, 10.5, 12.9, 9.65, label="Company Admin", color=C["blue"])

    # RoleRoute guard box
    box(ax, 9.0, 4.2, 3.8, 0.8,
        "🛡️ RoleRoute Guard\n(Frontend + Backend)\nGuards: /users · /audit · /import-approval\nMiddleware: allow('Super Admin')",
        C["red_light"], fontsize=8)
    ax.annotate("", xy=(14.5, 4.47), xytext=(10.9, 4.2),
                arrowprops=dict(arrowstyle="-|>", color=C["red"], lw=1.5,
                                connectionstyle="arc3,rad=0.2"), zorder=2)
    ax.text(12.7, 4.55, "Block ❌", fontsize=8, color=C["red"], ha="center")

    # Legend
    legends = [
        (C["green_light"], C["green_dark"], "✅ Full Access"),
        (C["yellow_light"], C["yellow"], "⚠️ Needs Approval"),
        (C["red_light"], C["red"], "❌ Not Allowed"),
    ]
    for i, (fc, ec, lbl) in enumerate(legends):
        px = 6.5 + i*2.2
        patch = FancyBboxPatch((px, 0.3), 1.8, 0.5,
                               boxstyle="round,pad=0.05",
                               facecolor=fc, edgecolor=ec, linewidth=1.2)
        ax.add_patch(patch)
        ax.text(px+0.9, 0.55, lbl, ha="center", va="center", fontsize=8, color=ec, fontweight="bold")

    save(fig, "03_role_access.png")


# ══════════════════════════════════════════════════════════
#  CHART 4: NAVIGATION MAP
# ══════════════════════════════════════════════════════════
def chart_navigation():
    fig, ax = plt.subplots(figsize=(20, 14))
    ax.set_xlim(0, 20); ax.set_ylim(0, 14)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    title_box(ax, "4. Main Navigation Map — ໜ້າທັງໝົດໃນລະບົບ",
              "React Router v6 · Protected Routes · Role Guards · URL Structure")

    # ROOT
    box(ax, 10.0, 13.2, 3.0, 0.6, "App Root\nBrowserRouter", C["blue_dark"], fontsize=9, bold=True)

    # Public routes
    box(ax, 3.0, 12.2, 2.8, 0.6, "Public Routes\n(No login required)", C["gray_light"], fontsize=8.5)
    arr(ax, 7.7, 13.2, 4.4, 12.5)

    pubs = [("/login\nLogin Page", 1.5, 11.1),
            ("/forgot-password\nForgot Password", 3.0, 11.1),
            ("/reset-password\nReset Password", 4.8, 11.1)]
    for t, px, py in pubs:
        box(ax, px, py, 1.65, 0.55, t, C["blue_light"], fontsize=7.5)
        arr(ax, px, 11.9, px, 11.38)

    # ProtectedRoute
    box(ax, 14.5, 12.2, 3.2, 0.6, "ProtectedRoute\n(JWT check)", C["green_dark"], fontsize=9, bold=True)
    arr(ax, 11.5, 13.2, 13.1, 12.5)

    # MainLayout
    box(ax, 14.5, 11.1, 3.2, 0.6, "MainLayout\nSidebar + Topbar", C["green_light"], fontsize=9)
    arr(ax, 14.5, 11.9, 14.5, 11.4)

    # All protected pages
    pages = [
        # (label, x, y, color)
        ("/ (index)\n/dashboard\nDashboard", 7.0, 10.0, C["blue_light"]),
        ("/companies\nCompany List", 9.5, 10.0, C["blue_light"]),
        ("/companies/:id\nCompany Profile", 12.0, 10.0, C["blue_light"]),
        ("/employees\nEmployee List", 14.5, 10.0, C["blue_light"]),
        ("/employees/add\nAdd Employee", 17.0, 10.0, C["blue_light"]),
        ("/employees/edit/:id\nEdit Employee", 19.5, 10.0, C["blue_light"]),

        ("/employees/:id\nEmployee Detail", 7.0, 8.7, C["green_light"]),
        ("/employees/:id/card\nEmployee Card Detail", 9.8, 8.7, C["green_light"]),
        ("/idcard\nID Card List", 12.5, 8.7, C["green_light"]),
        ("/idcard/request\nCard Request Form", 15.0, 8.7, C["green_light"]),
        ("/idcard/request/preview\nPreview Request", 17.5, 8.7, C["green_light"]),
        ("/idcard/request/success\nRequest Success", 19.5, 8.7, C["green_light"]),

        ("/building\nBuilding Mgmt", 7.0, 7.4, C["yellow_light"]),
        ("/reports\nReports", 9.5, 7.4, C["yellow_light"]),
        ("/import\nImport Excel", 12.0, 7.4, C["yellow_light"]),
        ("/settings\nSettings", 14.5, 7.4, C["yellow_light"]),
    ]
    for t, px, py, fc in pages:
        box(ax, px, py, 2.35, 0.75, t, fc, fontsize=7.5)
        arr(ax, 14.5, 10.8, px, py+0.375)

    # Role-protected pages
    box(ax, 10.5, 6.0, 3.5, 0.6, "🔒 RoleRoute\nSuper Admin Only", C["red_light"], fontsize=9, bold=True)
    arr(ax, 14.5, 10.8, 10.5, 6.3)

    role_pages = [
        ("/users\nUser Management", 7.5, 5.0),
        ("/audit\nAudit Log", 10.5, 5.0),
        ("/import-approval\nImport Approval", 13.5, 5.0),
    ]
    for t, px, py in role_pages:
        box(ax, px, py, 2.5, 0.6, t, C["red_light"], fontsize=7.5)
        arr(ax, 10.5, 5.7, px, py+0.3)

    # Employee Detail Tabs
    box(ax, 7.0, 3.6, 2.35, 0.55, "Employee Detail\nTabs", C["green_dark"], fontsize=8.5, bold=True)
    arr(ax, 7.0, 8.325, 7.0, 3.88)
    tabs = [
        ("BasicInfoTab\nຂໍ້ມູນພື້ນຖານ", 4.5, 2.5),
        ("ProfileTab\nຮູບ/ທີ່ຢູ່/ຫ້ອງ", 6.5, 2.5),
        ("DocumentsTab\nເອກະສານ", 8.5, 2.5),
        ("PermitsTab\nໃບອະນຸຍາດ", 10.5, 2.5),
        ("TimelineTab\nປະຫວັດ", 12.5, 2.5),
    ]
    for t, px, py in tabs:
        box(ax, px, py, 1.8, 0.6, t, C["green_light"], fontsize=7.5)
        arr(ax, 7.0, 3.325, px, py+0.3)

    # Legend
    leg = [(C["blue_light"], "General Pages"),
           (C["green_light"], "Employee Related"),
           (C["yellow_light"], "Feature Modules"),
           (C["red_light"], "Super Admin Only")]
    for i, (fc, lbl) in enumerate(leg):
        px = 1.0 + i*3.5
        patch = FancyBboxPatch((px, 0.3), 3.0, 0.5,
                               boxstyle="round,pad=0.05",
                               facecolor=fc, edgecolor=C["gray"], linewidth=1.0)
        ax.add_patch(patch)
        ax.text(px+1.5, 0.55, lbl, ha="center", va="center", fontsize=8.5, color=C["text_dark"])

    save(fig, "04_navigation.png")


# ══════════════════════════════════════════════════════════
#  CHART 5: EMPLOYEE MANAGEMENT FLOW
# ══════════════════════════════════════════════════════════
def chart_employee():
    fig, ax = plt.subplots(figsize=(18, 15))
    ax.set_xlim(0, 18); ax.set_ylim(0, 15)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    title_box(ax, "5. Employee Management Flow — ຈັດການຂໍ້ມູນພະນັກງານ",
              "List · Add · Edit · Delete · View Detail · Export — Role-based behavior")

    # Entry
    box(ax, 9.0, 14.2, 3.5, 0.7, "📋 /employees\nEmployee List Page", C["blue_dark"], fontsize=10, bold=True)
    box(ax, 9.0, 13.2, 3.5, 0.65, "GET /api/employees\nPagination max 200\nFilters: company, status, search\nSoft-delete excluded", C["blue_light"], fontsize=8)
    arr(ax, 9.0, 13.85, 9.0, 13.53)

    diamond(ax, 9.0, 12.1, 3.8, 0.8, "Action?", fontsize=10)
    arr(ax, 9.0, 12.85, 9.0, 12.5)

    # Action branches
    actions = [
        ("➕ Add New", 2.0, 11.0, C["green_light"]),
        ("✏️ Edit", 5.2, 11.0, C["yellow_light"]),
        ("👁️ View Detail", 9.0, 11.0, C["blue_light"]),
        ("🗑️ Delete", 12.8, 11.0, C["red_light"]),
        ("📤 Export CSV", 16.5, 11.0, C["purple_light"]),
    ]
    for t, px, py, fc in actions:
        box(ax, px, py, 2.5, 0.65, t, fc, fontsize=9)
        arr(ax, 9.0, 11.7, px, py+0.325)

    # ADD path
    box(ax, 2.0, 9.8, 2.5, 0.65, "/employees/add\nAdd Employee Form", C["green_light"], fontsize=8)
    box(ax, 2.0, 8.8, 2.5, 0.75, "Form Fields:\n• Code, Name, Gender, DOB\n• Company, Position, Status\n• Hired Date, Contact, Email\n• Photo → Cloudinary upload\n• Province/District/Village\n• Dorm: Building/Room\n• Office: Building/Floor/Room", C["gray_light"], fontsize=7.5)
    arr(ax, 2.0, 10.68, 2.0, 10.13)
    arr(ax, 2.0, 10.68, 2.0, 9.18+0.4)  # fix this
    arr(ax, 2.0, 10.33, 2.0, 9.18)

    # EDIT path
    box(ax, 5.2, 9.8, 2.5, 0.55, "/employees/edit/:id\nEdit Employee Form", C["yellow_light"], fontsize=8)
    box(ax, 5.2, 9.0, 2.5, 0.55, "Load existing data\nSame form as Add", C["gray_light"], fontsize=8)
    arr(ax, 5.2, 10.68, 5.2, 10.08)
    arr(ax, 5.2, 9.52, 5.2, 9.28)

    # Submit → Role check
    box(ax, 3.6, 7.8, 3.0, 0.55, "Submit Form", C["blue_dark"], fontsize=9, bold=True)
    arr(ax, 2.0, 8.42, 2.0, 8.08)
    arr(ax, 2.0, 8.08, 3.6, 8.08)
    arr(ax, 5.2, 8.72, 5.2, 8.08)
    arr(ax, 5.2, 8.08, 3.6, 8.08)

    diamond(ax, 3.6, 7.0, 3.2, 0.65, "User Role?", fontsize=8.5)
    arr(ax, 3.6, 7.52, 3.6, 7.325)

    # Super Admin direct
    box(ax, 1.5, 6.0, 2.5, 0.65, "POST/PUT\n/api/employees\nDirect DB write\n+ audit_log INSERT", C["green_light"], fontsize=8)
    box(ax, 1.5, 5.0, 2.5, 0.55, "✅ ສຳເລັດທັນທີ\nNotification toast", C["green_dark"], fontsize=8.5, bold=True)
    arr(ax, 2.2, 7.0, 1.5, 6.33, label="Super Admin")
    arr(ax, 1.5, 5.67, 1.5, 5.28)

    # Company Admin pending
    box(ax, 5.5, 6.0, 2.5, 0.65, "POST /api/approvals\nrequest_type: edit\nentity_type: employee\nold_data & new_data", C["yellow_light"], fontsize=8)
    box(ax, 5.5, 5.0, 2.5, 0.55, "⏳ Pending\nNotification ສົ່ງ Super Admin", C["yellow_light"], fontsize=8)
    arr(ax, 5.0, 7.0, 5.5, 6.33, label="Company Admin")
    arr(ax, 5.5, 5.67, 5.5, 5.28)

    diamond(ax, 5.5, 4.1, 3.0, 0.65, "Super Admin\nDecision?", fontsize=8)
    arr(ax, 5.5, 4.72, 5.5, 4.43)

    box(ax, 3.8, 3.2, 2.2, 0.55, "✅ Approved\nExecute + Notify CA", C["green_light"], fontsize=8)
    box(ax, 7.5, 3.2, 2.2, 0.55, "❌ Rejected\nEmail + Notification\n(with reason)", C["red_light"], fontsize=8)
    arr(ax, 4.0, 4.1, 3.8, 3.48, label="Approve ✅")
    arr(ax, 7.0, 4.1, 7.5, 3.48, label="Reject ❌")

    # VIEW DETAIL path
    box(ax, 9.0, 9.8, 2.5, 0.55, "/employees/:id\nEmployee Detail", C["blue_light"], fontsize=8)
    box(ax, 9.0, 8.8, 2.5, 1.1, "Tabs:\n1️⃣ Basic Info\n2️⃣ Profile (avatar/address/room)\n3️⃣ Documents (PDF/image)\n4️⃣ Permits (visa/work permit)\n5️⃣ Timeline (history)", C["gray_light"], fontsize=7.5)
    arr(ax, 9.0, 10.68, 9.0, 10.08)
    arr(ax, 9.0, 9.52, 9.0, 9.35)

    # DELETE path
    box(ax, 12.8, 9.8, 2.5, 0.55, "Confirm Delete\nDialog", C["red_light"], fontsize=8)
    diamond(ax, 12.8, 8.8, 2.8, 0.65, "User Role?", fontsize=8)
    box(ax, 11.0, 7.8, 2.2, 0.65, "Soft Delete\nUPDATE deleted_at\n= NOW()", C["green_light"], fontsize=8)
    box(ax, 14.5, 7.8, 2.2, 0.65, "POST /api/approvals\nrequest_type:\n'delete'", C["yellow_light"], fontsize=8)
    arr(ax, 12.8, 10.68, 12.8, 10.08)
    arr(ax, 12.8, 9.52, 12.8, 9.13)
    arr(ax, 11.4, 8.8, 11.0, 8.13, label="Super\nAdmin")
    arr(ax, 14.2, 8.8, 14.5, 8.13, label="Company\nAdmin")

    # EXPORT path
    box(ax, 16.5, 9.8, 2.5, 0.65, "Export CSV\nCurrent filtered data\n(max 200 rows)", C["purple_light"], fontsize=8)
    box(ax, 16.5, 8.8, 2.5, 0.55, "Download .csv file\nбраузер saves file", C["purple_light"], fontsize=8)
    arr(ax, 16.5, 10.68, 16.5, 10.08)
    arr(ax, 16.5, 9.52, 16.5, 9.08)

    save(fig, "05_employee_management.png")


# ══════════════════════════════════════════════════════════
#  CHART 6: APPROVAL WORKFLOW
# ══════════════════════════════════════════════════════════
def chart_approval():
    fig, ax = plt.subplots(figsize=(16, 14))
    ax.set_xlim(0, 16); ax.set_ylim(0, 14)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    title_box(ax, "6. Approval Workflow — ຂັ້ນຕອນການຂໍ ແລະ ອະນຸມັດ",
              "Company Admin requests → Super Admin approves/rejects → Email notification")

    # Actors
    box(ax, 3.5, 13.2, 3.0, 0.65, "👤 Company Admin", C["blue"], fontsize=11, bold=True)
    box(ax, 12.5, 13.2, 3.0, 0.65, "🔴 Super Admin", C["red"], fontsize=11, bold=True)

    # Dashed swimlane lines
    for x in [7.0, 9.0]:
        ax.plot([x, x], [0.5, 13.9], '--', color=C["gray_light"], lw=1.5, zorder=0)

    ax.text(3.5, 0.25, "Company Admin Side", ha="center", fontsize=9, color=C["blue"], fontweight="bold")
    ax.text(12.5, 0.25, "Super Admin Side", ha="center", fontsize=9, color=C["red"], fontweight="bold")
    ax.text(8.0, 0.25, "System / API", ha="center", fontsize=9, color=C["gray"], fontweight="bold")

    # === Step 1: Company Admin creates request ===
    section_label(ax, 8.0, 12.5, 15.5, "STEP 1 — ສ້າງ Request", C["blue"])
    box(ax, 3.5, 11.8, 3.0, 0.65, "Edits or deletes\nEmployee/Company\n(Company Admin)", C["blue_light"], fontsize=8.5)
    box(ax, 8.0, 11.8, 3.2, 0.65, "POST /api/approvals\n{request_type, entity_type,\n entity_id, old_data, new_data}\nINSERT status='pending'", C["gray_light"], fontsize=8)
    box(ax, 8.0, 10.8, 3.2, 0.55, "INSERT notifications\nINFORM Super Admin\n(in-app bell icon)", C["gray_light"], fontsize=8)
    arr(ax, 3.5, 11.8, 6.4, 11.8)
    arr(ax, 8.0, 11.47, 8.0, 11.08)
    arr(ax, 3.5, 11.47, 3.5, 11.2)
    box(ax, 3.5, 10.8, 3.0, 0.55, "⏳ Status: PENDING\nWaiting for approval", C["yellow_light"], fontsize=8.5)
    arr(ax, 6.4, 10.8, 5.0, 10.8)

    # === Step 2: Super Admin reviews ===
    section_label(ax, 8.0, 10.1, 15.5, "STEP 2 — ກວດສອບ Request", C["yellow"])
    box(ax, 12.5, 9.5, 3.0, 0.65, "GET /import-approval page\nView pending requests list\nFilter by type/status", C["red_light"], fontsize=8)
    box(ax, 8.0, 9.5, 3.2, 0.55, "GET /api/approvals\nReturn list of\npending requests", C["gray_light"], fontsize=8)
    arr(ax, 12.5, 9.5, 11.2, 9.5)

    box(ax, 12.5, 8.5, 3.0, 0.65, "Review each request:\n• old_data vs new_data\n• Requester info\n• Entity details", C["red_light"], fontsize=8)
    arr(ax, 12.5, 9.17, 12.5, 8.83)

    diamond(ax, 12.5, 7.5, 3.2, 0.8, "Decision?\n(Single or Bulk)", fontsize=8.5)
    arr(ax, 12.5, 8.17, 12.5, 7.9)

    # === Step 3a: Approve ===
    section_label(ax, 8.0, 6.7, 15.5, "STEP 3A — ອະນຸມັດ (Approve)", C["green_dark"])
    box(ax, 12.5, 6.2, 3.0, 0.55, "PATCH /api/approvals/:id/approve\nor POST /bulk-approve\n{ids: [1,2,3...]}", C["green_light"], fontsize=7.5)
    box(ax, 8.0, 6.2, 3.2, 0.65, "Execute action:\n• UPDATE employees SET...\n• UPDATE companies SET...\n• Soft delete if request='delete'\nINSERT audit_log", C["green_light"], fontsize=7.5)
    box(ax, 8.0, 5.3, 3.2, 0.55, "INSERT notifications\n✅ ສົ່ງຫາ Company Admin\nsendApprovalResult(approved=true)", C["green_light"], fontsize=7.5)
    box(ax, 3.5, 5.3, 3.0, 0.55, "📬 Receive notification\n✅ ອີເມວ + In-app bell\n'Approved!'", C["green_light"], fontsize=8)
    arr(ax, 11.1, 7.5, 12.5, 6.48, label="✅ Approve", color=C["green_dark"])
    arr(ax, 12.5, 5.93, 12.5, 5.93)
    arr(ax, 11.6, 6.2, 11.2, 6.2)
    arr(ax, 8.0, 5.93, 8.0, 5.58)
    arr(ax, 6.4, 5.3, 5.0, 5.3)

    # === Step 3b: Reject ===
    section_label(ax, 8.0, 4.5, 15.5, "STEP 3B — ປະຕິເສດ (Reject)", C["red"])
    box(ax, 12.5, 3.9, 3.0, 0.55, "PATCH /api/approvals/:id/reject\n{reason: 'ເຫດຜົນ'}\nor POST /bulk-reject", C["red_light"], fontsize=7.5)
    box(ax, 8.0, 3.9, 3.2, 0.55, "UPDATE status='rejected'\nStore reject_reason\nINSERT notifications\nsendApprovalResult(false)", C["red_light"], fontsize=7.5)
    box(ax, 3.5, 3.9, 3.0, 0.65, "📬 Receive notification\n❌ ອີເມວ + In-app bell\n'Rejected + Reason'\nCan re-submit request", C["red_light"], fontsize=7.5)
    arr(ax, 13.9, 7.5, 12.5, 4.18, label="❌ Reject", color=C["red"])
    arr(ax, 11.6, 3.9, 11.2, 3.9)
    arr(ax, 6.4, 3.9, 5.0, 3.9)

    # Request types
    box(ax, 8.0, 2.5, 9.5, 0.8,
        "📋 Request Types: edit (single edit) | delete (single delete) | bulk_delete (multiple delete) | import_batch (Excel import)",
        C["gray_light"], fontsize=8)

    save(fig, "06_approval_workflow.png")


# ══════════════════════════════════════════════════════════
#  CHART 7: IMPORT FLOW
# ══════════════════════════════════════════════════════════
def chart_import():
    fig, ax = plt.subplots(figsize=(16, 14))
    ax.set_xlim(0, 16); ax.set_ylim(0, 14)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    title_box(ax, "7. Excel Import Flow — ນຳເຂົ້າຂໍ້ມູນ Excel",
              "Download Template → Fill Data → Upload → Preview → Approve → Commit to DB")

    # Step boxes
    steps = [
        (8.0, 13.0, "🏁 /import page\nImport Employee", C["blue_dark"], True),
        (8.0, 12.0, "⬇️ Download Template\nGET /api/import/template\n(.xlsx file with column guide)", C["blue_light"], False),
        (8.0, 10.9, "📝 Fill in Excel file\nSupported columns (Lao + English):\nemployee_code · firstname · lastname\ngender · company · position · status\nhired_at · contact · email · DOB...", C["gray_light"], False),
        (8.0, 9.7, "📤 Upload .xlsx file\nPOST /api/import/preview\n(multipart form-data)", C["blue_dark"], True),
        (8.0, 8.7, "🔍 Server Parse Excel\nExcelJS library\nColumn alias matching (Lao ↔ English)\nFuzzy column name detection\nMap → standard field names", C["gray_light"], False),
        (8.0, 7.6, "👁️ Preview Table\n(Show N rows)\nHighlight errors/warnings\nColumn mapping display", C["yellow_light"], False),
    ]
    for sx, sy, st, sc, sb in steps:
        box(ax, sx, sy, 8.0, 0.75 if "\n" in st and st.count("\n") > 2 else 0.6, st, sc, fontsize=8, bold=sb)

    arr(ax, 8.0, 12.68, 8.0, 12.33)
    arr(ax, 8.0, 11.67, 8.0, 11.27)
    arr(ax, 8.0, 10.52, 8.0, 10.02)
    arr(ax, 8.0, 9.37, 8.0, 9.02)
    arr(ax, 8.0, 8.37, 8.0, 7.93)

    # Role check diamond
    diamond(ax, 8.0, 6.6, 3.5, 0.8, "User Role?", fontsize=9)
    arr(ax, 8.0, 7.27, 8.0, 7.0)

    # Super Admin path
    box(ax, 3.5, 5.6, 3.5, 0.65, "Super Admin:\nPOST /api/import/commit\n(ໂດຍກົງ)", C["green_light"], fontsize=8)
    box(ax, 3.5, 4.6, 3.5, 0.75, "🔄 SAVEPOINT Transaction\n(row-level isolation)\nFor each row:\n• Check duplicate (employee_code)\n• INSERT employees\n• SAVEPOINT → rollback single row on error", C["gray_light"], fontsize=7.5)
    box(ax, 3.5, 3.5, 3.5, 0.65, "✅ Import Complete\n{inserted: N, skipped: K,\n errors: [{row, reason}]}", C["green_dark"], fontsize=8, bold=True)
    arr(ax, 6.25, 6.6, 3.5, 5.93, label="Super Admin")
    arr(ax, 3.5, 5.27, 3.5, 4.98)
    arr(ax, 3.5, 4.22, 3.5, 3.83)

    # Company Admin path
    box(ax, 12.5, 5.6, 3.5, 0.65, "Company Admin:\nPOST /api/import/submit\n(ສ້າງ import_batch)", C["yellow_light"], fontsize=8)
    box(ax, 12.5, 4.6, 3.5, 0.65, "INSERT import_batches\nstatus = 'pending'\nStore rows as JSONB\nNotify Super Admin", C["yellow_light"], fontsize=8)
    box(ax, 12.5, 3.6, 3.5, 0.65, "⏳ Waiting for\nSuper Admin approval\n/import-approval page", C["yellow_light"], fontsize=8)

    # Super Admin reviews batch
    box(ax, 12.5, 2.6, 3.5, 0.65, "Super Admin reviews\nImportBatchReviewModal\nPreview rows + column data", C["red_light"], fontsize=8)
    diamond(ax, 12.5, 1.6, 3.2, 0.65, "Decision?", fontsize=8.5)
    arr(ax, 9.75, 6.6, 12.5, 5.93, label="Company Admin")
    arr(ax, 12.5, 5.27, 12.5, 4.93)
    arr(ax, 12.5, 4.27, 12.5, 3.93)
    arr(ax, 12.5, 3.27, 12.5, 2.93)
    arr(ax, 12.5, 2.27, 12.5, 1.93)

    # Decision arrows
    ax.annotate("", xy=(3.5, 3.5+0.2), xytext=(10.9, 1.6),
                arrowprops=dict(arrowstyle="-|>", color=C["green_dark"], lw=1.5,
                                connectionstyle="arc3,rad=-0.3"), zorder=2)
    ax.text(7.0, 2.8, "✅ Approve\n→ Commit", fontsize=8, color=C["green_dark"], ha="center")
    box(ax, 12.5, 0.6, 3.5, 0.55, "❌ Reject batch\nNotify Company Admin", C["red_light"], fontsize=8)
    arr(ax, 14.1, 1.6, 14.1, 0.88, label="Reject ❌")

    # After import
    box(ax, 3.5, 2.5, 3.5, 0.55, "INSERT audit_log\nINSERT notifications\nUpdate import_batch status", C["gray_light"], fontsize=7.5)
    arr(ax, 3.5, 3.17, 3.5, 2.78)

    save(fig, "07_import_flow.png")


# ══════════════════════════════════════════════════════════
#  CHART 8: ID CARD FLOW
# ══════════════════════════════════════════════════════════
def chart_idcard():
    fig, ax = plt.subplots(figsize=(16, 13))
    ax.set_xlim(0, 16); ax.set_ylim(0, 13)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    title_box(ax, "8. ID Card Flow — ບັດພະນັກງານ",
              "Request · Preview · Issue · Print · Return — employee_card table")

    box(ax, 8.0, 12.2, 4.0, 0.7, "📋 /idcard page\nID Card List (Grid View)", C["blue_dark"], fontsize=10, bold=True)
    box(ax, 8.0, 11.3, 4.0, 0.65, "GET /api/idcard\nFilter: company, status, search\nGrid of employee cards + status badges", C["blue_light"], fontsize=8.5)
    arr(ax, 8.0, 11.88, 8.0, 11.63)

    diamond(ax, 8.0, 10.3, 4.2, 0.8, "Action?", fontsize=10)
    arr(ax, 8.0, 10.97, 8.0, 10.7)

    # Action branches
    box(ax, 2.0, 9.3, 2.5, 0.65, "➕ Request\nNew Card", C["green_light"], fontsize=9)
    box(ax, 8.0, 9.3, 2.5, 0.65, "🔍 View Card\nDetail", C["blue_light"], fontsize=9)
    box(ax, 14.0, 9.3, 2.5, 0.65, "🖨️ Multi-Print\n(Batch print)", C["purple_light"], fontsize=9)
    arr(ax, 5.9, 10.3, 2.0, 9.63, label="Request")
    arr(ax, 8.0, 9.9, 8.0, 9.63, label="View")
    arr(ax, 10.1, 10.3, 14.0, 9.63, label="Multi-select")

    # REQUEST path
    box(ax, 2.0, 8.2, 2.8, 0.65, "/idcard/request\nCardRequestForm\nSearch employee by name/code", C["green_light"], fontsize=8)
    box(ax, 2.0, 7.2, 2.8, 0.75, "Configure Card:\n• Card Number (auto/manual)\n• Issue Date\n• Card Color (hex picker)\n• Company auto-filled", C["gray_light"], fontsize=8)
    box(ax, 2.0, 6.1, 2.8, 0.65, "/idcard/request/preview\nPreview Request Page\nShow card layout", C["yellow_light"], fontsize=8.5)
    box(ax, 2.0, 5.1, 2.8, 0.65, "Confirm Details\nFinal check before issue", C["gray_light"], fontsize=8)
    box(ax, 2.0, 4.1, 2.8, 0.75, "POST /api/idcard\nINSERT employee_card:\n{card_no, company_id,\n status='Active',\n issued_at, issued_by,\n card_color}", C["green_light"], fontsize=7.5)
    box(ax, 2.0, 3.0, 2.8, 0.65, "/idcard/request/success\n✅ Card Issued!\nSuccess confirmation", C["green_dark"], fontsize=8.5, bold=True)
    arr(ax, 2.0, 8.87, 2.0, 8.53)
    arr(ax, 2.0, 7.87, 2.0, 7.58)
    arr(ax, 2.0, 6.83, 2.0, 6.43)
    arr(ax, 2.0, 5.77, 2.0, 5.43)
    arr(ax, 2.0, 4.73, 2.0, 4.48)
    arr(ax, 2.0, 3.73, 2.0, 3.33)

    # VIEW path
    box(ax, 8.0, 8.2, 2.8, 0.65, "/employees/:id/card\nEmployeeCardDetail", C["blue_light"], fontsize=8)
    box(ax, 8.0, 7.2, 2.8, 0.75, "Card Info Display:\n• Card Number\n• Issue Date / Print Date\n• Status: Active/Returned\n• Issued By user", C["gray_light"], fontsize=8)

    diamond(ax, 8.0, 6.1, 3.0, 0.75, "Card Action?", fontsize=8.5)
    box(ax, 5.8, 5.0, 2.5, 0.75, "🖨️ Print Card\nHTML → window.print()\nPrint dialog opens\nCard layout A6 size", C["purple_light"], fontsize=8)
    box(ax, 10.3, 5.0, 2.5, 0.75, "↩️ Return Card\nPATCH /api/idcard/:id/return\nUPDATE status='Returned'\n(for resigned employees)", C["yellow_light"], fontsize=8)
    arr(ax, 8.0, 8.87, 8.0, 8.53)
    arr(ax, 8.0, 7.87, 8.0, 6.48)
    arr(ax, 6.5, 6.1, 5.8, 5.38, label="Print")
    arr(ax, 9.5, 6.1, 10.3, 5.38, label="Return")

    # Print layout detail
    box(ax, 5.8, 3.8, 2.5, 0.75, "Print Layout:\n• Employee photo (Cloudinary)\n• Name + Position\n• Company name\n• Card No + QR Code\n• Card Color themed", C["purple_light"], fontsize=7.5)
    arr(ax, 5.8, 4.63, 5.8, 4.55)

    # MULTI-PRINT path
    box(ax, 14.0, 8.2, 2.8, 0.65, "Select multiple cards\nCheckbox multi-select\nFilter by company", C["purple_light"], fontsize=8)
    box(ax, 14.0, 7.1, 2.8, 0.65, "Print Selected\nbatch print dialog\nAll cards in one print job", C["purple_light"], fontsize=8)
    arr(ax, 14.0, 8.87, 14.0, 8.53)
    arr(ax, 14.0, 7.77, 14.0, 7.43)

    # Card statuses
    box(ax, 8.0, 2.0, 9.5, 0.75,
        "📊 Card Statuses: Active (ບັດໃຊ້ງານ) | Returned (ຄືນບັດ — ລາອອກ) | Lost/Damaged (optional)",
        C["gray_light"], fontsize=8.5)

    save(fig, "08_idcard_flow.png")


# ══════════════════════════════════════════════════════════
#  CHART 9: BUILDING MANAGEMENT
# ══════════════════════════════════════════════════════════
def chart_building():
    fig, ax = plt.subplots(figsize=(16, 12))
    ax.set_xlim(0, 16); ax.set_ylim(0, 12)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    title_box(ax, "9. Building Management Flow — ຈັດການອາຄານ ແລະ ຫ້ອງ",
              "Buildings · Floors · Rooms · Residents · Capacity Management")

    box(ax, 8.0, 11.2, 4.0, 0.7, "🏢 /building page\nBuilding Management", C["blue_dark"], fontsize=10, bold=True)
    box(ax, 8.0, 10.3, 4.0, 0.65, "GET /api/building\nBuilding list with summary cards\n(Total rooms, Occupied, Available)", C["blue_light"], fontsize=8.5)
    arr(ax, 8.0, 10.88, 8.0, 10.63)

    diamond(ax, 8.0, 9.3, 4.0, 0.8, "Action?", fontsize=9.5)
    arr(ax, 8.0, 9.97, 8.0, 9.7)

    # Left: View building
    box(ax, 3.5, 8.3, 3.0, 0.65, "Select Building\n→ Show Floors", C["blue_light"], fontsize=8.5)
    box(ax, 3.5, 7.3, 3.0, 0.65, "Select Floor\n→ Show Room Grid\n(all rooms on that floor)", C["blue_light"], fontsize=8.5)
    box(ax, 3.5, 6.2, 3.0, 0.75, "Room Detail Popup:\n• Room Number\n• Capacity (4 persons max)\n• Current Residents list\n• Room Status badge", C["yellow_light"], fontsize=8)

    diamond(ax, 3.5, 5.0, 3.2, 0.75, "Room Status?", fontsize=8)
    box(ax, 1.2, 3.9, 2.5, 0.65, "Available\n→ Add Resident\nSearch employee", C["green_light"], fontsize=8)
    box(ax, 3.5, 3.9, 2.5, 0.65, "Occupied\n→ View Residents\nRemove if needed", C["blue_light"], fontsize=8)
    box(ax, 5.8, 3.9, 2.5, 0.65, "Maintenance\n→ Show note\nChange status", C["yellow_light"], fontsize=8)

    arr(ax, 5.9, 9.3, 3.5, 8.63, label="Browse")
    arr(ax, 3.5, 7.97, 3.5, 7.63)
    arr(ax, 3.5, 6.97, 3.5, 6.58)
    arr(ax, 3.5, 5.83, 3.5, 5.38)
    arr(ax, 1.9, 5.0, 1.2, 4.23, label="Available")
    arr(ax, 3.5, 4.62, 3.5, 4.23, label="Occupied")
    arr(ax, 5.1, 5.0, 5.8, 4.23, label="Maintenance")

    # Add resident flow
    box(ax, 1.2, 2.8, 2.5, 0.65, "Search Resident\nEmployees without room\nby name or code", C["green_light"], fontsize=7.5)
    box(ax, 1.2, 1.8, 2.5, 0.65, "PATCH /api/building/room/:id/assign\nUPDATE employees.room_id\nCheck capacity → Update status", C["green_light"], fontsize=7.5)
    arr(ax, 1.2, 3.53, 1.2, 3.13)
    arr(ax, 1.2, 2.47, 1.2, 2.13)

    # Remove resident
    box(ax, 3.5, 2.8, 2.5, 0.65, "Remove Resident\nUPDATE employees.room_id=NULL\nCheck if room empty\n→ status='Available'", C["yellow_light"], fontsize=7.5)
    arr(ax, 3.5, 3.53, 3.5, 3.13)

    # Right: Manage buildings
    box(ax, 13.0, 8.3, 3.0, 0.65, "➕ Add Building\n(Admin only)", C["green_light"], fontsize=8.5)
    box(ax, 13.0, 7.3, 3.0, 0.75, "POST /api/building\n{building_name, building_type,\n total_floors, description}\nAuto-creates rooms\nfor each floor", C["gray_light"], fontsize=7.5)
    box(ax, 13.0, 6.2, 3.0, 0.65, "Building Types:\n🏠 Dormitory\n🏢 Office", C["blue_light"], fontsize=8)
    arr(ax, 10.1, 9.3, 13.0, 8.63, label="Add Building")
    arr(ax, 13.0, 7.97, 13.0, 7.68)
    arr(ax, 13.0, 6.93, 13.0, 6.53)

    # Summary
    box(ax, 8.0, 4.5, 4.5, 0.75,
        "📊 Dashboard Integration: Building summary cards show on Dashboard page\nOccupancy % · Total rooms · Occupied count · Available count",
        C["gray_light"], fontsize=8)
    box(ax, 8.0, 3.3, 4.5, 0.75,
        "🔗 Integration: Employee Profile Tab shows assigned room\nEmployees.room_id → rooms.room_number + buildings.building_name",
        C["gray_light"], fontsize=8)

    save(fig, "09_building_management.png")


# ══════════════════════════════════════════════════════════
#  CHART 10: DATABASE SCHEMA
# ══════════════════════════════════════════════════════════
def chart_database():
    fig, ax = plt.subplots(figsize=(20, 15))
    ax.set_xlim(0, 20); ax.set_ylim(0, 15)
    ax.axis("off")
    fig.patch.set_facecolor("white")
    title_box(ax, "10. Database Schema — ຕາຕະລາງ PostgreSQL",
              "18 tables · Relationships · Key Fields — employee management database")

    def table(ax, x, y, name, fields, color=None):
        fc = color or C["blue_light"]
        ec = C["blue_dark"] if fc == C["blue_light"] else (
             C["green_dark"] if fc == C["green_light"] else (
             C["yellow"] if fc == C["yellow_light"] else (
             C["red"] if fc == C["red_light"] else
             C["purple"] if fc == C["purple_light"] else C["gray"])))
        h = 0.38 + len(fields)*0.26
        patch = FancyBboxPatch((x - 1.4, y - h/2), 2.8, h,
                               boxstyle="round,pad=0.08",
                               facecolor=fc, edgecolor=ec,
                               linewidth=1.8, zorder=3)
        ax.add_patch(patch)
        header = FancyBboxPatch((x - 1.4, y + h/2 - 0.38), 2.8, 0.38,
                                boxstyle="round,pad=0.0",
                                facecolor=ec, edgecolor=ec,
                                linewidth=0, zorder=4)
        ax.add_patch(header)
        ax.text(x, y + h/2 - 0.19, name, ha="center", va="center",
                fontsize=8.5, fontweight="bold", color=C["white"], zorder=5)
        for i, f in enumerate(fields):
            fy = y + h/2 - 0.38 - 0.26*(i+0.5) - 0.06
            prefix = "🔑 " if f.startswith("PK") else "🔗 " if f.startswith("FK") else "   "
            ax.text(x - 1.25, fy, f"{prefix}{f}", ha="left", va="center",
                    fontsize=6.8, color=C["text_dark"], zorder=5)
        return (x, y, h)

    def rel(ax, x1, y1, x2, y2, label="", color=None):
        c = color or C["gray"]
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="-|>", color=c, lw=1.2,
                                    connectionstyle="arc3,rad=0.0"),
                    zorder=2)
        if label:
            mx, my = (x1+x2)/2, (y1+y2)/2
            ax.text(mx, my+0.08, label, fontsize=6, color=c, ha="center",
                    bbox=dict(facecolor="white", edgecolor="none", alpha=0.8))

    # Core tables
    table(ax, 3.0, 13.0, "companies", [
        "PK company_id", "companies_name", "contact", "status",
    ], C["blue_light"])
    table(ax, 8.0, 13.0, "users", [
        "PK user_id", "email", "fullname", "role",
        "password_hash", "reset_token",
    ], C["blue_light"])
    table(ax, 3.0, 10.5, "user_companies", [
        "FK user_id", "FK company_id",
    ], C["gray_light"])
    table(ax, 8.0, 10.5, "employees", [
        "PK employee_id", "FK company_id", "employee_code",
        "firstname", "lastname", "gender",
        "position", "status", "employee_type",
        "photo", "province/district/village",
        "FK room_id", "office_building",
        "deleted_at (soft delete)",
    ], C["green_light"])
    table(ax, 14.0, 13.0, "employee_card", [
        "PK card_id", "FK employee_id",
        "FK company_id", "card_no",
        "status", "issued_at",
        "FK issued_by", "card_color",
    ], C["green_light"])

    # Building tables
    table(ax, 3.0, 7.5, "buildings", [
        "PK building_id", "building_name",
        "building_type", "total_floors",
    ], C["yellow_light"])
    table(ax, 3.0, 5.5, "rooms", [
        "PK room_id", "FK building_id",
        "floor_number", "room_number",
        "capacity (4)", "status",
    ], C["yellow_light"])

    # Employee detail tables
    table(ax, 8.0, 7.5, "employee_documents", [
        "PK doc_id", "FK employee_id",
        "doc_type", "file_url",
        "expiry_date",
    ], C["purple_light"])
    table(ax, 8.0, 5.5, "employee_permits", [
        "PK permit_id", "FK employee_id",
        "permit_type", "permit_no",
        "issued_date", "expiry_date",
    ], C["purple_light"])
    table(ax, 8.0, 3.5, "employee_timeline", [
        "PK timeline_id", "FK employee_id",
        "action", "changed_by",
        "old_data (JSONB)", "new_data (JSONB)",
    ], C["purple_light"])

    # Workflow tables
    table(ax, 14.0, 10.5, "approval_requests", [
        "PK id", "request_type", "entity_type",
        "entity_id", "entity_name",
        "FK requested_by", "old_data (JSONB)",
        "new_data (JSONB)", "status",
        "FK reviewed_by", "reject_reason",
    ], C["red_light"])
    table(ax, 14.0, 7.5, "notifications", [
        "PK notif_id", "FK from_user_id",
        "FK to_user_id", "message",
        "entity_type", "is_read_by_target",
    ], C["red_light"])
    table(ax, 14.0, 5.5, "import_batches", [
        "PK batch_id", "FK company_id",
        "FK created_by", "status",
        "rows (JSONB)", "created_at",
    ], C["red_light"])
    table(ax, 14.0, 3.5, "audit_log", [
        "PK log_id", "action",
        "entity_type", "entity_id",
        "FK user_id", "FK company_id",
        "created_at",
    ], C["red_light"])

    # Auth tables
    table(ax, 18.5, 13.0, "revoked_tokens", [
        "PK jti (JWT ID)",
        "expires_at",
    ], C["gray_light"])
    table(ax, 18.5, 11.0, "app_settings", [
        "PK key",
        "value", "updated_at",
    ], C["gray_light"])
    table(ax, 18.5, 9.0, "employee_profile", [
        "PK profile_id",
        "FK employee_id",
        "avatar_url", "bio",
    ], C["gray_light"])

    # Relationships
    rel(ax, 3.0, 12.15, 3.0, 11.0, "1:N", C["blue"])   # companies → user_companies
    rel(ax, 8.0, 12.3, 8.0, 11.2, "1:N", C["blue"])     # users → user_companies
    rel(ax, 4.4, 10.5, 6.6, 10.5, "M:N via", C["blue"]) # user_companies ↔
    rel(ax, 3.0, 12.15, 6.6, 10.85, "", C["blue"])       # companies → employees (company_id)
    rel(ax, 8.0, 9.8, 8.0, 8.22, "1:N", C["green_dark"])  # employees → documents
    rel(ax, 8.0, 9.8, 8.0, 6.22, "", C["green_dark"])    # employees → permits
    rel(ax, 8.0, 9.8, 8.0, 4.22, "", C["green_dark"])    # employees → timeline
    rel(ax, 3.0, 7.08, 3.0, 6.25, "1:N", C["yellow"])   # buildings → rooms
    rel(ax, 4.4, 5.5, 6.6, 10.2, "", C["yellow"])        # rooms → employees
    rel(ax, 9.4, 10.5, 12.6, 10.5, "1:N", C["red"])      # employees → approvals
    rel(ax, 12.6, 13.0, 12.6, 11.2, "", C["green_dark"]) # employees → employee_card
    rel(ax, 14.0, 9.8, 14.0, 8.2, "1:N", C["red"])       # approvals → notifications

    # Legend
    leg_items = [
        (C["blue_light"], C["blue_dark"], "Core (Auth/Company/User)"),
        (C["green_light"], C["green_dark"], "Employee Data"),
        (C["yellow_light"], C["yellow"], "Building/Room"),
        (C["purple_light"], C["purple"], "Employee Details"),
        (C["red_light"], C["red"], "Workflow/Logs"),
        (C["gray_light"], C["gray"], "System/Auth"),
    ]
    for i, (fc, ec, lbl) in enumerate(leg_items):
        px = 0.5 + (i % 3) * 4.5
        py = 0.85 if i < 3 else 0.25
        patch = FancyBboxPatch((px, py), 4.0, 0.45,
                               boxstyle="round,pad=0.05",
                               facecolor=fc, edgecolor=ec, linewidth=1.2)
        ax.add_patch(patch)
        ax.text(px+2.0, py+0.225, lbl, ha="center", va="center",
                fontsize=7.5, color=ec, fontweight="bold")

    save(fig, "10_database_schema.png")


# ══════════════════════════════════════════════════════════
#  CHART 11: FULL SUMMARY (one-pager)
# ══════════════════════════════════════════════════════════
def chart_summary():
    fig, ax = plt.subplots(figsize=(20, 14))
    ax.set_xlim(0, 20); ax.set_ylim(0, 14)
    ax.axis("off")
    fig.patch.set_facecolor("#f8fafc")

    # Header
    hdr = FancyBboxPatch((0.2, 12.8), 19.6, 1.0,
                         boxstyle="round,pad=0.1",
                         facecolor=C["blue_dark"], edgecolor=C["blue_dark"])
    ax.add_patch(hdr)
    ax.text(10.0, 13.5, "Employee Management System — System Overview", ha="center", va="center",
            fontsize=16, fontweight="bold", color=C["white"])
    ax.text(10.0, 13.1, "Full-Stack Web Application · React + Node.js + PostgreSQL · Render Hosting",
            ha="center", va="center", fontsize=9, color="#93c5fd")

    # Stats row
    stats = [
        ("18", "Frontend Pages\n& Components"),
        ("15", "API Route\nFiles"),
        ("18", "PostgreSQL\nTables"),
        ("2", "User\nRoles"),
        ("2", "Cloud\nServices"),
        ("3", "Auth\nMiddleware"),
        ("16", "Unit\nTests"),
    ]
    for i, (val, lbl) in enumerate(stats):
        sx = 1.5 + i*2.7
        stat_bg = FancyBboxPatch((sx-1.15, 11.4), 2.3, 1.1,
                                 boxstyle="round,pad=0.08",
                                 facecolor=C["white"], edgecolor=C["blue_light"],
                                 linewidth=1.5)
        ax.add_patch(stat_bg)
        ax.text(sx, 12.2, val, ha="center", va="center",
                fontsize=18, fontweight="bold", color=C["blue_dark"])
        ax.text(sx, 11.75, lbl, ha="center", va="center",
                fontsize=7.5, color=C["gray"], multialignment="center")

    # Modules grid
    modules = [
        # (title, desc, x, y, color)
        ("🔐 Auth System", "Login/Logout · JWT · bcrypt\nRevoked tokens DB · Rate limit\nForgot/Reset password flow", 2.5, 10.3, C["blue_light"]),
        ("👥 Employees", "CRUD · Soft delete · Photo\nFilters · CSV export · Search\nPagination (max 200)", 6.5, 10.3, C["green_light"]),
        ("🏢 Companies", "CRUD · Status toggle\nCompany profile page\nEmployee list by company", 10.5, 10.3, C["blue_light"]),
        ("✅ Approvals", "Company Admin → request\nSuper Admin → approve/reject\nEmail notification both ways", 14.5, 10.3, C["yellow_light"]),
        ("📊 Dashboard", "Stats cards · Bar chart\nTrend chart · Activity log\nBuilding occupancy summary", 2.5, 8.5, C["blue_light"]),
        ("🪪 ID Cards", "Request · Preview · Issue\nPrint (single/batch) · Return\nQR code on card", 6.5, 8.5, C["green_light"]),
        ("🏗️ Building", "Buildings · Floors · Rooms\nResident management\nCapacity tracking (4/room)", 10.5, 8.5, C["yellow_light"]),
        ("📁 Import", "Excel upload · Column mapping\nSAVEPOINT transactions\nLao/English alias support", 14.5, 8.5, C["purple_light"]),
        ("📋 Reports", "Employee report (500 max)\nBuilding report\nColumn selector · CSV · Print", 2.5, 6.7, C["blue_light"]),
        ("📄 Documents", "File upload → Cloudinary\nDoc types · Expiry dates\nPer-employee document list", 6.5, 6.7, C["purple_light"]),
        ("🛂 Permits", "Work permits · Visa\nIssue/expiry dates\nStatus tracking", 10.5, 6.7, C["purple_light"]),
        ("🔍 Audit Log", "All user actions logged\nFilter by user/date/action\nSuper Admin only", 14.5, 6.7, C["red_light"]),
        ("👤 User Mgmt", "CRUD users · Assign companies\nRole assignment\nSuper Admin only", 2.5, 4.9, C["red_light"]),
        ("🔔 Notifs", "In-app notifications\nUnread count badge\nApproval result alerts", 6.5, 4.9, C["blue_light"]),
        ("⚙️ Settings", "Profile edit · Avatar\nChange password\nSystem name config", 10.5, 4.9, C["gray_light"]),
        ("🌐 i18n", "Lao (lo) + English (en)\nLanguageContext toggle\nTopbar language switch", 14.5, 4.9, C["gray_light"]),
    ]
    for title, desc, mx, my, mc in modules:
        box(ax, mx, my, 3.8, 1.1, f"{title}\n{desc}", mc, fontsize=7.5)

    # Tech stack bar
    tech_bg = FancyBboxPatch((0.2, 0.4), 19.6, 1.9,
                             boxstyle="round,pad=0.1",
                             facecolor=C["white"], edgecolor=C["blue_light"],
                             linewidth=1.5)
    ax.add_patch(tech_bg)
    ax.text(10.0, 2.1, "Tech Stack", ha="center", va="center",
            fontsize=10, fontweight="bold", color=C["blue_dark"])
    techs = [
        ("Frontend", "React 18\nVite\nReact Router v6\nContext API"),
        ("Backend", "Node.js\nExpress\nTypeScript\nJest (16 tests)"),
        ("Database", "PostgreSQL\n18 tables\nPooled conn\nSoft deletes"),
        ("Auth", "JWT (96-char)\nbcrypt r=12\nRevoked tokens\nRate limiting"),
        ("Files", "Cloudinary\nEmployee photos\nDocuments\nmulter upload"),
        ("Hosting", "Render (BE)\nRender Static (FE)\nGit auto-deploy\n_redirects SPA"),
        ("Security", "Helmet headers\nCORS whitelist\nIDOR protection\nSQL parameterized"),
    ]
    for i, (tname, tdesc) in enumerate(techs):
        tx = 1.5 + i*2.7
        ax.text(tx, 1.9, tname, ha="center", va="center",
                fontsize=8, fontweight="bold", color=C["blue_dark"])
        ax.text(tx, 1.3, tdesc, ha="center", va="center",
                fontsize=6.8, color=C["gray"], multialignment="center")

    save(fig, "00_summary.png")


# ══════════════════════════════════════════════════════════
#  RUN ALL
# ══════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("🎨 Generating Employee System Flow Charts...")
    chart_summary()
    chart_architecture()
    chart_auth()
    chart_rbac()
    chart_navigation()
    chart_employee()
    chart_approval()
    chart_import()
    chart_idcard()
    chart_building()
    chart_database()
    print(f"\n✅ Done! Charts saved to: {OUT}/")
    print("   Files: 00_summary.png through 10_database_schema.png")
