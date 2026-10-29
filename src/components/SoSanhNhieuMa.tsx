"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BieuDoDuong } from "@/components/BieuDoDuong";

// Chỉ số dùng được để so sánh cùng cổ phiếu
const CHI_SO = ["VNINDEX", "VN30", "HNX", "HNX30", "UPCOM"];
const TOI_DA = 5;

const KHOANG = [
  { nhan: "1T", ngay: 30 },
  { nhan: "3T", ngay: 91 },
  { nhan: "6T", ngay: 182 },
  { nhan: "1N", ngay: 365 },
  { nhan: "3N", ngay: 365 * 3 },
  { nhan: "5N", ngay: 365 * 5 },
];

type Diem = [number, number]; // [thời điểm giây, giá]

const pt = (x: number | null) =>
  x == null ? "—" : `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
const dinhDangPt = (x: number) => `${x > 0 ? "+" : ""}${x.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
const mau = (x: number | null) => (x == null ? "" : x > 0 ? "text-tang" : x < 0 ? "text-giam" : "text-dung");
const MAU_DUONG = ["--chu", "--nhan", "--dung", "--chu-phu", "--giam"];

async function taiChuoi(ma: string): Promise<Diem[]> {
  if (CHI_SO.includes(ma)) {
    const r = await fetch(`/api/nen-chi-so/${ma}`);
    return r.ok ? r.json() : [];
  }
  const r = await fetch(`/api/nen/${ma}`);
  if (!r.ok) return [];
  const ds = (await r.json()) as { time: number; close: number }[];
  return ds.map((x) => [x.time, x.close / 1000]);
}

// So sánh hiệu suất tối đa 5 mã/chỉ số trên cùng một biểu đồ, quy về 0% ở đầu kỳ
export function SoSanhNhieuMa({ dsDau }: { dsDau: string[] }) {
  const [ds, setDs] = useState(dsDau);
  const [khoang, setKhoang] = useState(365);
  const [nhap, setNhap] = useState("");
  const [danhSach, setDanhSach] = useState<{ ma: string; ten: string }[]>([]);
  const [duLieu, setDuLieu] = useState<Record<string, Diem[] | "loi">>({});

  useEffect(() => {
    fetch("/api/danh-sach-ma")
      .then((r) => (r.ok ? r.json() : []))
      .then(setDanhSach)
      .catch(() => {});
  }, []);

  // Tải chuỗi giá cho mã mới thêm
  useEffect(() => {
    for (const ma of ds) {
      if (duLieu[ma]) continue;
      taiChuoi(ma)
        .then((c) => setDuLieu((d) => ({ ...d, [ma]: c.length ? c : "loi" })))
        .catch(() => setDuLieu((d) => ({ ...d, [ma]: "loi" })));
    }
  }, [ds, duLieu]);

  // Giữ danh sách trên đường dẫn để chia sẻ được
  useEffect(() => {
    window.history.replaceState(null, "", `/so-sanh?ma=${ds.join(",")}`);
  }, [ds]);

  const them = (ma: string) => {
    const m = ma.trim().toUpperCase().replace("VN-INDEX", "VNINDEX");
    if (!m || ds.includes(m) || ds.length >= TOI_DA) return;
    if (!CHI_SO.includes(m) && danhSach.length && !danhSach.some((x) => x.ma === m)) return;
    setDs([...ds, m]);
    setNhap("");
  };

  const ketQua = useMemo(() => {
    const coDu = ds.flatMap((ma) => {
      const c = duLieu[ma];
      return c && c !== "loi" ? [{ ma, c }] : [];
    });
    if (!coDu.length) return null;
    const cuoi = Math.max(...coDu.map((x) => x.c[x.c.length - 1][0]));
    const tu = cuoi - khoang * 86400;
    const duong = coDu.map(({ ma, c }) => {
      const doan = c.filter((x) => x[0] >= tu);
      const goc = doan[0]?.[1];
      return { ma, doan, diem: goc ? doan.map((x) => ({ time: x[0], value: (x[1] / goc - 1) * 100 })) : [] };
    });
    const thongKe = duong.map(({ ma, doan }) => {
      if (doan.length < 2) return { ma, thayDoi: null, cao: null, thap: null, sut: null, bienDong: null };
      const goc = doan[0][1];
      let dinh = goc;
      let sut = 0;
      const loi: number[] = [];
      for (let i = 0; i < doan.length; i++) {
        dinh = Math.max(dinh, doan[i][1]);
        sut = Math.min(sut, (doan[i][1] / dinh - 1) * 100);
        if (i > 0) loi.push(Math.log(doan[i][1] / doan[i - 1][1]));
      }
      const tb = loi.reduce((s, v) => s + v, 0) / loi.length;
      const lech = Math.sqrt(loi.reduce((s, v) => s + (v - tb) ** 2, 0) / Math.max(1, loi.length - 1));
      return {
        ma,
        thayDoi: (doan[doan.length - 1][1] / goc - 1) * 100,
        cao: (Math.max(...doan.map((x) => x[1])) / goc - 1) * 100,
        thap: (Math.min(...doan.map((x) => x[1])) / goc - 1) * 100,
        sut,
        bienDong: lech * Math.sqrt(250) * 100,
      };
    });
    return { duong: duong.map((d) => ({ ten: d.ma, diem: d.diem })), thongKe };
  }, [ds, duLieu, khoang]);

  const goiY = CHI_SO.filter((m) => !ds.includes(m)).slice(0, 2);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-vien p-4">
        {ds.map((ma, i) => (
          <span key={ma} className="flex h-9 items-center gap-2 rounded-full bg-nen-noi pl-3 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(${MAU_DUONG[i]})` }} />
            {ma}
            {duLieu[ma] === "loi" && <span className="text-[12px] font-normal text-giam">không có dữ liệu</span>}
            <button onClick={() => setDs(ds.filter((x) => x !== ma))} aria-label={`Bỏ ${ma}`} className="px-2.5 text-chu-phu hover:text-chu">
              ×
            </button>
          </span>
        ))}
        {ds.length < TOI_DA && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              them(nhap);
            }}
            className="flex items-center gap-2"
          >
            <input
              list="ds-ma-so-sanh"
              value={nhap}
              onChange={(e) => setNhap(e.target.value)}
              placeholder="Thêm mã, ví dụ HPG"
              className="h-9 w-44 rounded-full border border-vien bg-nen px-4 uppercase outline-none placeholder:normal-case focus:border-nhan"
            />
            <datalist id="ds-ma-so-sanh">
              {CHI_SO.map((m) => (
                <option key={m} value={m}>
                  Chỉ số
                </option>
              ))}
              {danhSach.map((x) => (
                <option key={x.ma} value={x.ma}>
                  {x.ten}
                </option>
              ))}
            </datalist>
            <button className="h-9 rounded-full bg-chu px-4 font-semibold text-nen">Thêm</button>
          </form>
        )}
        {ds.length < TOI_DA &&
          goiY.map((m) => (
            <button key={m} onClick={() => them(m)} className="h-9 rounded-full border border-vien px-3 text-chu-phu hover:text-chu">
              + {m}
            </button>
          ))}
        <span className="ml-auto text-[12px] text-chu-phu">Tối đa {TOI_DA} mã</span>
      </div>

      <div className="mt-4 flex gap-1 self-start rounded-full bg-nen-noi p-1 w-fit">
        {KHOANG.map((k) => (
          <button
            key={k.nhan}
            onClick={() => setKhoang(k.ngay)}
            className={`h-8 rounded-full px-3.5 font-medium ${khoang === k.ngay ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
          >
            {k.nhan}
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-vien p-4">
        {ketQua ? (
          <BieuDoDuong duong={ketQua.duong} dinhDang={dinhDangPt} cao={420} />
        ) : (
          <div className="h-[440px] animate-pulse rounded-xl bg-nen-phu" />
        )}
      </section>

      {ketQua && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-vien">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-vien text-[12px] font-medium text-chu-phu">
                <th className="px-4 py-2.5 text-left font-medium">Mã</th>
                <th className="px-4 py-2.5 text-right font-medium">Thay đổi trong kỳ</th>
                <th className="px-4 py-2.5 text-right font-medium">Cao nhất</th>
                <th className="px-4 py-2.5 text-right font-medium">Thấp nhất</th>
                <th className="px-4 py-2.5 text-right font-medium">Sụt sâu nhất</th>
                <th className="px-4 py-2.5 text-right font-medium" title="Độ lệch chuẩn lợi suất ngày, quy ra năm">
                  Biến động/năm
                </th>
              </tr>
            </thead>
            <tbody>
              {ketQua.thongKe.map((t) => (
                <tr key={t.ma} className="border-b border-vien last:border-b-0">
                  <td className="px-4 py-2.5 font-semibold">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: `var(${MAU_DUONG[ds.indexOf(t.ma)]})` }} />
                    {CHI_SO.includes(t.ma) ? (
                      t.ma
                    ) : (
                      <Link href={`/co-phieu/${t.ma}`} prefetch={false} className="hover:text-nhan">
                        {t.ma}
                      </Link>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${mau(t.thayDoi)}`}>{pt(t.thayDoi)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{pt(t.cao)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{pt(t.thap)}</td>
                  <td className="px-4 py-2.5 text-right text-giam tabular-nums">{pt(t.sut)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {t.bienDong == null ? "—" : `${t.bienDong.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[12px] text-chu-phu">
        Mỗi đường bắt đầu từ 0% ở phiên đầu kỳ. Giá cổ phiếu đã điều chỉnh chia tách và cổ tức. Biến động/năm càng cao thì giá càng
        dao động mạnh.
      </p>
    </>
  );
}
