/**
 * vm/bant1-modbus/src/register-encoder.ts'in ters yönü — ama kasıtlı olarak oradan DAHA GENEL:
 * burada wordOrder konfigürasyondan okunur (device.config.registers[...].wordOrder), çünkü backend
 * sadece bu case'in register haritasını değil, arayüzden eklenecek herhangi bir Modbus cihazını
 * okuyabilmeli ("yeni bir kaynak eklemenin kolaylığı" kriteri).
 */

export type WordOrder = "ABCD" | "CDAB";

function combineWords(reg0: number, reg1: number, wordOrder: WordOrder): Buffer {
  const buf = Buffer.alloc(4);
  if (wordOrder === "ABCD") {
    buf.writeUInt16BE(reg0, 0); // yüksek word
    buf.writeUInt16BE(reg1, 2); // düşük word
  } else {
    buf.writeUInt16BE(reg1, 0); // yüksek word (CDAB'de reg1)
    buf.writeUInt16BE(reg0, 2); // düşük word (CDAB'de reg0)
  }
  return buf;
}

export function decodeUInt32(reg0: number, reg1: number, wordOrder: WordOrder = "ABCD"): number {
  return combineWords(reg0, reg1, wordOrder).readUInt32BE(0);
}

export function decodeFloat32(reg0: number, reg1: number, wordOrder: WordOrder = "CDAB"): number {
  return combineWords(reg0, reg1, wordOrder).readFloatBE(0);
}

export function decodeInt16Scaled(raw: number, scale: number): number {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(raw & 0xffff, 0);
  return buf.readInt16BE(0) * scale;
}

export function decodeUInt16(raw: number, scale = 1): number {
  return (raw & 0xffff) * scale;
}
