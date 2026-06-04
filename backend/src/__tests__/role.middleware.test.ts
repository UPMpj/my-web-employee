/* Unit tests for role middleware */
import { allow } from "../middleware/role";

function mockReq(role: string) {
  return { user: { role } } as any;
}

function mockRes() {
  return {
    _status: 0,
    sendStatus(code: number) { this._status = code; return this; },
  } as any;
}

describe("allow() middleware", () => {
  test("ອະນຸຍາດ role ທີ່ match", () => {
    const next = jest.fn();
    const req  = mockReq("Super Admin");
    const res  = mockRes();
    allow("Super Admin")(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res._status).toBe(0);
  });

  test("ປະຕິເສດ role ທີ່ບໍ່ match — return 403", () => {
    const next = jest.fn();
    const req  = mockReq("Company Admin");
    const res  = mockRes();
    allow("Super Admin")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });

  test("ອະນຸຍາດ ຖ້າ role ຢູ່ໃນ list ຫຼາຍ role", () => {
    const next = jest.fn();
    allow("Super Admin", "Company Admin")(mockReq("Company Admin"), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("ປະຕິເສດ role ທີ່ spelling ຕ່າງ (case-sensitive)", () => {
    const next = jest.fn();
    const res  = mockRes();
    allow("Super Admin")(mockReq("super admin"), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
  });
});
