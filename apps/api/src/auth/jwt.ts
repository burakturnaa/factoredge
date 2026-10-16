import jwt, { type SignOptions } from "jsonwebtoken";

export type UserRole = "admin" | "viewer";

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: UserRole;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET ortam değişkeni tanımlı değil");
  return secret;
}

export function signToken(payload: AuthTokenPayload): string {
  // .env'den gelen bir operatör ayarı olduğu için jsonwebtoken'ın StringValue (ms şablon-literal)
  // tipiyle derleme zamanında eşleşmez — bilinçli bir cast, çalışma zamanında jwt.sign zaten
  // geçersiz bir biçimi reddeder.
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "8h") as SignOptions["expiresIn"];
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getSecret()) as AuthTokenPayload;
}
