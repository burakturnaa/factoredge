import { describe, expect, it } from "vitest";
import { decodeFloat32, decodeInt16Scaled, decodeUInt16, decodeUInt32 } from "./register-decoder.js";

// Beklenen değerler elle (IEEE-754 bit düzeyinde) hesaplandı — bkz.
// vm/bant1-modbus/src/register-encoder.test.ts'teki aynı türetim. Burada kod tekrarı yapılmadı,
// sadece aynı bağımsız referans sabitleri kullanıldı.
describe("decodeUInt32 (30001-30002, ABCD)", () => {
  it("[18, 54919] -> 1234567 (0x0012D687)", () => {
    expect(decodeUInt32(18, 54919, "ABCD")).toBe(1234567);
  });

  it("[0, 0] -> 0", () => {
    expect(decodeUInt32(0, 0, "ABCD")).toBe(0);
  });

  it("[1, 0] -> 65536 (tam word taşması)", () => {
    expect(decodeUInt32(1, 0, "ABCD")).toBe(65536);
  });
});

describe("decodeFloat32 (30003-30004, CDAB)", () => {
  it("[düşük=0, yüksek=17008] -> 60.0 (0x42700000)", () => {
    expect(decodeFloat32(0, 17008, "CDAB")).toBe(60.0);
  });

  it("[düşük=0, yüksek=17136] -> 120.0 (0x42F00000)", () => {
    expect(decodeFloat32(0, 17136, "CDAB")).toBe(120.0);
  });

  it("ABCD sırasıyla çağrılırsa YANLIŞ bir değer üretir (word order'ın önemini kanıtlar)", () => {
    // Bu test, CDAB yerine yanlışlıkla ABCD kullanılırsa sonucun anlamsız çıkacağını gösterir —
    // decoder'ın wordOrder parametresini doğru kullanıp kullanmadığını da dolaylı doğrular.
    const correct = decodeFloat32(0, 17008, "CDAB");
    const wrong = decodeFloat32(0, 17008, "ABCD");
    expect(wrong).not.toBe(correct);
  });
});

describe("decodeInt16Scaled (30010, scale 0.01)", () => {
  it("485 -> 4.85 A", () => {
    expect(decodeInt16Scaled(485, 0.01)).toBeCloseTo(4.85, 5);
  });

  it("0 -> 0 A", () => {
    expect(decodeInt16Scaled(0, 0.01)).toBe(0);
  });
});

describe("decodeUInt16 (30020 / 40001)", () => {
  it("37 -> 37 (scale 1, fire adedi)", () => {
    expect(decodeUInt16(37)).toBe(37);
  });

  it("1 -> 1 (bant durumu RUNNING)", () => {
    expect(decodeUInt16(1)).toBe(1);
  });
});
