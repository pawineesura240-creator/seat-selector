
"use client";

import { useEffect, useState } from "react";

type Booking = {
  name: string;
  seat_no: number;
};

const STORAGE_KEY = "classroom-seat-bookings";
const TOTAL_SEATS = 28;

export default function SeatApp() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [name, setName] = useState("");
  const [activeName, setActiveName] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  // โหลดข้อมูลที่เคยบันทึกไว้ในเบราว์เซอร์
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setBookings(parsed);
        }
      }
    } catch {
      setMessage("อ่านข้อมูลเดิมไม่สำเร็จ");
    }

    setReady(true);
  }, []);

  // บันทึกข้อมูลทุกครั้งที่รายการจองเปลี่ยน
  useEffect(() => {
    if (ready) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    }
  }, [bookings, ready]);

  function enter() {
    const studentName = name.trim();

    if (!studentName) {
      setMessage("กรุณากรอกชื่อก่อน");
      return;
    }

    if (studentName.length > 40) {
      setMessage("ชื่อต้องไม่เกิน 40 ตัวอักษร");
      return;
    }

    const existing = bookings.find(
      (b) => b.name.toLowerCase() === studentName.toLowerCase()
    );

    setActiveName(studentName);

    if (existing) {
      setMessage(`คุณเลือกโต๊ะหมายเลข ${existing.seat_no} ไว้แล้ว`);
    } else {
      setMessage("เลือกโต๊ะที่ว่างได้เลย");
    }
  }

  function chooseSeat(seatNo: number) {
    if (!activeName) {
      setMessage("กรุณากรอกชื่อก่อน");
      return;
    }

    const existingName = bookings.find(
      (b) => b.name.toLowerCase() === activeName.toLowerCase()
    );

    if (existingName) {
      setMessage(`คุณเลือกโต๊ะหมายเลข ${existingName.seat_no} ไว้แล้ว`);
      return;
    }

    if (bookings.some((b) => b.seat_no === seatNo)) {
      setMessage("โต๊ะนี้มีคนเลือกแล้ว กรุณาเลือกโต๊ะอื่น");
      return;
    }

    const updated = [...bookings, { name: activeName, seat_no: seatNo }];

    setBookings(updated);
    setMessage(`จองโต๊ะหมายเลข ${seatNo} สำเร็จ`);
  }

  function changeName() {
    setActiveName("");
    setName("");
    setMessage("");
  }

  if (!ready) {
    return <main className="shell">กำลังโหลดข้อมูล...</main>;
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">CLASSROOM • SEAT BOOKING</div>
        <h1>ระบบเลือกโต๊ะเรียน</h1>
        <p>กรอกชื่อ เลือกโต๊ะ แล้วระบบจะบันทึกไว้ในเครื่องนี้</p>
      </section>

      <section className="panel">
        <h2>กรอกชื่อของคุณ</h2>

        <label htmlFor="student-name">ชื่อ - นามสกุล</label>
        <input
          id="student-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="พิมพ์ชื่อของคุณ"
          maxLength={40}
          disabled={!!activeName}
        />

        {!activeName ? (
          <button onClick={enter} disabled={!name.trim()}>
            เข้าเลือกโต๊ะ
          </button>
        ) : (
          <div>
            <p>สวัสดี {activeName}</p>
            <button className="secondary" onClick={changeName}>
              เปลี่ยนชื่อ
            </button>
          </div>
        )}

        {message && <p className="notice">{message}</p>}
      </section>

      {activeName && (
        <section className="panel">
          <div className="stats">
            <div>
              <b>{TOTAL_SEATS - bookings.length}</b>
              <span>โต๊ะว่าง</span>
            </div>
            <div>
              <b>{bookings.length}</b>
              <span>มีคนเลือกแล้ว</span>
            </div>
          </div>

          <h2>เลือกโต๊ะของคุณ</h2>
          <p className="muted">
            สีเขียว = ว่าง · สีเทา = มีคนเลือกแล้ว · สีน้ำเงิน = โต๊ะของคุณ
          </p>

          <div className="grid">
            {Array.from({ length: TOTAL_SEATS }, (_, i) => i + 1).map(
              (seatNo) => {
                const booking = bookings.find(
                  (b) => b.seat_no === seatNo
                );
                const mine =
                  booking?.name.toLowerCase() === activeName.toLowerCase();

                return (
                  <button
                    key={seatNo}
                    className={`seat ${
                      mine ? "mine" : booking ? "occupied" : "available"
                    }`}
                    disabled={!!booking}
                    onClick={() => chooseSeat(seatNo)}
                  >
                    <b>{seatNo}</b>
                    <span>
                      {mine ? "ของฉัน" : booking ? "ไม่ว่าง" : "ว่าง"}
                    </span>
                    {booking && <small>{booking.name}</small>}
                  </button>
                );
              }
            )}
          </div>
        </section>
      )}

      <footer>
        ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น
      </footer>
    </main>
  );
}
