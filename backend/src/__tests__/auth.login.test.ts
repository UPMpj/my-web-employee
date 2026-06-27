/* Integration tests for POST /api/auth/login — runs the real route through Express,
   mocking only the DB pool and audit log so bcrypt/JWT/cookie logic all run for real. */
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import bcrypt from "bcrypt";

process.env.JWT_SECRET = "test_secret_for_route_tests";

jest.mock("../db", () => ({ pool: { query: jest.fn() } }));
jest.mock("../utils/auditLog", () => ({ logAudit: jest.fn() }));

import { pool } from "../db";
import authRouter from "../routes/auth";

const mockQuery = pool.query as jest.Mock;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  return app;
}

describe("POST /api/auth/login", () => {
  let app: express.Express;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash("CorrectPass1!", 12);
  });

  beforeEach(() => {
    app = buildApp();
    mockQuery.mockReset();
  });

  test("ຂາດ email ຫຼື password — 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });

  test("email ຮູບແບບຜິດ — 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "not-an-email", password: "x" });
    expect(res.status).toBe(400);
  });

  test("ບໍ່ມີ user ນີ້ໃນລະບົບ — 401 (ບໍ່ບອກວ່າ email ບໍ່ມີ vs password ຜິດ)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@x.com", password: "whatever1!" });
    expect(res.status).toBe(401);
    expect(res.body.message).not.toMatch(/not found|no user/i);
  });

  test("password ຜິດ — 401", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 1, email: "a@b.com", password_hash: passwordHash, role_name: "Company Admin", totp_enabled: false }],
    });
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "WrongPassword!" });
    expect(res.status).toBe(401);
  });

  test("login ສຳເລັດ — ໄດ້ httpOnly cookie, ບໍ່ສົ່ງ password_hash ກັບໄປ", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        user_id: 1, email: "a@b.com", fullname: "A B",
        password_hash: passwordHash, role_name: "Company Admin", totp_enabled: false,
      }],
    });
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "CorrectPass1!" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("a@b.com");
    expect(res.body.user.password_hash).toBeUndefined();

    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toMatch(/^token=/);
    expect(cookie.toLowerCase()).toMatch(/httponly/);
  });

  test("account ເປີດ 2FA ໄວ້ — ໄດ້ແຕ່ challenge, ບໍ່ໄດ້ session ຈິງ", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 2, email: "c@d.com", password_hash: passwordHash, role_name: "Company Admin", totp_enabled: true }],
    });
    const res = await request(app).post("/api/auth/login").send({ email: "c@d.com", password: "CorrectPass1!" });

    expect(res.status).toBe(200);
    expect(res.body.requires_2fa).toBe(true);
    expect(res.body.challenge_token).toBeDefined();
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});
