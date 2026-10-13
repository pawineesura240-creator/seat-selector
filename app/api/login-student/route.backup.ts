
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  makeToken,
  sessionCookie,
  cookieOptions,
} from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const studentName = String(name || "").trim();

    if (!studentName) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อหรือชื่อเล่น" },
        { status: 400 }
      );
    }

    if (studentName.length > 40) {
      return NextResponse.json(
        { error: "ชื่อต้องไม่เกิน 40 ตัวอักษร" },
        { status: 400 }
      );
    }

    const guestId = `guest-${randomUUID()}`;

    const res = NextResponse.json({
      message: `เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${studentName}`,
    });

    res.cookies.set(
      sessionCookie,
      makeToken({
        role: "student",
        studentId: guestId,
        name: studentName,
      }),
      cookieOptions
    );

    return res;
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
