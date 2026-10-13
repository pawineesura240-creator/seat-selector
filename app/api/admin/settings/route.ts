import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "เฉพาะแอดมินเท่านั้น" }, { status: 403 });
  try {
    const { opens_at, closes_at, enabled } = await req.json();
    if (opens_at && closes_at && new Date(opens_at).getTime() >= new Date(closes_at).getTime()) return NextResponse.json({ error: "เวลาปิดต้องอยู่หลังเวลาเปิด" }, { status: 400 });
    const { error } = await db().from("app_settings").update({ opens_at, closes_at, enabled: !!enabled, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw error;
    return NextResponse.json({ message: "บันทึกเวลาเลือกโต๊ะแล้ว" });
  } catch (e) { console.error(e); return NextResponse.json({ error: "บันทึกการตั้งค่าไม่สำเร็จ" }, { status: 500 }); }
}