import { describe, expect, it } from "vitest";
import { encodeFloat32CDAB, encodeInt16Scaled, encodeUInt16, encodeUInt32ABCD } from "./register-encoder.js";

/**
 * Bu testlerin beklenen değerleri Buffer/encoder koduna HİÇ dokunmadan, elle (IEEE-754 bit
 * düzeyinde) hesaplandı — amaç, encoder'ın kendi kendini doğrulamasını (tautoloji) önlemek.
 * Word-order (ABCD/CDAB) tam burada en yüksek risk taşıyan nokta olduğu için bağımsız referans
 * değerlerle karşılaştırmak kritik.
 */
describe("encodeUInt32ABCD (30001-30002)", () => {
  it("1234567 (0x0012D687) değerini ABCD sırasıyla [yüksek, düşük] register'lara böler", () => {
    // 1234567 = 0x0012D687 -> yüksek word 0x0012=18, düşük word 0xD687=54919 (elle hesaplandı)
    expect(encodeUInt32ABCD(1234567)).toEqual([18, 54919]);
  });

  it("0 değerini [0, 0] olarak kodlar", () => {
    expect(encodeUInt32ABCD(0)).toEqual([0, 0]);
  });

  it("65536 (tam bir word taşması) değerini [1, 0] olarak kodlar", () => {
    expect(encodeUInt32ABCD(65536)).toEqual([1, 0]);
  });
});

describe("encodeFloat32CDAB (30003-30004)", () => {
  it("60.0 değerini CDAB sırasıyla [düşük, yüksek] register'lara böler", () => {
    // 60.0 IEEE-754 float32 BE = 0x42700000 -> yüksek word 0x4270=17008, düşük word 0x0000=0
    // (elle: işaret 0, üs 132=10000100, mantissa .875=111... -> bayt dizisi 42 70 00 00 — Python/C
    // struct.pack('>f', 60.0) ile de doğrulanabilir, burada manuel IEEE-754 türetimi kullanıldı)
    // CDAB: reg0=düşük word, reg1=yüksek word
    expect(encodeFloat32CDAB(60.0)).toEqual([0, 17008]);
  });

  it("120.0 değerini CDAB sırasıyla böler", () => {
    // 120.0 IEEE-754 float32 BE = 0x42F00000 -> yüksek word 0x42F0=17136, düşük word 0x0000=0
    expect(encodeFloat32CDAB(120.0)).toEqual([0, 17136]);
  });

  it("0.0 değerini [0, 0] olarak kodlar", () => {
    expect(encodeFloat32CDAB(0.0)).toEqual([0, 0]);
  });
});

describe("encodeInt16Scaled (30010, scale 0.01)", () => {
  it("4.85 A değerini scale 0.01 ile 485 ham değerine çevirir", () => {
    expect(encodeInt16Scaled(4.85, 0.01)).toBe(485);
  });

  it("0 A değerini 0'a çevirir", () => {
    expect(encodeInt16Scaled(0, 0.01)).toBe(0);
  });

  it("yuvarlama: 4.856 A, scale 0.01 ile 486'ya yuvarlanır", () => {
    expect(encodeInt16Scaled(4.856, 0.01)).toBe(486);
  });
});

describe("encodeUInt16 (30020)", () => {
  it("37 adet fire değerini doğrudan kodlar", () => {
    expect(encodeUInt16(37)).toBe(37);
  });

  it("0 adet değerini kodlar", () => {
    expect(encodeUInt16(0)).toBe(0);
  });
});
