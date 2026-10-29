"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MENU } from "@/lib/menu";

type Ma = { ma: string; ten: string; san: string };
type KetQua = { loai: "trang" | "ma"; href: string; chinh: string; phu: string; san?: string };

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

  // Phím "/" hoặc Ctrl/Cmd+K ở bất kỳ đâu (trừ khi đang gõ) để nhảy vào ô tìm kiếm trên header
  useEffect(() => {
    if (!nenToi) return;
    const bamPhim = (e: KeyboardEvent) => {
      const dangGo = (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
      const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      if (ctrlK || (e.key === "/" && !dangGo)) {
        e.preventDefault();
        o.current?.focus();
        o.current?.select();
      }
    };
    window.addEventListener("keydown", bamPhim);
    return () => window.removeEventListener("keydown", bamPhim);
  }, [nenToi]);

  // Kết quả gồm trang của Finlo (khớp tên, mô tả, từ khoá) và mã cổ phiếu
  const ketQua = useMemo((): KetQua[] => {
    const tk = boDau(q.trim());
    if (!tk) return [];
    const TK = tk.toUpperCase();
    const trang = (nenToi ? MENU : [])
      .filter((t) => tk.length >= 2 && boDau(`${t.nhan} ${t.moTa} ${t.tuKhoa ?? ""}`).includes(tk))
      .slice(0, 3)
      .map((t): KetQua => ({ loai: "trang", href: t.href, chinh: t.nhan, phu: t.moTa }));
    const ma = ds
      .map((m) => ({ m, diem: m.ma === TK ? 0 : m.ma.startsWith(TK) ? 1 : boDau(m.ten).includes(tk) ? 2 : -1 }))
      .filter((x) => x.diem >= 0)
      .sort((a, b) => a.diem - b.diem || a.m.ma.localeCompare(b.m.ma))
      .slice(0, 7)
      .map(({ m }): KetQua => ({ loai: "ma", href: `/co-phieu/${m.ma}`, chinh: m.ma, phu: m.ten, san: m.san }));
    // Gõ đúng mã thì mã lên trước, còn lại ưu tiên trang
    return ma[0]?.chinh === TK ? [...ma, ...trang] : [...trang, ...ma];
  }, [q, ds, nenToi]);

  const den = (href: string) => {
    setQ("");
    setMo(false);
    // Bỏ focus ô đang gõ (không đọc ref trong hàm gọi lúc vẽ)
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(href);
  };

  const kieuO = nenToi
    ? "border-transparent bg-toi-phu text-chu-toi placeholder:text-chu-toi-phu focus:border-nhan-sang"
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
            const k = ketQua[chon];
            if (k) den(k.href);
            else if (q.trim()) den(`/co-phieu/${q.trim().toUpperCase()}`);
          } else if (e.key === "Escape") {
            setMo(false);
            o.current?.blur();
          }
        }}
        placeholder={nenToi ? "Tìm mã, trang…" : "Tra cứu mã cổ phiếu, ví dụ FPT hoặc sữa việt nam"}
        aria-label={nenToi ? "Tìm mã cổ phiếu hoặc trang" : "Tra cứu mã cổ phiếu"}
        className={`h-9 w-full rounded-full border px-4 outline-none ${nenToi ? "pr-16" : ""} ${kieuO}`}
      />
      {nenToi && !q && (
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-vien-toi px-1.5 text-[10px] text-chu-toi-phu sm:block">
          Ctrl K
        </kbd>
      )}
      {mo && q.trim() && (
        <ul className="absolute top-full right-0 left-0 z-30 mt-2 min-w-72 overflow-hidden rounded-xl border border-vien bg-nen-phu text-chu shadow-2xl">
          {ketQua.length === 0 ? (
            <li className="px-3 py-2.5 text-chu-phu">{ds.length ? "Không tìm thấy mã hoặc trang phù hợp" : "Đang tải danh sách mã…"}</li>
          ) : (
            ketQua.map((k, i) => (
              <li key={k.href}>
                {(i === 0 || ketQua[i - 1].loai !== k.loai) && (
                  <p className="border-t border-vien px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-chu-phu uppercase first:border-t-0">
                    {k.loai === "trang" ? "Trang" : "Mã cổ phiếu"}
                  </p>
                )}
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => den(k.href)}
                  onMouseEnter={() => setChon(i)}
                  className={`flex w-full items-baseline gap-2 px-3 py-2 text-left ${i === chon ? "bg-nhan-nhat" : ""}`}
                >
                  <span className={`shrink-0 font-semibold ${k.loai === "trang" ? "text-nhan" : "w-12"}`}>{k.chinh}</span>
                  <span className="truncate text-chu-phu">{k.phu}</span>
                  {k.san && <span className="ml-auto shrink-0 text-[11px] text-chu-phu">{k.san}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
