"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TinDoanhNghiep } from "@/lib/mofi";
import { useTheoDoi } from "@/lib/theo-doi";

const MUC_DO: Record<TinDoanhNghiep["mucDo"], { nhan: string; kieu: string }> = {
  cao: { nhan: "Quan trọng", kieu: "border-nhan bg-nhan text-white" },
  vua: { nhan: "Đáng chú ý", kieu: "border-vien text-chu" },
  thap: { nhan: "Thông thường", kieu: "border-vien text-chu-phu" },
};

const ngayVN = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// Danh sách tin công bố: lọc theo loại tin, chỉ tin quan trọng, mã theo dõi, tìm theo mã
export function TinClient({ tin }: { tin: TinDoanhNghiep[] }) {
  const [loai, setLoai] = useState("");
  const [quanTrong, setQuanTrong] = useState(false);
  const [chiTheoDoi, setChiTheoDoi] = useState(false);
  const [tuKhoa, setTuKhoa] = useState("");
  const theoDoi = useTheoDoi();

  const dsLoai = useMemo(() => {
    const dem = new Map<string, number>();
    for (const t of tin) dem.set(t.loai, (dem.get(t.loai) ?? 0) + 1);
    return [...dem.entries()].sort((a, b) => b[1] - a[1]);
  }, [tin]);

  // Gom theo ngày công bố
  const theoNgay = useMemo(() => {
    const tk = tuKhoa.trim().toUpperCase();
    const loc = tin.filter(
      (t) =>
        (!loai || t.loai === loai) &&
        (!quanTrong || t.mucDo === "cao") &&
        (!chiTheoDoi || theoDoi.includes(t.ma)) &&
        (!tk || t.ma.includes(tk) || t.tieuDe.toUpperCase().includes(tk)),
    );
    const nhom = new Map<string, TinDoanhNghiep[]>();
    for (const t of loc) {
      if (!nhom.has(t.ngay)) nhom.set(t.ngay, []);
      nhom.get(t.ngay)!.push(t);
    }
    return [...nhom.entries()];
  }, [tin, loai, quanTrong, chiTheoDoi, theoDoi, tuKhoa]);

  const nut = (dang: boolean) =>
    `h-8 border px-3 text-[12px] font-medium whitespace-nowrap ${
      dang ? "border-nhan bg-nhan text-white" : "border-vien text-chu-phu hover:text-chu"
    }`;

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={tuKhoa}
          onChange={(e) => setTuKhoa(e.target.value)}
          placeholder="Tìm mã hoặc nội dung…"
          className="h-8 w-full border border-vien bg-nen px-3 outline-none focus:border-nhan sm:w-60"
        />
        <button onClick={() => setQuanTrong((x) => !x)} className={nut(quanTrong)}>
          Chỉ tin quan trọng
        </button>
        <button onClick={() => setChiTheoDoi((x) => !x)} className={nut(chiTheoDoi)}>
          Mã đang theo dõi
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => setLoai("")} className={nut(loai === "")}>
          Tất cả ({tin.length})
        </button>
        {dsLoai.map(([ten, so]) => (
          <button key={ten} onClick={() => setLoai(ten)} className={nut(loai === ten)}>
            {ten} ({so})
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {theoNgay.map(([ngay, ds]) => (
          <section key={ngay}>
            <h2 className="flex items-center gap-2 text-[12px] font-bold tracking-wider text-chu-phu uppercase">
              <span className="h-3 w-1 bg-nhan" />
              {ngayVN(ngay)}
            </h2>
            <ul className="mt-2 border border-vien">
              {ds.map((t, i) => (
                <li key={`${t.ma}-${i}`} className="flex gap-3 border-b border-vien px-3 py-2.5 last:border-b-0 hover:bg-nhan-nhat">
                  <Link href={`/co-phieu/${t.ma}`} className="w-12 shrink-0 font-bold text-nhan hover:underline">
                    {t.ma}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className={t.mucDo === "cao" ? "font-semibold" : ""}>{t.tieuDe}</p>
                    <p className="mt-1 flex flex-wrap gap-2 text-[11px]">
                      <span className="border border-vien px-1.5 text-chu-phu">{t.loai}</span>
                      <span className={`border px-1.5 ${MUC_DO[t.mucDo].kieu}`}>{MUC_DO[t.mucDo].nhan}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {theoNgay.length === 0 && <p className="border border-dashed border-vien p-8 text-center text-chu-phu">Không có tin phù hợp.</p>}
      </div>
    </>
  );
}
