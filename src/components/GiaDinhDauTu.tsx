"use client";

import { useMemo, useState } from "react";
import { BieuDoDuong } from "@/components/BieuDoDuong";

// Một điểm giá đóng cửa: [thời điểm (giây), giá]
export type DiemGia = [number, number];

const MOC = [
  { nhan: "1 năm", nam: 1 },
  { nhan: "3 năm", nam: 3 },
  { nhan: "5 năm", nam: 5 },
  { nhan: "10 năm", nam: 10 },
];

const tien = (trieu: number) =>
  Math.abs(trieu) >= 1000
    ? `${(trieu / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`
    : `${trieu.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
const pt = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

// Lấy phiên đầu tiên từ thời điểm t trở đi
const tuPhien = (ds: DiemGia[], t: number) => ds.findIndex((x) => x[0] >= t);

// "Nếu đã đầu tư X triệu vào mã này từ N năm trước": so với bỏ vào VN-Index và gửi tiết kiệm.
// Giá đã điều chỉnh chia tách và cổ tức, nên kết quả gần với tổng lợi nhuận khi giữ cổ phiếu và nhận cổ tức.
export function GiaDinhDauTu({
  ma,
  gia,
  vnIndex,
  laiSuat,
}: {
  ma: string;
  gia: DiemGia[];
  vnIndex: DiemGia[];
  laiSuat: number; // %/năm, kỳ hạn 12 tháng
}) {
  const [soTien, setSoTien] = useState(100);
  const [nam, setNam] = useState(5);
  const [ls, setLs] = useState(laiSuat);

  const kq = useMemo(() => {
    if (gia.length < 2) return null;
    const cuoi = gia[gia.length - 1];
    const i0 = Math.max(0, tuPhien(gia, cuoi[0] - nam * 365.25 * 86400));
    const dau = gia[i0];
    const soNamThat = (cuoi[0] - dau[0]) / (365.25 * 86400);
    const soCp = soTien / dau[1];
    const j0 = tuPhien(vnIndex, dau[0]);
    const vniDau = j0 >= 0 ? vnIndex[j0][1] : null;

    // Đường giá trị danh mục theo thời gian (lấy thưa cho nhẹ: tối đa ~400 điểm)
    const buoc = Math.max(1, Math.floor((gia.length - i0) / 400));
    const dCp: { time: number; value: number }[] = [];
    for (let i = i0; i < gia.length; i += buoc) dCp.push({ time: gia[i][0], value: soCp * gia[i][1] });
    if (dCp[dCp.length - 1]?.time !== cuoi[0]) dCp.push({ time: cuoi[0], value: soCp * cuoi[1] });
    const dVni =
      vniDau != null
        ? vnIndex
            .slice(j0)
            .filter((_, k) => k % buoc === 0 || k === vnIndex.length - 1 - j0)
            .map((x) => ({ time: x[0], value: (soTien * x[1]) / vniDau }))
        : [];
    const dTk = dCp.map((x) => ({ time: x.time, value: soTien * (1 + ls / 100) ** ((x.time - dau[0]) / (365.25 * 86400)) }));

    // Đỉnh cao nhất và mức sụt giảm sâu nhất của khoản đầu tư
    let dinh = soTien;
    let sutSau = 0;
    for (let i = i0; i < gia.length; i++) {
      const v = soCp * gia[i][1];
      dinh = Math.max(dinh, v);
      sutSau = Math.min(sutSau, (v / dinh - 1) * 100);
    }

    const cuoiCp = soCp * cuoi[1];
    const cuoiVni = dVni.at(-1)?.value ?? null;
    const cuoiTk = dTk.at(-1)!.value;
    const nhanNam = (v: number) => ((v / soTien) ** (1 / Math.max(soNamThat, 0.01)) - 1) * 100;
    return {
      ngayDau: dau[0],
      soNamThat,
      giaDau: dau[1],
      giaCuoi: cuoi[1],
      soCp,
      ketQua: [
        { ten: ma, gt: cuoiCp, laiNam: nhanNam(cuoiCp), chinh: true },
        ...(cuoiVni != null ? [{ ten: "VN-Index", gt: cuoiVni, laiNam: nhanNam(cuoiVni), chinh: false }] : []),
        { ten: `Gửi tiết kiệm ${ls.toLocaleString("vi-VN")}%/năm`, gt: cuoiTk, laiNam: ls, chinh: false },
      ],
      sutSau,
      duong: [
        { ten: ma, diem: dCp },
        ...(dVni.length ? [{ ten: "VN-Index", diem: dVni }] : []),
        { ten: "Tiết kiệm", diem: dTk },
      ],
    };
  }, [gia, vnIndex, soTien, nam, ls, ma]);

  if (!kq) return <p className="text-chu-phu">Chưa đủ lịch sử giá để giả định.</p>;
  const tot = kq.ketQua[0];

  return (
    <>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-2xl border border-vien p-5">
        <label className="block">
          <span className="text-[13px] text-chu-phu">Số tiền đầu tư (triệu đồng)</span>
          <input
            type="number"
            min={1}
            step={10}
            defaultValue={soTien}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v > 0) setSoTien(v);
            }}
            className="mt-1.5 block h-10 w-40 rounded-full border border-vien bg-nen px-4 tabular-nums outline-none focus:border-nhan"
          />
        </label>
        <div>
          <span className="text-[13px] text-chu-phu">Mua từ</span>
          <div className="mt-1.5 flex gap-1 rounded-full bg-nen-noi p-1">
            {MOC.map((m) => (
              <button
                key={m.nam}
                onClick={() => setNam(m.nam)}
                className={`h-8 rounded-full px-3.5 font-medium ${nam === m.nam ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
              >
                {m.nhan} trước
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="text-[13px] text-chu-phu">Lãi tiết kiệm (%/năm)</span>
          <input
            type="number"
            min={0}
            max={20}
            step={0.1}
            defaultValue={ls}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (e.target.value !== "" && v >= 0 && v <= 20) setLs(v);
            }}
            className="mt-1.5 block h-10 w-28 rounded-full border border-vien bg-nen px-4 tabular-nums outline-none focus:border-nhan"
          />
        </label>
      </div>

      <div className="mt-6 rounded-2xl bg-nen-phu p-6">
        <p className="text-chu-phu">
          Nếu đã bỏ <b className="text-chu">{tien(soTien)}</b> mua {ma} ngày {ngayVN(kq.ngayDau)} (giá{" "}
          {(kq.giaDau / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}, khoảng{" "}
          {Math.floor(kq.soCp * 1e6).toLocaleString("vi-VN")} cổ phiếu), hôm nay bạn có
        </p>
        <p className={`mt-2 text-[40px] leading-tight font-bold tracking-[-0.03em] tabular-nums ${tot.gt >= soTien ? "text-tang" : "text-giam"}`}>
          {tien(tot.gt)}
        </p>
        <p className="mt-1 text-[15px] tabular-nums">
          <span className={tot.gt >= soTien ? "text-tang" : "text-giam"}>
            {tot.gt >= soTien ? "Lãi" : "Lỗ"} {tien(Math.abs(tot.gt - soTien))} ({pt((tot.gt / soTien - 1) * 100)})
          </span>
          <span className="text-chu-phu">
            {" "}
            · bình quân {pt(tot.laiNam)}/năm trong {kq.soNamThat.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} năm · có lúc sụt{" "}
            {pt(kq.sutSau)} từ đỉnh
          </span>
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {kq.ketQua.map((x) => (
          <div key={x.ten} className={`rounded-2xl border p-4 ${x.chinh ? "border-nhan/50 bg-nhan-nhat" : "border-vien"}`}>
            <p className="text-chu-phu">{x.ten}</p>
            <p className="mt-1 text-[22px] font-bold tabular-nums">{tien(x.gt)}</p>
            <p className={`tabular-nums ${x.gt >= soTien ? "text-tang" : "text-giam"}`}>
              {pt((x.gt / soTien - 1) * 100)} · {pt(x.laiNam)}/năm
            </p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-vien p-4">
        <p className="mb-3 font-semibold">Giá trị khoản đầu tư theo thời gian</p>
        <BieuDoDuong duong={kq.duong} dinhDang={(x) => tien(x)} cao={340} />
      </section>

      <p className="mt-4 text-[12px] text-chu-phu">
        Giá đã điều chỉnh theo chia tách và cổ tức nên kết quả xấp xỉ tổng lợi nhuận khi giữ cổ phiếu và nhận cổ tức; chưa tính phí giao
        dịch, thuế. Tiết kiệm tính lãi kép theo mức nhập ở trên. Kết quả quá khứ không bảo đảm cho tương lai.
      </p>
    </>
  );
}
