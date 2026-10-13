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

type BookingSettings = {
  id: number;
  opens_at: string | null;
  closes_at: string | null;
  enabled: boolean;
} | null;

const TOTAL_SEATS = 28;

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) =>
    String(value).padStart(2, "0");

  if (days > 0) {
    return `${days} วัน ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatThaiDateTime(timestamp: number | null) {
  if (timestamp === null || !Number.isFinite(timestamp)) {
    return "";
  }

  return new Date(timestamp).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default function SeatApp() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [activeStudentId, setActiveStudentId] = useState("");
  const [activeName, setActiveName] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // ข้อมูลเวลาเปิดและปิดการเลือกโต๊ะ
  const [bookingSettings, setBookingSettings] =
    useState<BookingSettings>(null);

  // ใช้เวลาจากเซิร์ฟเวอร์ช่วยให้ตัวนับถอยหลังแม่นยำขึ้น
  const [clock, setClock] = useState(Date.now());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // โหลดสถานะโต๊ะและเวลาเปิดจาก API
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
      setBookingSettings(result.settings ?? null);

      // เทียบเวลาจากเซิร์ฟเวอร์กับเวลาบนอุปกรณ์
      const serverTimestamp = Date.parse(result.now);

      if (Number.isFinite(serverTimestamp)) {
        setServerTimeOffset(serverTimestamp - Date.now());
      }

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

  // อัปเดตนาฬิกาทุกวินาที
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // โหลดครั้งแรกและตรวจสถานะฐานข้อมูลทุก 15 วินาที
  useEffect(() => {
    async function initialize() {
      await refreshState();
      setReady(true);
    }

    void initialize();

    const refreshTimer = window.setInterval(() => {
      void refreshState();
    }, 15000);

    return () => window.clearInterval(refreshTimer);
  }, [refreshState]);

  // คำนวณสถานะเวลาเปิดเลือกโต๊ะ
  const nowMs = clock + serverTimeOffset;

  const opensAtMs = bookingSettings?.opens_at
    ? Date.parse(bookingSettings.opens_at)
    : null;

  const closesAtMs = bookingSettings?.closes_at
    ? Date.parse(bookingSettings.closes_at)
    : null;

  const isBeforeOpen =
    opensAtMs !== null &&
    Number.isFinite(opensAtMs) &&
    nowMs < opensAtMs;

  const isAfterClose =
    closesAtMs !== null &&
    Number.isFinite(closesAtMs) &&
    nowMs >= closesAtMs;

  const isBookingOpen =
    bookingSettings?.enabled === true &&
    !isBeforeOpen &&
    !isAfterClose;

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

    if (!isBookingOpen) {
      if (isBeforeOpen) {
        setMessage("ยังไม่ถึงเวลาเปิดเลือกโต๊ะ");
      } else if (isAfterClose) {
        setMessage("หมดเวลาการเลือกโต๊ะแล้ว");
      } else {
        setMessage("ระบบเลือกโต๊ะยังไม่เปิด กรุณาติดต่อแอดมิน");
      }

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

      {/* สถานะเวลาเปิดระบบ */}
      <section className="panel" aria-live="polite">
        {!bookingSettings ? (
          <>
            <h2>กำลังตรวจสอบเวลาเปิดระบบ</h2>
            <p className="muted">
              ไม่พบข้อมูลกำหนดเวลา กรุณาตรวจสอบการตั้งค่าระบบ
            </p>
          </>
        ) : isBeforeOpen ? (
          <>
            <h2>ระบบจะเปิดให้เลือกโต๊ะ</h2>

            <p className="muted">
              กำหนดเปิดเวลา {formatThaiDateTime(opensAtMs)}
            </p>

            <div
              style={{
                textAlign: "center",
                margin: "20px 0",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(2rem, 8vw, 3.5rem)",
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.04em",
                }}
              >
                {formatCountdown(opensAtMs! - nowMs)}
              </div>

              <p className="muted">
                วัน : ชั่วโมง : นาที : วินาที
              </p>
            </div>

            {bookingSettings.enabled ? (
              <p className="muted">
                เมื่อเวลานับถอยหลังหมด ระบบจะเปิดให้เลือกโต๊ะอัตโนมัติ
              </p>
            ) : (
              <p className="notice">
                ระบบยังปิดอยู่ ต้องเปิดสถานะระบบในหน้าแอดมินไว้ล่วงหน้า
                จึงจะเลือกโต๊ะได้เมื่อถึงเวลา
              </p>
            )}
          </>
        ) : isAfterClose ? (
          <>
            <h2>หมดเวลาการเลือกโต๊ะแล้ว</h2>
            <p className="muted">
              ขณะนี้เลยเวลาปิดรับเลือกโต๊ะแล้ว
            </p>
          </>
        ) : !bookingSettings.enabled ? (
          <>
            <h2>ระบบเลือกโต๊ะยังปิดอยู่</h2>
            <p className="muted">
              กรุณารอให้แอดมินเปิดระบบ
            </p>
          </>
        ) : (
          <>
            <h2>ระบบเปิดให้เลือกโต๊ะแล้ว!</h2>
            <p className="muted">
              สามารถเข้าสู่ระบบและเลือกโต๊ะที่ว่างได้เลย
            </p>
          </>
        )}
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

          {!isBookingOpen && (
            <p className="notice">
              {isBeforeOpen
                ? "ยังไม่ถึงเวลาเปิดเลือกโต๊ะ"
                : isAfterClose
                  ? "หมดเวลาการเลือกโต๊ะแล้ว"
                  : "ระบบเลือกโต๊ะยังปิดอยู่"}
            </p>
          )}

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
                  disabled={
                    !!booking ||
                    loading ||
                    !isBookingOpen
                  }
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