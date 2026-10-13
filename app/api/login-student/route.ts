
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import {
  makeToken,
  sessionCookie,
  cookieOptions,
} from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const studentId = String(body.studentId || "").trim();
    const studentName = String(body.name || "").trim();

    if (!studentId || !studentName) {
      return NextResponse.json(
        { error: "กรุณากรอกเลขประจำตัวและชื่อ-นามสกุล" },
        { status: 400 }
      );
    }

    if (studentName.length > 100) {
      return NextResponse.json(
        { error: "ชื่อ-นามสกุลยาวเกินไป" },
        { status: 400 }
      );
    }

    const { data: student, error } = await db()
      .from("students")
      .select("student_id, full_name")
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) {
      console.error("Student lookup failed:", error);

      return NextResponse.json(
        { error: "ตรวจสอบข้อมูลนักเรียนไม่สำเร็จ กรุณาลองใหม่" },
        { status: 500 }
      );
    }

    if (
      !student ||
      student.full_name.trim().toLowerCase() !==
        studentName.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "เลขประจำตัวหรือชื่อ-นามสกุลไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      message: `เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${student.full_name}`,
    });

    res.cookies.set(
      sessionCookie,
      makeToken({
        role: "student",
        studentId: student.student_id,
        name: student.full_name,
      }),
      cookieOptions
    );

    return res;
  } catch (e) {
    console.error("Student login failed:", e);

    return NextResponse.json(
      { error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
