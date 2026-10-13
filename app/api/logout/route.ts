import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/session";
export async function POST() { const res = NextResponse.json({ message: "ออกจากระบบแล้ว" }); res.cookies.delete(sessionCookie); return res; }