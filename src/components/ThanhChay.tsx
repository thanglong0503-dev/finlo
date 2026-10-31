"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import type { MucChay } from "@/app/api/thanh-chay/route";
import { dinhDangGia, useLuongBinance } from "@/lib/binance";
import { useLamMoi } from "@/lib/lam-moi";

// Dải giá chạy ngang dưới header (kiểu OKX): chỉ số, vàng, cổ phiếu sôi động và tiền số theo từng giây.
// Rê chuột vào thì dừng để bấm; người dùng tắt chuyển động trong hệ điều hành thì thành dải cuộn tay.

const TIEN_SO = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "TON", "ADA"];
const LUONG = TIEN_SO.map((m) => `${m.toLowerCase()}usdt@miniTicker`);

export function ThanhChay() {
  const duongDan = usePathname();
  const [ds, setDs] = useState<MucChay[]>([]);
  const [coin, setCoin] = useState<Record<string, { gia: number; pt: number }>>({});
  // Trạm biểu đồ vừa khít một màn hình nên không chèn thêm dải giá
  const an = duongDan.startsWith("/bieu-do");

  useLamMoi(
    () =>
      fetch("/api/thanh-chay")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: MucChay[] | null) => Array.isArray(d) && setDs(d))
        .catch(() => {}),
    60_000,
    { taiNgay: true },
  );

  const nhanTin = useCallback((_: string, duLieu: unknown) => {
    const x = duLieu as { s: string; c: string; o: string };
    const ma = x.s.replace(/USDT$/, "");
    const gia = Number(x.c);
    const mo = Number(x.o);
    setCoin((cu) => (cu[ma]?.gia === gia ? cu : { ...cu, [ma]: { gia, pt: mo ? (gia / mo - 1) * 100 : 0 } }));
  }, []);
  useLuongBinance(an ? [] : LUONG, nhanTin);

  if (an) return null;
  const chiSo = ds.filter((m) => m.href.startsWith("/chi-so") || m.href === "/kim-loai-quy");
  const coPhieu = ds.filter((m) => m.href.startsWith("/co-phieu"));
  const tienSo: MucChay[] = TIEN_SO.filter((m) => coin[m]).map((m) => ({
    nhan: m,
    gia: dinhDangGia(coin[m].gia),
    phanTram: coin[m].pt,
    href: `/tai-san-so/${m}`,
  }));
  const muc = [...chiSo, ...tienSo, ...coPhieu];
  if (muc.length === 0) return <div className="h-[34px] border-b border-vien bg-nen-phu" aria-hidden />;

  const day = (an2: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={an2 || undefined}>
      {muc.map((m) => (
        <li key={m.nhan}>
          <Link
            href={m.href}
            tabIndex={an2 ? -1 : undefined}
            className="flex h-[34px] items-center gap-2 px-4 text-[12px] whitespace-nowrap hover:bg-nen-noi"
          >
            <span className="font-semibold">{m.nhan}</span>
            <span className="so text-chu-phu">{m.gia}</span>
            {m.phanTram != null && (
              <span className={`so font-medium ${m.phanTram > 0 ? "text-tang" : m.phanTram < 0 ? "text-giam" : "text-chu-phu"}`}>
                {m.phanTram > 0 ? "+" : ""}
                {m.phanTram.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="thanh-chay relative overflow-hidden border-b border-vien bg-nen-phu" aria-label="Giá thị trường">
      {/* Hai bản giống nhau nối đuôi: trượt hết một bản là quay về đầu, không thấy chỗ nối */}
      <div className="thanh-chay-ray flex w-max" style={{ animationDuration: `${Math.max(40, muc.length * 3.2)}s` }}>
        {day(false)}
        {day(true)}
      </div>
    </div>
  );
}
