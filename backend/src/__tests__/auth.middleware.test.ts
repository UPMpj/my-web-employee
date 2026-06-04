/* Unit tests for auth middleware — mocks pool & jwt */
import jwt from "jsonwebtoken";

const SECRET = "test_secret_for_unit_tests";
process.env.JWT_SECRET = SECRET;

/* Mock the DB pool so tests never hit the database */
jest.mock("../db", () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [] }), // no revoked tokens by default
  },
}));

import { auth } from "../middleware/auth";
import { pool } from "../db";

const mockPool = pool as jest.Mocked<typeof pool>;

function mockRes() {
  return {
    _status: 0,
    sendStatus(code: number) { this._status = code; return this; },
  } as any;
}

function makeToken(payload: object, expiresIn: number | string = "1d") {
  return jwt.sign(payload, SECRET, { expiresIn } as any);
}

describe("auth middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  test("ບໍ່ມີ Authorization header — 401", async () => {
    const next = jest.fn();
    const res  = mockRes();
    await auth({ headers: {} } as any, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("header ຮູບແບບຜິດ — 401", async () => {
    const next = jest.fn();
    const res  = mockRes();
    await auth({ headers: { authorization: "Basic abc" } } as any, res, next);
    expect(res._status).toBe(401);
  });

  test("token ຖືກຕ້ອງ ແລະ ບໍ່ຖືກ revoke — ຜ່ານ", async () => {
    const next  = jest.fn();
    const res   = mockRes();
    const token = makeToken({ user_id: 1, role: "Super Admin", jti: "abc-123" });
    const req: any = { headers: { authorization: `Bearer ${token}` }, user: null };
    await auth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.user_id).toBe(1);
  });

  test("token ຖືກ revoke ໃນ DB — 401", async () => {
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });
    const next  = jest.fn();
    const res   = mockRes();
    const token = makeToken({ user_id: 2, role: "Company Admin", jti: "revoked-jti" });
    await auth({ headers: { authorization: `Bearer ${token}` } } as any, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("token ໝົດອາຍຸ — 401", async () => {
    const next  = jest.fn();
    const res   = mockRes();
    const token = makeToken({ user_id: 3, role: "Super Admin", jti: "old" }, "-1s");
    await auth({ headers: { authorization: `Bearer ${token}` } } as any, res, next);
    expect(res._status).toBe(401);
  });

  test("token ປອມ (signature ຜິດ) — 401", async () => {
    const next  = jest.fn();
    const res   = mockRes();
    const token = jwt.sign({ user_id: 4, role: "Super Admin" }, "wrong_secret");
    await auth({ headers: { authorization: `Bearer ${token}` } } as any, res, next);
    expect(res._status).toBe(401);
  });
});
