
"use client";

import { useCallback, useEffect, useState } from "react";

type Booking = {
  student_id: string;
  name: string;
  seat_no: number;
};

type SeatRow = {
  seat_no: number;
  student_id: string | number | null;
  student_name: string | null;
};

type AppSession = {
  role: string;
  studentId?: string | number;
  name?: string;
};

const TOTAL_SEATS = 28;

export default function SeatApp() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [activeStudentId, setActiveStudentId] = useState("");
  const [activeName, setActiveName] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // โหลดสถานะโต๊ะจาก API
  const refreshState = useCallback(async () => {
    try {
      const response = await fetch("/api/state", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "โหลดข้อมูลโต๊ะไม่สำเร็จ");
      }

      const seats: SeatRow[] = Array.isArray(result.seats)
        ? result.seats
        : [];

      const selected: Booking[] = seats
        .filter(
          (seat) =>
            seat.student_id !== null &&
            seat.student_name !== null
        )
        .map((seat) => ({
          student_id: String(seat.student_id),
          name: seat.student_name as string,
          seat_no: Number(seat.seat_no),
        }));

      setBookings(selected);

      const session: AppSession | null = result.session;

      if (session?.role === "student") {
        setActiveStudentId(String(session.studentId ?? ""));
        setActiveName(session.name ?? "");
      } else {
        setActiveStudentId("");
        setActiveName("");
      }

      return true;
    } catch (error) {
      console.error("refreshState:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "โหลดข้อมูลไม่สำเร็จ"
      );
      return false;
    }
  }, []);

  useEffect(() => {
    async function initialize() {
      await refreshState();
      setReady(true);
    }

    void initialize();
  }, [refreshState]);

  // เข้าสู่ระบบนักเรียน
  async function enter() {
    const id = studentId.trim();
    const studentName = name.trim();

    if (!id || !studentName) {
      setMessage("กรุณากรอกเลขประจำตัวและชื่อ-นามสกุล");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/login-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: id,
          name: studentName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      setActiveStudentId(id);
      setActiveName(studentName);
      setMessage(result.message || "เข้าสู่ระบบสำเร็จ");

      await refreshState();
    } catch (error) {
      console.error("enter:", error);
      setMessage("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  // เลือกโต๊ะ
  async function chooseSeat(seatNo: number) {
    if (!activeStudentId || !activeName) {
      setMessage("กรุณาเข้าสู่ระบบก่อน");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/choose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ seatNo }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "เลือกโต๊ะไม่สำเร็จ");
        await refreshState();
        return;
      }

      setMessage(result.message || `เลือกโต๊ะหมายเลข ${seatNo} สำเร็จ`);
      await refreshState();
    } catch (error) {
      console.error("chooseSeat:", error);
      setMessage("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  // ออกจากระบบ
  async function changeName() {
    setLoading(true);

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "ออกจากระบบไม่สำเร็จ");
        return;
      }

      setActiveStudentId("");
      setActiveName("");
      setStudentId("");
      setName("");
      setMessage("ออกจากระบบแล้ว");
    } catch (error) {
      console.error("changeName:", error);
      setMessage("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <main className="shell">กำลังโหลดข้อมูล...</main>;
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">CLASSROOM • SEAT BOOKING</div>
        <h1>ระบบเลือกโต๊ะเรียน</h1>
        <p>เข้าสู่ระบบด้วยเลขประจำตัวและชื่อ-นามสกุล</p>
      </section>

      <section className="panel">
        <h2>เข้าสู่ระบบนักเรียน</h2>

        <label htmlFor="student-id">เลขประจำตัวนักเรียน</label>
        <input
          id="student-id"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          placeholder="กรอกเลขประจำตัว"
          disabled={!!activeName || loading}
        />

        <label htmlFor="student-name">ชื่อ - นามสกุล</label>
        <input
          id="student-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="กรอกชื่อ-นามสกุลให้ตรงกับฐานข้อมูล"
          maxLength={100}
          disabled={!!activeName || loading}
        />

        {!activeName ? (
          <button
            onClick={enter}
            disabled={!studentId.trim() || !name.trim() || loading}
          >
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบและเลือกโต๊ะ"}
          </button>
        ) : (
          <div>
            <p>สวัสดี {activeName}</p>
            <button
              className="secondary"
              onClick={changeName}
              disabled={loading}
            >
              ออกจากระบบ / เปลี่ยนผู้ใช้
            </button>
          </div>
        )}

        {message && <p className="notice">{message}</p>}
      </section>

      {activeName && (
        <section className="panel">
          <div className="stats">
            <div>
              <b>{Math.max(0, TOTAL_SEATS - bookings.length)}</b>
              <span>โต๊ะว่าง</span>
            </div>
            <div>
              <b>{bookings.length}</b>
              <span>มีคนเลือกแล้ว</span>
            </div>
          </div>

          <h2>เลือกโต๊ะของคุณ</h2>
          <p className="muted">
            สีเขียว = ว่าง · สีเทา = มีคนเลือกแล้ว ·
            สีน้ำเงิน = โต๊ะของคุณ
          </p>

          <div className="grid">
            {Array.from({ length: TOTAL_SEATS }, (_, index) => {
              const seatNo = index + 1;
              const booking = bookings.find(
                (item) => item.seat_no === seatNo
              );
              const mine =
                booking?.student_id === activeStudentId;

              return (
                <button
                  key={seatNo}
                  className={`seat ${
                    mine
                      ? "mine"
                      : booking
                        ? "occupied"
                        : "available"
                  }`}
                  disabled={!!booking || loading}
                  onClick={() => chooseSeat(seatNo)}
                >
                  <b>{seatNo}</b>
                  <span>
                    {mine
                      ? "ของฉัน"
                      : booking
                        ? "ไม่ว่าง"
                        : "ว่าง"}
                  </span>
                  {booking && <small>{booking.name}</small>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <footer>
        ข้อมูลที่นั่งอ่านและบันทึกผ่านฐานข้อมูล Supabase
      </footer>
    </main>
  );
}
