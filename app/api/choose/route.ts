import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session || session.role !== "student" || !session.studentId || !session.name) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบนักเรียนก่อน" }, { status: 401 });
  try {
    const { seatNo } = await req.json();
    if (!Number.isInteger(seatNo) || seatNo < 1 || seatNo > 28) return NextResponse.json({ error: "หมายเลขโต๊ะไม่ถูกต้อง" }, { status: 400 });
        const { data, error } = await db().rpc("choose_seat", { p_student_id: session.studentId, p_student_name: session.name, p_seat_no: seatNo });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("SELECTION_CLOSED")) return NextResponse.json({ error: "ขณะนี้ยังไม่เปิดหรือหมดเวลาเลือกโต๊ะแล้ว" }, { status: 403 });
      if (msg.includes("SEAT_TAKEN")) return NextResponse.json({ error: "โต๊ะนี้มีคนเลือกไปแล้ว กรุณาเลือกโต๊ะอื่น" }, { status: 409 });
      if (msg.includes("ALREADY_SELECTED")) return NextResponse.json({ error: "คุณเลือกโต๊ะไปแล้ว หากต้องการเปลี่ยนให้ติดต่อแอดมิน" }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ message: `เลือกโต๊ะหมายเลข ${seatNo} สำเร็จ`, data });
  } catch (e) { console.error(e); return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 }); }
}