/* Unit tests for password validation rules */

function validatePassword(pw: string): string | null {
  if (pw.length < 8)          return "ລະຫັດຜ່ານຕ້ອງຢ່າງໜ້ອຍ 8 ຕົວ";
  if (!/[A-Z]/.test(pw))      return "ຕ້ອງມີຕົວອັກສອນພິມໃຫຍ່ຢ່າງໜ້ອຍ 1 ໂຕ";
  if (!/[0-9]/.test(pw))      return "ຕ້ອງມີຕົວເລກຢ່າງໜ້ອຍ 1 ໂຕ";
  if (!/[^A-Za-z0-9]/.test(pw)) return "ຕ້ອງມີຕົວອັກສອນພິເສດຢ່າງໜ້ອຍ 1 ໂຕ (@, #, !, ...)";
  return null;
}

describe("validatePassword", () => {
  test("ຍອມຮັບ password ທີ່ຖືກຕ້ອງ", () => {
    expect(validatePassword("Secure@123")).toBeNull();
    expect(validatePassword("Hello!World9")).toBeNull();
    expect(validatePassword("P@ssw0rd!")).toBeNull();
  });

  test("ຕ້ອງຍາວຢ່າງໜ້ອຍ 8 ຕົວ", () => {
    expect(validatePassword("Ab1!")).not.toBeNull();
    expect(validatePassword("Ab1!xxx")).not.toBeNull();
    expect(validatePassword("Ab1!xxxx")).toBeNull();
  });

  test("ຕ້ອງມີຕົວໃຫຍ່", () => {
    expect(validatePassword("secure@123")).not.toBeNull();
  });

  test("ຕ້ອງມີຕົວເລກ", () => {
    expect(validatePassword("Secure@abc")).not.toBeNull();
  });

  test("ຕ້ອງມີຕົວອັກສອນພິເສດ", () => {
    expect(validatePassword("Secure1234")).not.toBeNull();
  });

  test("string ຫວ່າງ — fail", () => {
    expect(validatePassword("")).not.toBeNull();
  });
});
