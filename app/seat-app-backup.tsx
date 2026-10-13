"use client";
import { useEffect, useState } from "react";

type Seat = { seat_no: number; student_id: string | null; student_name: string | null };
type State = { session: { role: string; studentId?: string; name?: string } | null; seats: Seat[]; settings: { opens_at: string | null; closes_at: string | null; enabled: boolean } | null; now: string; error?: string };

export default function SeatApp() {
  const [state, setState] = useState<State | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [opens, setOpens] = useState("");
  const [closes, setCloses] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const r = await fetch("/api/state", { cache: "no-store" });
    const j = await r.json();
    if (r.ok) {
      setState(j);
      if (j.settings) {
        setOpens(j.settings.opens_at ? j.settings.opens_at.slice(0,16) : "");
        setCloses(j.settings.closes_at ? j.settings.closes_at.slice(0,16) : "");
        setEnabled(j.settings.enabled);
      }
    } else setMessage(j.error || "โหลดข้อมูลไม่สำเร็จ");
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 5000); return () => clearInterval(t); }, []);

  async function post(url: string, body: unknown) {
    setBusy(true); setMessage("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "เกิดข้อผิดพลาด");
      setMessage(j.message || "สำเร็จ");
      await refresh();
      return j;
    } catch (e) { setMessage(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"); }
    finally { setBusy(false); }
  }
  async function logout() { await post("/api/logout", {}); setState(null); await refresh(); }
  const session = state?.session;
  const now = state?.now ? new Date(state.now).getTime() : Date.now();
  const settings = state?.settings;
  const openTime = settings?.opens_at ? new Date(settings.opens_at).getTime() : null;
  const closeTime = settings?.closes_at ? new Date(settings.closes_at).getTime() : null;
  const canChoose = !!settings?.enabled && (!openTime || now >= openTime) && (!closeTime || now <= closeTime);
  const status = !settings ? "กำลังโหลดสถานะ" : !settings.enabled ? "แอดมินปิดระบบเลือกโต๊ะ" : openTime && now < openTime ? "ยังไม่ถึงเวลาเปิดเลือกโต๊ะ" : closeTime && now > closeTime ? "หมดเวลาเลือกโต๊ะแล้ว" : "เปิดให้เลือกโต๊ะ";

  if (!session) return <main className="shell"><section className="hero"><div className="eyebrow">CLASSROOM • SEAT BOOKING</div><h1>ระบบเลือกโต๊ะเรียน</h1><p>สำหรับนักเรียน 28 คน · 4 แถว แถวละ 7 โต๊ะ</p></section>
    <section className="panel login"><h2>{adminMode ? "เข้าสู่ระบบแอดมิน" : "เข้าสู่ระบบนักเรียน"}</h2>
     
{adminMode ? (
  <>
    <label>รหัสผ่านแอดมิน</label>
    <input
      type="password"
      value={password}
      onChange={e => setPassword(e.target.value)}
      placeholder="รหัสผ่านแอดมิน"
    />
    <button
      disabled={busy}
      onClick={() => post("/api/login-admin", { password })}
    >
      เข้าสู่ระบบ
    </button>
  </>
) : (
  <>
    <label>ชื่อหรือชื่อเล่น</label>
    <input
      value={name}
      onChange={e => setName(e.target.value)}
      placeholder="เช่น ฟ้า"
      maxLength={40}
    />
    <button
      disabled={busy || !name.trim()}
      onClick={() => post("/api/login-student", { name: name.trim() })}
    >
      เข้าเลือกโต๊ะ
    </button>
  </>
)}



      <button className="linkButton" onClick={()=>setAdminMode(!adminMode)}>{adminMode ? "กลับไปหน้าสำหรับนักเรียน" : "เข้าสู่ระบบแอดมิน"}</button>
      {message && <p className="notice">{message}</p>}
     <p className="muted small">
  กรอกชื่อหรือชื่อเล่นเพื่อเข้าเลือกโต๊ะ
</p> </section>
  </main>;   
 

  return <main className="shell"><section className="hero"><div className="eyebrow">CLASSROOM • SEAT BOOKING</div><h1>ระบบเลือกโต๊ะเรียน</h1><p>{session.role === "admin" ? "โหมดผู้ดูแลระบบ" : `สวัสดี ${session.name} (${session.studentId})`}</p><div className="status">{status}</div></section>
    {session.role === "admin" ? <section className="panel"><h2>ตั้งค่าเวลาเลือกโต๊ะ</h2><p className="muted">เวลาอ้างอิงจากเซิร์ฟเวอร์ ไม่ใช่นาฬิกาของนักเรียน</p><label>วันและเวลาเปิด</label><input type="datetime-local" value={opens} onChange={e=>setOpens(e.target.value)} /><label>วันและเวลาปิด</label><input type="datetime-local" value={closes} onChange={e=>setCloses(e.target.value)} /><label className="check"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} /> เปิดใช้งานระบบตามช่วงเวลาที่กำหนด</label><button disabled={busy} onClick={()=>post("/api/admin/settings",{opens_at:opens?new Date(opens).toISOString():null,closes_at:closes?new Date(closes).toISOString():null,enabled})}>บันทึกการตั้งค่า</button><p className="muted small">แอดมินควรจัดการรายชื่อนักเรียนผ่านฐานข้อมูลตามคู่มือ README</p></section> :
    <section className="panel"><div className="stats"><div><b>{state?.seats.filter(s=>!s.student_id).length ?? 28}</b><span>โต๊ะว่าง</span></div><div><b>{state?.seats.filter(s=>!!s.student_id).length ?? 0}</b><span>มีคนเลือกแล้ว</span></div></div><h2>เลือกโต๊ะของคุณ</h2><p className="muted">สีเขียว = ว่าง · สีเทา = มีคนเลือกแล้ว · สีน้ำเงิน = โต๊ะของคุณ</p><div className="grid">{(state?.seats || []).map(s=>{const mine=s.student_id===session.studentId; const occupied=!!s.student_id; return <button key={s.seat_no} className={`seat ${mine?"mine":occupied?"occupied":"available"}`} disabled={!mine && (occupied || !canChoose)} onClick={()=>mine ? setMessage("คุณเลือกโต๊ะนี้อยู่แล้ว") : post("/api/choose",{seatNo:s.seat_no})}><b>{s.seat_no}</b><span>{mine?"ของฉัน":occupied?"ไม่ว่าง":"ว่าง"}</span>{occupied && <small>{s.student_name}</small>}</button>;})}</div>{!canChoose && <p className="notice">ขณะนี้ยังเลือกหรือเปลี่ยนโต๊ะไม่ได้</p>}</section>}
    {message && <p className="notice">{message}</p>}<button className="secondary" disabled={busy} onClick={logout}>ออกจากระบบ</button><footer>ข้อมูลจะอัปเดตอัตโนมัติทุก 5 วินาที</footer></main>;
}