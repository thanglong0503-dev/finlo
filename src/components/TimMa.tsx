"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Ma = { ma: string; ten: string; san: string };

// Tải danh sách mã một lần cho cả phiên, dùng chung giữa các ô tìm kiếm
let danhSach: Promise<Ma[]> | null = null;
function layDanhSach() {
  danhSach ??= fetch("/api/danh-sach-ma")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => {
      danhSach = null; // lỗi mạng: lần sau thử lại
      return [];
    });
  return danhSach;
}

// Bỏ dấu để gõ "sua viet nam" vẫn ra "Sữa Việt Nam"
const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export function TimMa({ nenToi = false, className = "" }: { nenToi?: boolean; className?: string }) {
  const router = useRouter();
  const o = useRef<HTMLInputElement>(null);
  const [ds, setDs] = useState<Ma[]>([]);
  const [q, setQ] = useState("");
  const [mo, setMo] = useState(false);
  const [chon, setChon] = useState(0);

  // Phím "/" ở bất kỳ đâu (trừ khi đang gõ) để nhảy vào ô tìm kiếm trên header
  useEffect(() => {
    if (!nenToi) return;
    const bamPhim = (e: KeyboardEvent) => {
      const dangGo = (e.target as HTMLElement).closest("input, textarea, [contenteditable]");
      if (e.key === "/" && !dangGo) {
        e.preventDefault();
        o.current?.focus();
      }
    };
    window.addEventListener("keydown", bamPhim);
    return () => window.removeEventListener("keydown", bamPhim);
  }, [nenToi]);

  const ketQua = useMemo(() => {
    const tk = boDau(q.trim());
    if (!tk) return [];
    const TK = tk.toUpperCase();
    return ds
      .map((m) => {
        const diem = m.ma === TK ? 0 : m.ma.startsWith(TK) ? 1 : boDau(m.ten).includes(tk) ? 2 : -1;
        return { m, diem };
      })
      .filter((x) => x.diem >= 0)
      .sort((a, b) => a.diem - b.diem || a.m.ma.localeCompare(b.m.ma))
      .slice(0, 8)
      .map((x) => x.m);
  }, [q, ds]);

  const den = (ma: string) => {
    setQ("");
    setMo(false);
    o.current?.blur();
    router.push(`/co-phieu/${ma}`);
  };

  const kieuO = nenToi
    ? "border-vien-toi bg-toi-phu text-chu-toi placeholder:text-chu-toi-phu focus:border-nhan-sang"
    : "border-vien bg-nen text-chu placeholder:text-chu-phu focus:border-nhan";

  return (
    <div className={`relative ${className}`}>
      <input
        ref={o}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setChon(0);
          setMo(true);
        }}
        onFocus={() => {
          setMo(true);
          layDanhSach().then(setDs);
        }}
        // Trì hoãn để kịp nhận cú bấm vào gợi ý trước khi đóng
        onBlur={() => setTimeout(() => setMo(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setChon((c) => Math.min(c + 1, ketQua.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setChon((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter") {
            const m = ketQua[chon] ?? (q.trim() ? { ma: q.trim().toUpperCase() } : null);
            if (m) den(m.ma);
          } else if (e.key === "Escape") {
            setMo(false);
            o.current?.blur();
          }
        }}
        placeholder={nenToi ? "Tra cứu mã…  /" : "Tra cứu mã cổ phiếu, ví dụ FPT hoặc sữa việt nam"}
        aria-label="Tra cứu mã cổ phiếu"
        className={`h-9 w-full border px-3 outline-none ${kieuO}`}
      />
      {mo && q.trim() && (
        <ul className="absolute top-full right-0 left-0 z-30 mt-1 min-w-64 border border-vien bg-nen text-chu shadow-lg">
          {ketQua.length === 0 ? (
            <li className="px-3 py-2.5 text-chu-phu">{ds.length ? "Không tìm thấy mã phù hợp" : "Đang tải danh sách mã…"}</li>
          ) : (
            ketQua.map((m, i) => (
              <li key={m.ma}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => den(m.ma)}
                  onMouseEnter={() => setChon(i)}
                  className={`flex w-full items-baseline gap-2 px-3 py-2 text-left ${
                    i === chon ? "bg-nhan-nhat" : ""
                  }`}
                >
                  <span className="w-12 shrink-0 font-semibold">{m.ma}</span>
                  <span className="truncate text-chu-phu">{m.ten}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-chu-phu">{m.san}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
