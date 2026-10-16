/**
 * Case'in register haritasındaki 4 kodlama türü. Tümü saf fonksiyon — Buffer üzerinde
 * big-endian yazıp word'leri (16-bit parçaları) istenen sırada (ABCD/CDAB) register'lara dağıtır.
 *
 * ABCD: register[0] = yüksek word, register[1] = düşük word (word sırası değişmez).
 * CDAB: register[0] = düşük word, register[1] = yüksek word (word'ler takas edilir, byte sırası
 *       her word içinde big-endian kalır).
 */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 30001-30002: uint32, ABCD. Üretim adedi gibi sayaçlar için. */
export function encodeUInt32ABCD(value: number): [reg0: number, reg1: number] {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(clamp(Math.round(value), 0, 0xffffffff), 0);
  const high = buf.readUInt16BE(0);
  const low = buf.readUInt16BE(2);
  return [high, low];
}

/** 30003-30004: float32, CDAB (word-swapped). Motor sıcaklığı gibi ondalıklı sinyaller için. */
export function encodeFloat32CDAB(value: number): [reg0: number, reg1: number] {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(value, 0);
  const high = buf.readUInt16BE(0);
  const low = buf.readUInt16BE(2);
  return [low, high];
}

/** 30010: int16, scale uygulanmış tek register. Motor akımı (scale 0.01) için. */
export function encodeInt16Scaled(value: number, scale: number): number {
  const raw = clamp(Math.round(value / scale), -0x8000, 0x7fff);
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(raw, 0);
  return buf.readUInt16BE(0);
}

/** 30020: uint16, tek register. Fire adedi gibi küçük sayaçlar için. */
export function encodeUInt16(value: number): number {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(clamp(Math.round(value), 0, 0xffff), 0);
  return buf.readUInt16BE(0);
}
