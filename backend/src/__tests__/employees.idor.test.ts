/* Integration tests for GET /api/employees — verifies the multi-tenant guard:
   a Company Admin's query must always be restricted to their own assigned companies,
   no matter what company_id they pass in. This is the main IDOR boundary in the app. */
import express from "express";
import request from "supertest";

process.env.JWT_SECRET = "test_secret_for_route_tests";

jest.mock("../db", () => ({ pool: { query: jest.fn() } }));
// employees.ts binds the real `auth` middleware directly on each route (router.get("/", auth, ...)),
// so it has to be mocked here too — otherwise every request 401s before reaching the handler.
jest.mock("../middleware/auth", () => ({ auth: (_req: any, _res: any, next: any) => next() }));

import { pool } from "../db";
import employeesRouter from "../routes/employees";

const mockQuery = pool.query as jest.Mock;

function buildApp(user: { user_id: number; role: string }) {
  const app = express();
  app.use(express.json());
  // runs before the router's (now no-op) `auth`, standing in for what real auth would set
  app.use((req: any, _res, next) => { req.user = user; next(); });
  app.use("/api/employees", employeesRouter);
  return app;
}

describe("GET /api/employees — company scoping", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [{ count: "0" }] }); // satisfies whichever query runs first
  });

  test("Company Admin ຂໍ company_id ຂອງຄົນອື່ນ — query ຕ້ອງມີ EXISTS guard + user_id ຂອງຕົນເອງ", async () => {
    const app = buildApp({ user_id: 42, role: "Company Admin" });
    await request(app).get("/api/employees").query({ company_id: "999" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/EXISTS \(SELECT 1 FROM user_companies/);
    expect(params).toEqual(["999", 42]);
  });

  test("Company Admin ບໍ່ລະບຸ company_id — ຕ້ອງຈຳກັດໃຫ້ເຫັນສະເພາະ company ຂອງຕົນເອງ", async () => {
    const app = buildApp({ user_id: 42, role: "Company Admin" });
    await request(app).get("/api/employees");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/e\.company_id IN \(SELECT company_id FROM user_companies WHERE user_id/);
    expect(params).toEqual([42]);
  });

  test("Super Admin ຂໍ company_id ໃດກໍໄດ້ — ບໍ່ມີ guard ເພີ່ມ", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    await request(app).get("/api/employees").query({ company_id: "999" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).not.toMatch(/user_companies/);
    expect(params).toEqual(["999"]);
  });

  test("Super Admin ບໍ່ລະບຸ company_id — ເຫັນທຸກບໍລິສັດ, ບໍ່ມີ guard", async () => {
    const app = buildApp({ user_id: 1, role: "Super Admin" });
    await request(app).get("/api/employees");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).not.toMatch(/user_companies/);
    expect(params).toEqual([]);
  });
});
