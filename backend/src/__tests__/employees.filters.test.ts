/* Unit tests for the position filter on GET /api/employees and the
   GET /api/employees/meta/positions dropdown endpoint — added alongside the
   Personnel page redesign but never covered by a test until now. */
import express from "express";
import request from "supertest";

process.env.JWT_SECRET = "test_secret_for_route_tests";

jest.mock("../db", () => ({ pool: { query: jest.fn() } }));
jest.mock("../middleware/auth", () => ({ auth: (_req: any, _res: any, next: any) => next() }));

import { pool } from "../db";
import employeesRouter from "../routes/employees";

const mockQuery = pool.query as jest.Mock;

function buildApp(user: { user_id: number; role: string }) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.user = user; next(); });
  app.use("/api/employees", employeesRouter);
  return app;
}

describe("GET /api/employees — position filter", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [{ count: "0" }] });
  });

  test("position=Manager adds an e.position condition with the value as a param", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    await request(app).get("/api/employees").query({ position: "Manager" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/e\.position = \$\d+/);
    expect(params).toContain("Manager");
  });

  test("position=all is treated the same as omitting it — no position condition", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    await request(app).get("/api/employees").query({ position: "all" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).not.toMatch(/e\.position = /);
    expect(params).toEqual([]);
  });

  test("combines with search + status without misaligning placeholder numbers", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    await request(app).get("/api/employees").query({ search: "phone", status: "Active", position: "Driver" });

    const [sql, params] = mockQuery.mock.calls[0];
    // params are pushed in this order: search, status, position
    expect(params).toEqual(["%phone%", "Active", "Driver"]);
    expect(sql).toMatch(/ILIKE \$1/);
    expect(sql).toMatch(/e\.status = \$2/);
    expect(sql).toMatch(/e\.position = \$3/);
  });
});

describe("GET /api/employees/meta/positions", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [{ position: "Manager" }, { position: "Staff" }] });
  });

  test("Super Admin gets an unscoped distinct-position query", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    await request(app).get("/api/employees/meta/positions");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).not.toMatch(/user_companies/);
    expect(params).toEqual([]);
  });

  test("Company Admin's query is scoped to their own companies", async () => {
    const app = buildApp({ user_id: 42, role: "Company Admin" });
    await request(app).get("/api/employees/meta/positions");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/e\.company_id IN \(SELECT company_id FROM user_companies WHERE user_id=\$1\)/);
    expect(params).toEqual([42]);
  });

  test("responds with a flat array of position strings, not row objects", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    const res = await request(app).get("/api/employees/meta/positions");

    expect(res.body).toEqual(["Manager", "Staff"]);
  });
});
