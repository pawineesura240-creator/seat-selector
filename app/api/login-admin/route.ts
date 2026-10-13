import { NextResponse } from "next/server";
import { makeToken, sessionCookie, cookieOptions } from "@/lib/session";
export async function POST(req: Request) {
  const { password } = await req.json();
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "รหัสผ่านแอดมินไม่ถูกต้อง" }, { status: 401 });
  const res = NextResponse.json({ message: "เข้าสู่ระบบแอดมินสำเร็จ" });
  res.cookies.set(sessionCookie, makeToken({ role: "admin" }), cookieOptions);
  return res;
}