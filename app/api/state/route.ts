import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { currentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = db();

    const [seatsResult, studentsResult, settingsResult, session] =
      await Promise.all([
        client
          .from("seats")
          .select("seat_number, student_id, selected_at")
          .order("seat_number"),

        client
          .from("students")
          .select("student_id, full_name"),

        client
          .from("booking_settings")
          .select("id, opens_at, closes_at, enabled")
          .eq("id", 1)
          .maybeSingle(),

        currentSession(),
      ]);

    if (seatsResult.error) throw seatsResult.error;
    if (studentsResult.error) throw studentsResult.error;
    if (settingsResult.error) throw settingsResult.error;

    const students = studentsResult.data ?? [];

    const seats = (seatsResult.data ?? []).map((seat) => {
      const student = students.find(
        (item) =>
          item.student_id != null &&
          seat.student_id != null &&
          String(item.student_id) === String(seat.student_id)
      );

      return {
        seat_no: seat.seat_number,
        student_id: seat.student_id,
        student_name: student?.full_name ?? null,
        selected_at: seat.selected_at,
      };
    });

    return NextResponse.json(
      {
        session: session
          ? {
              role: session.role,
              studentId: session.studentId,
              name: session.name,
            }
          : null,
        seats,
        settings: settingsResult.data,
        now: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("อ่านข้อมูลสถานะไม่สำเร็จ:", error);

    return NextResponse.json(
      { error: "อ่านข้อมูลไม่ได้ กรุณาตรวจสอบการตั้งค่าฐานข้อมูล" },
      { status: 500 }
    );
  }
}