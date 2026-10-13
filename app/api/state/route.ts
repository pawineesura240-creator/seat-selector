import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [seats, settings, session] = await Promise.all([
      db().from("seats").select("seat_no, student_id, student_name").order("seat_no"),
      db().from("app_settings").select("opens_at, closes_at, enabled").eq("id", 1).single(),
      currentSession()
    ]);
    if (seats.error || settings.error) throw seats.error || settings.error;
    return NextResponse.json({ session: session ? { role: session.role, studentId: session.studentId, name: session.name } : null, seats: seats.data, settings: settings.data, now: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { console.error(e); return NextResponse.json({ error: "อ่านข้อมูลไม่ได้ กรุณาตรวจสอบการตั้งค่าฐานข้อมูล" }, { status: 500 }); }
}