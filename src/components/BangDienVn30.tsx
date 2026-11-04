"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { GiaChop } from "@/components/GiaChop";
import { NhanPhien } from "@/components/NhanPhien";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import type { BangDienDau } from "@/lib/bang-dien-may-chu";
import { docBang, docSau, GOC_MOFI, hhmmCua, klGon, mauMucGia, phutCua, type AnhBang, type AnhSau, type BangTho, type DongBang, type SauTho } from "@/lib/bang-dien";
import { giaNghin, tyDong } from "@/lib/dinh-dang";
import { useLamMoi } from "@/lib/lam-moi";
import { ngayVN } from "@/lib/lich-nghi";

const CHU_KY = 15_000; // file đổi mỗi phút, hỏi 15 giây một lần để giá mới hiện sớm mà vẫn nhẹ
const LOI_TOI_DA = 3; // lỗi mạng liên tiếp khi lấy thẳng từ Mofi thì chuyển sang đường dự phòng của Finlo

const taiTep = async <T,>(duongDan: string): Promise<T | null> => {
  const res = await fetch(`${GOC_MOFI}/${duongDan}`);
  return res.ok ? ((await res.json()) as T) : null;
};

// Một ô số: chớp khi giá trị đổi, để trống khi bằng 0
function O({ x, mau = "", dam = false, gach = false, children }: { x: number; mau?: string; dam?: boolean; gach?: boolean; children: React.ReactNode }) {
  return (
    <td className={`px-1.5 py-1 text-right tabular-nums whitespace-nowrap ${gach ? "border-l border-vien" : ""} ${dam ? "font-semibold" : ""} ${mau}`}>
      {x ? (
        <GiaChop gia={x} className="block rounded-sm px-1">
          {children}
        </GiaChop>
      ) : null}
    </td>
  );
}

const TH = "px-1.5 py-1 text-right font-medium whitespace-nowrap";
type SapXep = { cot: "ma" | "phanTram" | "kl" | "nnRong"; giam: boolean };

export function BangDienVn30({ dau }: { dau: BangDienDau }) {
  const { ro, ten } = dau;
  const [bang, setBang] = useState<AnhBang>(dau.bang);
  const [sau, setSau] = useState<AnhSau[]>(dau.sau);
  const [sapXep, setSapXep] = useState<SapXep>({ cot: "ma", giam: false });
  const soLoi = useRef(0);

  useLamMoi(async () => {
    if (soLoi.current >= LOI_TOI_DA) {
      const res = await fetch("/api/bang-dien").catch(() => null);
      if (!res?.ok) return;
      const kq = (await res.json()) as BangDienDau;
      setBang(kq.bang);
      setSau(kq.sau);
      return;
    }
    try {
      const luc = Date.now();
      const ngay = ngayVN(Math.floor(luc / 1000));
      const phut = Math.floor(((luc / 1000 + 7 * 3600) % 86400) / 60);
      // Nghỉ trưa không có file mới
      if (phut > 690 && phut < 780) return;
      const cuNgay = bang.ngay === ngay;
      let moi = bang;
      // File của phút hiện tại có thể chưa ghi xong: thử thêm phút liền trước
      for (const p of [phut, phut - 1]) {
        if (cuNgay && p <= phutCua(bang.hhmm)) break;
        const tho = await taiTep<BangTho>(`realtime/bang/${ngay}/${hhmmCua(p)}.json`);
        if (tho) {
          moi = docBang(tho, ro);
          setBang(moi);
          break;
        }
      }
      // Sổ lệnh ghi riêng: phút này chưa có thì giữ số cũ, lần sau thử lại
      if (!sau.some((s) => s.hhmm === moi.hhmm)) {
        const sans = [...new Set(Object.values(moi.dong).map((d) => d.san))];
        const ds = await Promise.all(sans.map((s) => taiTep<SauTho>(`realtime/sau/${moi.ngay}/${s}/${moi.hhmm}.json`)));
        const co = ds.filter((x) => x != null).map((x) => docSau(x, ro));
        if (co.length) setSau(co);
      }
      soLoi.current = 0;
    } catch {
      soLoi.current++;
    }
  }, CHU_KY);

  const sauCua = useMemo(() => Object.assign({}, ...sau.map((s) => s.dong)) as AnhSau["dong"], [sau]);
  const phanTram = (d: DongBang) => (d.tc ? (d.gia / d.tc - 1) * 100 : 0);

  const ds = useMemo(() => {
    const giaTri = (ma: string) => {
      const d = bang.dong[ma];
      if (sapXep.cot === "phanTram") return phanTram(d);
      if (sapXep.cot === "kl") return d.kl;
      return d.nnM - d.nnB;
    };
    const co = ro.filter((ma) => bang.dong[ma]);
    const huong = sapXep.giam ? -1 : 1;
    return co.sort((a, b) => (sapXep.cot === "ma" ? a.localeCompare(b) : giaTri(a) - giaTri(b)) * huong);
  }, [ro, bang, sapXep]);

  const tong = useMemo(() => {
    const dong = ds.map((ma) => bang.dong[ma]);
    return {
      gt: dong.reduce((s, d) => s + d.gt, 0),
      nn: dong.reduce((s, d) => s + d.nnM - d.nnB, 0), // triệu đồng
      tran: dong.filter((d) => d.tran > 0 && d.gia >= d.tran).length,
      san: dong.filter((d) => d.gsan > 0 && d.gia <= d.gsan).length,
    };
  }, [ds, bang]);

  const doi = (cot: SapXep["cot"]) => setSapXep((s) => (s.cot === cot ? { cot, giam: !s.giam } : { cot, giam: cot !== "ma" }));
  const mui = (cot: SapXep["cot"]) => (sapXep.cot === cot ? (sapXep.giam ? " ↓" : " ↑") : "");
  const phien = { ngay: bang.ngay, gio: `${bang.hhmm.slice(0, 2)}:${bang.hhmm.slice(2)}`, dot: bang.dot, luc: 0 };

  return (
    <>
      <p className="mt-2 text-chu-phu">
        <NhanPhien phien={phien} />
      </p>

      <div className="mt-3 max-h-[calc(100dvh-9rem)] overflow-auto rounded-xl border border-vien text-[13px]">
        <table className="w-full min-w-[1320px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-20 bg-nen text-[11px] text-chu-phu">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-30 border-b border-vien bg-nen px-2 py-1 text-left font-medium">
                <button type="button" onClick={() => doi("ma")} className="ml-7 hover:text-chu">
                  Mã{mui("ma")}
                </button>
              </th>
              <th rowSpan={2} className={`${TH} border-b border-vien`}>TC</th>
              <th rowSpan={2} className={`${TH} border-b border-vien`}>Trần</th>
              <th rowSpan={2} className={`${TH} border-b border-vien`}>Sàn</th>
              <th colSpan={6} className="border-b border-l border-vien px-1.5 py-1 font-medium">Bên mua</th>
              <th colSpan={3} className="border-b border-l border-vien px-1.5 py-1 font-medium">Khớp lệnh</th>
              <th colSpan={6} className="border-b border-l border-vien px-1.5 py-1 font-medium">Bên bán</th>
              <th rowSpan={2} className={`${TH} border-b border-l border-vien`}>
                <button type="button" onClick={() => doi("kl")} className="hover:text-chu">
                  Tổng KL{mui("kl")}
                </button>
              </th>
              <th rowSpan={2} className={`${TH} border-b border-l border-vien`}>TB</th>
              <th rowSpan={2} className={`${TH} border-b border-vien`}>Cao</th>
              <th rowSpan={2} className={`${TH} border-b border-vien`}>Thấp</th>
              <th colSpan={3} className="border-b border-l border-vien px-1.5 py-1 font-medium">
                <button type="button" onClick={() => doi("nnRong")} className="hover:text-chu">
                  Nước ngoài{mui("nnRong")}
                </button>
              </th>
            </tr>
            <tr>
              {["Giá 3", "KL 3", "Giá 2", "KL 2", "Giá 1", "KL 1"].map((t, i) => (
                <th key={t} className={`${TH} border-b border-vien ${i === 0 ? "border-l" : ""}`}>{t}</th>
              ))}
              <th className={`${TH} border-b border-l border-vien`}>Giá</th>
              <th className={`${TH} border-b border-vien`}>KL</th>
              <th className={`${TH} border-b border-vien`}>
                <button type="button" onClick={() => doi("phanTram")} className="hover:text-chu">
                  +/−{mui("phanTram")}
                </button>
              </th>
              {["Giá 1", "KL 1", "Giá 2", "KL 2", "Giá 3", "KL 3"].map((t, i) => (
                <th key={t} className={`${TH} border-b border-vien ${i === 0 ? "border-l" : ""}`}>{t}</th>
              ))}
              <th className={`${TH} border-b border-l border-vien`}>Mua</th>
              <th className={`${TH} border-b border-vien`}>Bán</th>
              <th className={`${TH} border-b border-vien`}>Room</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((ma) => {
              const d = bang.dong[ma];
              const s = sauCua[ma];
              const mua = s?.mua ?? [];
              const ban = s?.ban ?? [];
              const mau = mauMucGia(d.gia, d);
              const lech = d.gia - d.tc;
              return (
                <tr key={ma} className="group">
                  <td className="sticky left-0 z-10 border-b border-vien bg-nen px-2 py-1 group-hover:bg-nen-phu">
                    <span className="flex items-center gap-1">
                      <NutTheoDoi ma={ma} gon />
                      <Link prefetch={false} href={`/co-phieu/${ma}`} title={ten[ma]} className={`font-semibold hover:underline ${mau}`}>
                        {ma}
                      </Link>
                    </span>
                  </td>
                  <td className="border-b border-vien px-1.5 py-1 text-right text-dung tabular-nums group-hover:bg-nen-phu">{giaNghin(d.tc)}</td>
                  <td className="border-b border-vien px-1.5 py-1 text-right text-tran tabular-nums group-hover:bg-nen-phu">{giaNghin(d.tran)}</td>
                  <td className="border-b border-vien px-1.5 py-1 text-right text-san-gia tabular-nums group-hover:bg-nen-phu">{giaNghin(d.gsan)}</td>
                  {[4, 2, 0].map((i) => [
                    <O key={`mg${i}`} x={mua[i]} mau={mauMucGia(mua[i], d)} gach={i === 4}>{giaNghin(mua[i])}</O>,
                    <O key={`mk${i}`} x={mua[i + 1]}>{klGon(mua[i + 1])}</O>,
                  ])}
                  <O x={d.gia} mau={mau} dam gach>{giaNghin(d.gia)}</O>
                  <O x={d.klK}>{klGon(d.klK)}</O>
                  <td className={`border-b border-vien px-1.5 py-1 text-right tabular-nums whitespace-nowrap group-hover:bg-nen-phu ${mau}`} title={`${phanTram(d).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`}>
                    {lech > 0 ? "+" : lech < 0 ? "−" : ""}
                    {giaNghin(Math.abs(lech))}
                  </td>
                  {[0, 2, 4].map((i) => [
                    <O key={`bg${i}`} x={ban[i]} mau={mauMucGia(ban[i], d)} gach={i === 0}>{giaNghin(ban[i])}</O>,
                    <O key={`bk${i}`} x={ban[i + 1]}>{klGon(ban[i + 1])}</O>,
                  ])}
                  <O x={d.kl} gach>{klGon(d.kl)}</O>
                  <O x={d.tb} mau={mauMucGia(d.tb, d)} gach>{giaNghin(d.tb)}</O>
                  <O x={d.cao} mau={mauMucGia(d.cao, d)}>{giaNghin(d.cao)}</O>
                  <O x={d.thap} mau={mauMucGia(d.thap, d)}>{giaNghin(d.thap)}</O>
                  <O x={s?.nnMua ?? 0} gach>{klGon(s?.nnMua ?? 0)}</O>
                  <O x={s?.nnBan ?? 0}>{klGon(s?.nnBan ?? 0)}</O>
                  <O x={d.room}>{klGon(d.room)}</O>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-chu-phu">
        <span>Giá nghìn đồng, khối lượng cổ phiếu</span>
        <span>{ds.length} mã</span>
        <span>Giá trị khớp <b className="text-chu">{tyDong(tong.gt)}</b></span>
        <span>
          Khối ngoại ròng{" "}
          <b className={tong.nn >= 0 ? "text-tang" : "text-giam"}>
            {tong.nn >= 0 ? "+" : "−"}
            {tyDong(Math.abs(tong.nn) * 1e6)}
          </b>
        </span>
        <span>Trần <b className="text-tran">{tong.tran}</b></span>
        <span>Sàn <b className="text-san-gia">{tong.san}</b></span>
        <span className="ml-auto">Dữ liệu cập nhật theo từng phút trong phiên, ô đổi số sẽ chớp</span>
      </p>
    </>
  );
}
