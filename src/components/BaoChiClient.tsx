"use client";

import Link from "next/link";
import { useState } from "react";
import type { BaiBao, ChuyenMuc } from "@/lib/bao-chi";
import { useTheoDoi } from "@/lib/theo-doi";

const MUC: { ma: "tat-ca" | ChuyenMuc; ten: string }[] = [
  { ma: "tat-ca", ten: "Tất cả" },
  { ma: "thi-truong", ten: "Thị trường" },
  { ma: "doanh-nghiep", ten: "Doanh nghiệp" },
  { ma: "phan-tich", ten: "Phân tích & nhận định" },
];

export const gioTin = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
    : "";

// Một tin: ảnh nhỏ, tiêu đề dẫn về bài gốc (mở tab mới), nguồn, giờ và mã liên quan
export function DongTin({ b, anAnh = false }: { b: BaiBao; anAnh?: boolean }) {
  return (
    <li className="flex gap-4 border-b border-vien px-4 py-3.5 last:border-b-0">
      {!anAnh && b.anh && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh đại diện từ báo gốc
        <img src={b.anh} alt="" loading="lazy" className="hidden h-[72px] w-28 shrink-0 rounded-xl bg-nen-noi object-cover sm:block" />
      )}
      <div className="min-w-0 flex-1">
        <a href={b.link} target="_blank" rel="noopener noreferrer" className="font-semibold leading-snug hover:text-nhan">
          {b.tieuDe}
        </a>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-chu-phu">
          <span>{b.nguon}</span>
          <span>·</span>
          <span className="tabular-nums">{gioTin(b.luc)}</span>
          {b.ma.map((m) => (
            <Link key={m} href={`/co-phieu/${m}`} prefetch={false} className="rounded-full bg-nhan-nhat px-2 py-0.5 font-semibold text-nhan hover:underline">
              {m}
            </Link>
          ))}
        </p>
      </div>
    </li>
  );
}

export function BaoChiClient({ tin }: { tin: BaiBao[] }) {
  const [muc, setMuc] = useState<"tat-ca" | ChuyenMuc>("tat-ca");
  const [ma, setMa] = useState("");
  const [chiTheoDoi, setChiTheoDoi] = useState(false);
  const [soTin, setSoTin] = useState(40);
  const theoDoi = useTheoDoi();
  const loc = ma.trim().toUpperCase();
  const ds = tin.filter(
    (b) =>
      (muc === "tat-ca" || b.muc === muc) &&
      (!loc || b.ma.includes(loc) || b.tieuDe.toUpperCase().includes(loc)) &&
      (!chiTheoDoi || b.ma.some((m) => theoDoi.includes(m))),
  );
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full bg-nen-noi p-1">
          {MUC.map((m) => (
            <button
              key={m.ma}
              onClick={() => setMuc(m.ma)}
              className={`h-8 rounded-full px-3.5 font-medium whitespace-nowrap ${muc === m.ma ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
            >
              {m.ten}
            </button>
          ))}
        </div>
        <input
          value={ma}
          onChange={(e) => setMa(e.target.value)}
          placeholder="Lọc theo mã hoặc từ khoá"
          className="h-9 w-56 rounded-full border border-vien bg-nen px-4 outline-none focus:border-nhan"
        />
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={chiTheoDoi} onChange={(e) => setChiTheoDoi(e.target.checked)} className="accent-[var(--nhan)]" />
          Chỉ tin về mã tôi theo dõi
        </label>
      </div>
      <ul className="mt-4 rounded-2xl border border-vien">
        {ds.slice(0, soTin).map((b) => (
          <DongTin key={b.link} b={b} />
        ))}
        {ds.length === 0 && <li className="px-4 py-8 text-center text-chu-phu">Không có tin phù hợp.</li>}
      </ul>
      {ds.length > soTin && (
        <button onClick={() => setSoTin((x) => x + 40)} className="mt-3 h-9 rounded-full border border-vien px-4 font-semibold hover:border-nhan">
          Xem thêm
        </button>
      )}
    </>
  );
}
