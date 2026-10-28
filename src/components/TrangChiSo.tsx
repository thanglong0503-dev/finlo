import Link from "next/link";
import { notFound } from "next/navigation";
import { BieuDoNen } from "@/components/BieuDoNen";
import { BieuDoSo } from "@/components/BieuDoSo";
import { diem, khoiLuong, mauTangGiam, phanTram, thayDoi } from "@/lib/dinh-dang";
import { layChiSo, layNenChiSo, layPeThiTruong, type Nen } from "@/lib/mofi";

const NGAY = 86400;

// Lợi suất từ phiên gần nhất ngày "truoc" giây trở về trước đến phiên cuối
function loiSuat(nen: Nen[], truoc: number) {
  const cuoi = nen[nen.length - 1];
  const moc = cuoi.time - truoc;
  let i = nen.length - 1;
  while (i > 0 && nen[i].time > moc) i--;
  if (nen[i].time > moc) return null;
  return (cuoi.close / nen[i].close - 1) * 100;
}

// Từ đầu năm: so với phiên cuối cùng của năm trước
function tuDauNam(nen: Nen[]) {
  const cuoi = nen[nen.length - 1];
  const nam = new Date(cuoi.time * 1000).getUTCFullYear();
  const dauNam = Date.UTC(nam, 0, 1) / 1000;
  const truoc = [...nen].reverse().find((x) => x.time < dauNam);
  return truoc ? (cuoi.close / truoc.close - 1) * 100 : null;
}

export async function TrangChiSo({ ma }: { ma: string }) {
  const [tatCa, duLieu, pe] = await Promise.all([layChiSo(), layNenChiSo(ma), layPeThiTruong()]);
  if (!duLieu || duLieu.nen.length < 2) notFound();
  const { nen } = duLieu;
  const hienTai = tatCa.find((c) => c.ma === ma);

  // Điểm lưu nhân 1000
  const namQua = nen.slice(-250);
  const dinh = Math.max(...namQua.map((x) => x.high)) / 1000;
  const day = Math.min(...namQua.map((x) => x.low)) / 1000;
  const klTb = nen.slice(-20).reduce((s, x) => s + x.volume, 0) / 20;

  const hieuSuat = [
    { nhan: "1 tuần", giaTri: loiSuat(nen, 7 * NGAY) },
    { nhan: "1 tháng", giaTri: loiSuat(nen, 30 * NGAY) },
    { nhan: "3 tháng", giaTri: loiSuat(nen, 91 * NGAY) },
    { nhan: "6 tháng", giaTri: loiSuat(nen, 182 * NGAY) },
    { nhan: "Từ đầu năm", giaTri: tuDauNam(nen) },
    { nhan: "1 năm", giaTri: loiSuat(nen, 365 * NGAY) },
    { nhan: "3 năm", giaTri: loiSuat(nen, 3 * 365 * NGAY) },
    { nhan: "5 năm", giaTri: loiSuat(nen, 5 * 365 * NGAY) },
  ];

  const peHienTai = pe.pe[pe.pe.length - 1];
  // Bao nhiêu % thời gian trong lịch sử P/E thấp hơn hiện tại
  const viTri = (pe.pe.filter((x) => x < peHienTai).length / pe.pe.length) * 100;

  return (
    <>
      <div className="mt-4 flex max-w-full overflow-x-auto border border-vien">
        {tatCa.map((c) => (
          <Link
            key={c.ma}
            href={c.ma === "VNINDEX" ? "/chi-so" : `/chi-so/${c.ma}`}
            className={`min-w-[140px] flex-1 border-r border-vien px-4 py-2.5 last:border-r-0 ${
              c.ma === ma ? "bg-nhan-nhat shadow-[inset_0_-2px_0_0_var(--nhan)]" : "hover:bg-nen-phu"
            }`}
          >
            <p className="font-semibold">{c.ten}</p>
            <p className="tabular-nums">
              {diem(c.diem)} <span className={mauTangGiam(c.phanTram)}>{phanTram(c.phanTram)}</span>
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-vien pb-5">
        <div>
          <p className="nhan-muc">Chỉ số</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em]">{duLieu.ten}</h1>
        </div>
        {hienTai && (
          <div className="text-right">
            <div className={`text-3xl font-bold tabular-nums ${mauTangGiam(hienTai.phanTram)}`}>{diem(hienTai.diem)}</div>
            <div className={`tabular-nums ${mauTangGiam(hienTai.phanTram)}`}>
              {thayDoi(hienTai.thayDoi)} ({phanTram(hienTai.phanTram)})
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="border border-vien p-4">
          <BieuDoNen nen={nen} />
        </div>
        <div className="border border-vien">
          <h2 className="flex items-center gap-2 border-b border-vien px-4 py-2.5 font-semibold">
            <span className="h-3.5 w-1 bg-nhan" />
            Hiệu suất
          </h2>
          <dl>
            {hieuSuat.map((h) => (
              <div key={h.nhan} className="flex justify-between border-b border-vien px-4 py-2">
                <dt className="text-chu-phu">{h.nhan}</dt>
                <dd className={`font-medium tabular-nums ${h.giaTri != null ? mauTangGiam(h.giaTri) : ""}`}>
                  {h.giaTri != null ? phanTram(h.giaTri) : "—"}
                </dd>
              </div>
            ))}
            <div className="flex justify-between border-b border-vien px-4 py-2">
              <dt className="text-chu-phu">Đỉnh 52 tuần</dt>
              <dd className="font-medium tabular-nums">{diem(dinh)}</dd>
            </div>
            <div className="flex justify-between border-b border-vien px-4 py-2">
              <dt className="text-chu-phu">Đáy 52 tuần</dt>
              <dd className="font-medium tabular-nums">{diem(day)}</dd>
            </div>
            <div className="flex justify-between px-4 py-2">
              <dt className="text-chu-phu">KL TB 20 phiên</dt>
              <dd className="font-medium tabular-nums">{khoiLuong(klTb)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="mt-10">
        <p className="nhan-muc">Định giá thị trường</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">P/E trung vị toàn thị trường</h2>
        <p className="mt-1 text-chu-phu">
          P/E của từng mã (bỏ mã lỗ và P/E trên 200 lần), lấy trung vị toàn thị trường mỗi phiên, từ {pe.ngay[0].slice(0, 4)}.
        </p>
        <div className="mt-4 grid grid-cols-2 border-t border-l border-vien md:grid-cols-4">
          {[
            { nhan: "P/E hiện tại", giaTri: `${peHienTai.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} lần` },
            {
              nhan: "Trung vị lịch sử",
              giaTri: pe.trungVi != null ? `${pe.trungVi.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} lần` : "—",
            },
            {
              nhan: "Vị trí trong lịch sử",
              giaTri: `Cao hơn ${viTri.toLocaleString("vi-VN", { maximumFractionDigits: 0 })}% số phiên`,
            },
            { nhan: "VN-INDEX cùng ngày", giaTri: diem(pe.vnindex[pe.vnindex.length - 1]) },
          ].map((o) => (
            <div key={o.nhan} className="border-r border-b border-vien p-4">
              <p className="text-chu-phu">{o.nhan}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{o.giaTri}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 border border-vien p-4">
          <BieuDoSo
            donVi="lan"
            duong={[{ ten: "P/E trung vị", diem: pe.ngay.map((n, i) => ({ time: n, value: pe.pe[i] })) }]}
          />
        </div>
        <p className="mt-2 text-[11px] text-chu-phu">
          P/E càng cao so với trung vị lịch sử thì thị trường càng đắt tương đối. Số liệu tính bởi Mofi.
        </p>
      </section>
    </>
  );
}
