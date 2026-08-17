/* Unit tests for GET /api/idcard's role-count badges and sort option — added
   alongside the ID Card page redesign but never covered by a test until now.
   The regex keyword-matching (manager/supervisor/staff) is exactly the kind
   of logic that silently breaks on a refactor with nothing to catch it,
   since it only shows up as a wrong badge count in the UI. */
import express from "express";
import request from "supertest";

process.env.JWT_SECRET = "test_secret_for_route_tests";

// idcard.ts fires two `pool.query(...).catch(() => {})` ALTER TABLE calls at
// module load (adding columns if missing) — the mock needs a resolvable
// default *before* that import happens, or those calls throw on undefined.
jest.mock("../db", () => ({ pool: { query: jest.fn().mockResolvedValue({ rows: [{}] }) } }));
jest.mock("../middleware/auth", () => ({ auth: (_req: any, _res: any, next: any) => next() }));
jest.mock("../utils/issueCard", () => ({ issueCardForEmployee: jest.fn() }));
jest.mock("../utils/employeeAccess", () => ({ canAccessEmployee: jest.fn() }));
jest.mock("../utils/auditLog", () => ({ logAudit: jest.fn() }));

import { pool } from "../db";
import idcardRouter from "../routes/idcard";

const mockQuery = pool.query as jest.Mock;

function buildApp(user: { user_id: number; role: string }) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.user = user; next(); });
  app.use("/api/idcard", idcardRouter);
  return app;
}

/* GET / issues 4 queries in order: role counts, stats, count, data */
function stubFourQueries() {
  mockQuery.mockReset();
  mockQuery
    .mockResolvedValueOnce({ rows: [{ role_all: 10, role_staff: 5, role_supervisor: 2, role_manager: 2 }] })
    .mockResolvedValueOnce({ rows: [{ total_cards: 5, no_card: 5, printed: 3, printed_this_month: 1, printed_last_month: 2, resigned_with_card: 0, card_returned: 0, not_returned: 0 }] })
    .mockResolvedValueOnce({ rows: [{ count: "10" }] })
    .mockResolvedValueOnce({ rows: [] });
}

describe("GET /api/idcard — role count badges", () => {
  beforeEach(stubFourQueries);

  test("the role-count query always computes all four buckets, unfiltered", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    await request(app).get("/api/idcard").query({ role_filter: "manager" });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/AS role_all/);
    expect(sql).toMatch(/AS role_staff/);
    expect(sql).toMatch(/AS role_supervisor/);
    expect(sql).toMatch(/AS role_manager/);
  });

  test("role_filter narrows the stats/count/data queries but NOT the role-count query itself", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });

    await request(app).get("/api/idcard"); // no role_filter
    const [roleCountsSqlUnfiltered] = mockQuery.mock.calls[0];
    const [statsSqlUnfiltered]      = mockQuery.mock.calls[1];

    stubFourQueries();
    await request(app).get("/api/idcard").query({ role_filter: "manager" });
    const [roleCountsSqlFiltered] = mockQuery.mock.calls[0];
    const [statsSqlFiltered]      = mockQuery.mock.calls[1];

    // role-count query is identical whether or not role_filter is set —
    // it always reflects totals across every role, per the code comment
    expect(roleCountsSqlFiltered).toBe(roleCountsSqlUnfiltered);
    // the stats query, by contrast, gains the manager keyword condition
    expect(statsSqlFiltered).not.toBe(statsSqlUnfiltered);
    expect(statsSqlFiltered).toMatch(/manager\|director\|head\|chief\|president\|ceo\|vp\|vice\|executive\|officer/);
  });

  test("response maps the DB row into a role_counts object with the expected keys", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    const res = await request(app).get("/api/idcard");

    expect(res.body.role_counts).toEqual({
      all: 10, staff: 5, supervisor: 2, manager: 2,
    });
    expect(res.body.printed_this_month).toBe(1);
    expect(res.body.printed_last_month).toBe(2);
  });
});

describe("GET /api/idcard — sort", () => {
  beforeEach(stubFourQueries);

  test.each([
    ["newest", "e.employee_id DESC"],
    ["oldest", "e.employee_id ASC"],
    ["name",   "e.firstname ASC, e.lastname ASC"],
  ])("sort=%s orders by %s", async (sort, expectedOrderBy) => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    await request(app).get("/api/idcard").query({ sort });

    const [dataSql] = mockQuery.mock.calls[3];
    expect(dataSql).toMatch(new RegExp(`ORDER BY ${expectedOrderBy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  });

  test("an unrecognized sort value falls back to newest", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    await request(app).get("/api/idcard").query({ sort: "bogus" });

    const [dataSql] = mockQuery.mock.calls[3];
    expect(dataSql).toMatch(/ORDER BY e\.employee_id DESC/);
  });
});
