"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { LOAI_SU_KIEN, type LoaiSuKien, type SuKien } from "@/lib/su-kien";
import { useTheoDoi } from "@/lib/theo-doi";

const THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const TEN_THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const MAU = Object.fromEntries(LOAI_SU_KIEN.map((l) => [l.ma, l.mau])) as Record<LoaiSuKien, string>;
const TEN = Object.fromEntries(LOAI_SU_KIEN.map((l) => [l.ma, l.ten])) as Record<LoaiSuKien, string>;

// Ngày hôm nay theo giờ Việt Nam; trước khi trình duyệt chạy thì để trống
const khongDoi = () => () => {};
const homNayVN = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

const ngayDep = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  return `${TEN_THU[d.getUTCDay()]}, ${ymd.slice(8)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
};

function DongSuKien({ s }: { s: SuKien }) {
  return (
    <li className="flex gap-3 border-b border-vien px-4 py-3 last:border-b-0">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: MAU[s.loai] }} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2">
          {s.ma && (
            <Link href={`/co-phieu/${s.ma}`} prefetch={false} className="font-bold text-nhan hover:underline">
              {s.ma}
            </Link>
          )}
          <span className={s.loai === "nghi" ? "font-semibold" : ""}>{s.tieuDe}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-chu-phu">
          {TEN[s.loai]}
          {s.ma && " · ngày công bố"}
          {s.duKien && " · dự kiến"}
          {s.ghiChu && ` · ${s.ghiChu}`}
        </p>
      </div>
    </li>
  );
}

export function LichSuKien({ suKien }: { suKien: SuKien[] }) {
  const homNay = useSyncExternalStore(khongDoi, homNayVN, () => "");
  const theoDoi = useTheoDoi();
  const [thang, setThang] = useState<string | null>(null); // YYYY-MM đang xem
  const [chon, setChon] = useState<string | null>(null);
  const [tat, setTat] = useState<LoaiSuKien[]>([]);
  const [chiTheoDoi, setChiTheoDoi] = useState(false);

  if (!homNay) return <div className="h-[600px] animate-pulse rounded-2xl bg-nen-phu" />;

  const thangXem = thang ?? homNay.slice(0, 7);
  const loc = suKien.filter((s) => !tat.includes(s.loai) && (!chiTheoDoi || !s.ma || theoDoi.includes(s.ma)));
  const theoNgay = new Map<string, SuKien[]>();
  for (const s of loc) theoNgay.set(s.ngay, [...(theoNgay.get(s.ngay) ?? []), s]);

  // Lưới tháng bắt đầu từ thứ Hai
  const [n, t] = thangXem.split("-").map(Number);
  const dau = new Date(Date.UTC(n, t - 1, 1));
  const lech = (dau.getUTCDay() + 6) % 7;
  const soNgay = new Date(Date.UTC(n, t, 0)).getUTCDate();
  const o: (string | null)[] = [
    ...Array.from({ length: lech }, () => null),
    ...Array.from({ length: soNgay }, (_, i) => `${thangXem}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (o.length % 7) o.push(null);
  const doiThang = (buoc: number) => {
    const d = new Date(Date.UTC(n, t - 1 + buoc, 1));
    setThang(d.toISOString().slice(0, 7));
    setChon(null);
  };

  const sapToi = loc.filter((s) => s.ngay >= homNay && !s.ma).slice(0, 12);
  const dnGanDay = loc.filter((s) => s.ma).sort((a, b) => b.ngay.localeCompare(a.ngay)).slice(0, 20);
  const ngayChon = chon ? (theoNgay.get(chon) ?? []) : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {LOAI_SU_KIEN.map((l) => {
          const bat = !tat.includes(l.ma);
          return (
            <button
              key={l.ma}
              onClick={() => setTat(bat ? [...tat, l.ma] : tat.filter((x) => x !== l.ma))}
              className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] ${bat ? "border-vien" : "border-transparent text-chu-phu opacity-50"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: l.mau }} />
              {l.ten}
            </button>
          );
        })}
        <label className="ml-auto flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={chiTheoDoi} onChange={(e) => setChiTheoDoi(e.target.checked)} className="accent-[var(--nhan)]" />
          Chỉ mã tôi theo dõi
        </label>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-vien p-4">
          <div className="flex items-center justify-between">
            <button onClick={() => doiThang(-1)} aria-label="Tháng trước" className="h-9 w-9 rounded-full bg-nen-noi">
              ‹
            </button>
            <p className="text-[17px] font-bold">
              Tháng {t}/{n}
            </p>
            <button onClick={() => doiThang(1)} aria-label="Tháng sau" className="h-9 w-9 rounded-full bg-nen-noi">
              ›
            </button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[12px] text-chu-phu">
            {THU.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {o.map((ngay, i) => {
              if (!ngay) return <span key={i} />;
              const ds = theoNgay.get(ngay) ?? [];
              const nghi = ds.some((s) => s.loai === "nghi");
              const cuoiTuan = i % 7 >= 5;
              return (
                <button
                  key={ngay}
                  onClick={() => setChon(ngay === chon ? null : ngay)}
                  className={`flex min-h-16 flex-col items-start rounded-xl p-1.5 text-left sm:min-h-20 ${
                    ngay === chon ? "bg-chu text-nen" : ngay === homNay ? "bg-nhan-nhat" : "hover:bg-nen-phu"
                  }`}
                >
                  <span
                    className={`text-[13px] font-semibold tabular-nums ${
                      ngay === chon ? "" : nghi ? "text-giam" : cuoiTuan ? "text-chu-phu" : ngay === homNay ? "text-nhan" : ""
                    }`}
                  >
                    {Number(ngay.slice(8))}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-0.5">
                    {ds.slice(0, 6).map((s, k) => (
                      <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: MAU[s.loai] }} />
                    ))}
                  </span>
                  {ds.length > 0 && (
                    <span className="mt-auto hidden w-full truncate text-[10px] leading-tight opacity-80 sm:block">
                      {ds.length === 1 ? (ds[0].ma ?? TEN[ds[0].loai]) : `${ds.length} sự kiện`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="min-w-0">
          {ngayChon ? (
            <>
              <p className="font-semibold">{ngayDep(chon!)}</p>
              <ul className="mt-3 rounded-2xl border border-vien">
                {ngayChon.length ? ngayChon.map((s, i) => <DongSuKien key={i} s={s} />) : <li className="px-4 py-6 text-chu-phu">Không có sự kiện.</li>}
              </ul>
            </>
          ) : (
            <>
              <p className="font-semibold">Sắp tới</p>
              <ul className="mt-3 rounded-2xl border border-vien">
                {sapToi.map((s, i) => (
                  <li key={i} className="flex gap-3 border-b border-vien px-4 py-3 last:border-b-0">
                    <span className="w-14 shrink-0 text-[12px] text-chu-phu tabular-nums">
                      {s.ngay.slice(8)}/{s.ngay.slice(5, 7)}
                    </span>
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: MAU[s.loai] }} />
                    <span className="min-w-0">
                      {s.tieuDe}
                      {s.duKien && <span className="text-chu-phu"> (dự kiến)</span>}
                    </span>
                  </li>
                ))}
                {sapToi.length === 0 && <li className="px-4 py-6 text-chu-phu">Không có sự kiện.</li>}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">Công bố gần đây của doanh nghiệp</h2>
        <p className="mt-1 text-chu-phu">Cổ tức & quyền, đại hội cổ đông, kết quả kinh doanh. Ngày là ngày công bố thông tin.</p>
        <ul className="mt-4 rounded-2xl border border-vien">
          {dnGanDay.map((s, i) => (
            <li key={i} className="flex gap-3 border-b border-vien px-4 py-3 last:border-b-0">
              <span className="w-14 shrink-0 text-[12px] text-chu-phu tabular-nums">
                {s.ngay.slice(8)}/{s.ngay.slice(5, 7)}
              </span>
              <Link href={`/co-phieu/${s.ma}`} prefetch={false} className="w-12 shrink-0 font-bold text-nhan hover:underline">
                {s.ma}
              </Link>
              <span className="min-w-0 flex-1">{s.tieuDe}</span>
              <span className="hidden shrink-0 items-center gap-1.5 text-[12px] text-chu-phu sm:flex">
                <span className="h-2 w-2 rounded-full" style={{ background: MAU[s.loai] }} />
                {TEN[s.loai]}
              </span>
            </li>
          ))}
          {dnGanDay.length === 0 && (
            <li className="px-4 py-6 text-chu-phu">{chiTheoDoi ? "Các mã bạn theo dõi chưa có công bố nào gần đây." : "Chưa có công bố."}</li>
          )}
        </ul>
      </section>
    </>
  );
}
