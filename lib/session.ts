import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "seat_session";
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร");
  return s;
}
function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}
export function makeToken(data: { role: "student" | "admin"; studentId?: string; name?: string }) {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function readToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(signature);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data as { role: "student" | "admin"; studentId?: string; name?: string; exp: number };
  } catch { return null; }
}
export async function currentSession() {
  const jar = await cookies();
  return readToken(jar.get(COOKIE)?.value);
}
export const sessionCookie = COOKIE;
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 12 };
