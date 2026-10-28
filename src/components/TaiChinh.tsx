import { BangBaoCao, type DuLieuBang } from "@/components/BangBaoCao";
import type { BaoCao, NhomBaoCao } from "@/lib/mofi";
import { doanhThuLoiNhuan, tinhChiSo } from "@/lib/tai-chinh";

const SO_KY = 8;
const so = (x: number, chuSo = 2) => x.toLocaleString("vi-VN", { maximumFractionDigits: chuSo, minimumFractionDigits: chuSo });
const tyDong = (trieu: number) => Math.round(trieu / 1000).toLocaleString("vi-VN");

// Phần "Tài chính" trong trang phân tích mã: thẻ chỉ số, biểu đồ doanh thu/lợi nhuận, bảng báo cáo
export function TaiChinh({ bc, gia, soCoPhieu }: { bc: BaoCao; gia: number; soCoPhieu: number | null }) {
  const cs = tinhChiSo(bc, gia, soCoPhieu);
  const nganHang = bc.loai === "ngan_hang";

  const the: { nhan: string; giaTri: string; giaiThich: string; mau?: number | null }[] = [
    { nhan: "P/E", giaTri: cs.pe != null ? so(cs.pe) : "—", giaiThich: "Giá / lợi nhuận mỗi cổ phiếu 4 quý gần nhất" },
    { nhan: "P/B", giaTri: cs.pb != null ? so(cs.pb) : "—", giaiThich: "Giá / giá trị sổ sách mỗi cổ phiếu" },
    {
      nhan: "EPS (4 quý)",
      giaTri: cs.eps != null ? Math.round(cs.eps).toLocaleString("vi-VN") : "—",
      giaiThich: "Lợi nhuận sau thuế công ty mẹ 4 quý / số cổ phiếu, đơn vị đồng",
    },
    {
      nhan: "BVPS",
      giaTri: cs.bvps != null ? Math.round(cs.bvps).toLocaleString("vi-VN") : "—",
      giaiThich: "Vốn chủ sở hữu / số cổ phiếu, đơn vị đồng",
    },
    { nhan: "ROE", giaTri: cs.roe != null ? `${so(cs.roe)}%` : "—", giaiThich: "Lợi nhuận 4 quý / vốn chủ sở hữu" },
    { nhan: "ROA", giaTri: cs.roa != null ? `${so(cs.roa)}%` : "—", giaiThich: "Lợi nhuận 4 quý / tổng tài sản" },
    {
      nhan: nganHang ? "Biên LN / thu nhập" : "Biên LN ròng",
      giaTri: cs.bienRong != null ? `${so(cs.bienRong)}%` : "—",
      giaiThich: nganHang ? "Lợi nhuận / tổng thu nhập hoạt động" : "Lợi nhuận / doanh thu thuần",
    },
    nganHang
      ? {
          nhan: "Nợ / Vốn chủ",
          giaTri: cs.noTrenVon != null ? `${so(cs.noTrenVon)} lần` : "—",
          giaiThich: "Nợ phải trả / vốn chủ sở hữu",
        }
      : {
          nhan: "Biên LN gộp",
          giaTri: cs.bienGop != null ? `${so(cs.bienGop)}%` : "—",
          giaiThich: "Lợi nhuận gộp / doanh thu thuần",
        },
    {
      nhan: "LN cùng kỳ",
      giaTri: cs.tangTruongLN != null ? `${cs.tangTruongLN > 0 ? "+" : ""}${so(cs.tangTruongLN, 1)}%` : "—",
      giaiThich: `Lợi nhuận ${cs.ky} so với cùng quý năm trước`,
      mau: cs.tangTruongLN,
    },
    {
      nhan: "DT cùng kỳ",
      giaTri: cs.tangTruongDT != null ? `${cs.tangTruongDT > 0 ? "+" : ""}${so(cs.tangTruongDT, 1)}%` : "—",
      giaiThich: `Doanh thu ${cs.ky} so với cùng quý năm trước`,
      mau: cs.tangTruongDT,
    },
  ];

  const cot = doanhThuLoiNhuan(bc, SO_KY);
  const lonNhat = Math.max(1, ...cot.flatMap((c) => [Math.abs(c.doanhThu ?? 0), Math.abs(c.loiNhuan ?? 0)]));

  // Chỉ gửi xuống trình duyệt 8 kỳ gần nhất và các dòng có số liệu
  const catKy = <T,>(a: T[]) => a.slice(-SO_KY);
  const duLieu: DuLieuBang = {
    quy: catKy(bc.quy),
    nam: catKy(bc.nam),
    nhom: (["kqkd", "can_doi", "lctt"] as NhomBaoCao[]).map((nhom) => ({
      nhom,
      dong: bc.muc
        .filter((m) => m.nhom === nhom && m.cap <= (nhom === "lctt" ? 1 : 2))
        .map((m) => ({ ten: m.ten, cap: m.cap, q: catKy(m.q), n: catKy(m.n) }))
        .filter((m) => [...m.q, ...m.n].some((v) => v != null && v !== 0)),
    })),
  };

  return (
    <section className="mt-8">
      <p className="nhan-muc">Tài chính</p>
      <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Định giá và hiệu quả</h2>
      <p className="mt-1 text-chu-phu">Tính từ báo cáo 4 quý gần nhất (đến {cs.ky}) và giá hiện tại.</p>

      <dl className="mt-4 grid grid-cols-2 border-t border-l border-vien sm:grid-cols-5">
        {the.map((t) => (
          <div key={t.nhan} title={t.giaiThich} className="border-r border-b border-vien p-4 hover:bg-nhan-nhat">
            <dt className="text-chu-phu">{t.nhan}</dt>
            <dd
              className={`mt-1 text-lg font-semibold tabular-nums ${
                t.mau == null ? "" : t.mau > 0 ? "text-tang" : t.mau < 0 ? "text-giam" : ""
              }`}
            >
              {t.giaTri}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 border border-vien p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <span className="h-3.5 w-1 bg-nhan" />
            {nganHang ? "Thu nhập hoạt động" : "Doanh thu thuần"} và lợi nhuận theo quý
          </h3>
          <div className="flex gap-4 text-chu-phu">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-chu-phu/40" />
              {nganHang ? "Thu nhập" : "Doanh thu"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-nhan" />
              Lợi nhuận sau thuế
            </span>
          </div>
        </div>
        <div className="mt-4 flex h-48 items-end gap-2 sm:gap-4">
          {cot.map((c) => (
            <div key={c.ky} className="flex h-full flex-1 flex-col justify-end">
              <div className="flex flex-1 items-end justify-center gap-1">
                <div
                  className="w-1/2 max-w-6 bg-chu-phu/40"
                  style={{ height: `${(Math.max(0, c.doanhThu ?? 0) / lonNhat) * 100}%` }}
                  title={c.doanhThu != null ? `${c.ky}: ${tyDong(c.doanhThu)} tỷ` : ""}
                />
                <div
                  className={`w-1/2 max-w-6 ${(c.loiNhuan ?? 0) < 0 ? "bg-giam" : "bg-nhan"}`}
                  style={{ height: `${(Math.abs(c.loiNhuan ?? 0) / lonNhat) * 100}%` }}
                  title={c.loiNhuan != null ? `${c.ky}: ${tyDong(c.loiNhuan)} tỷ` : ""}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-chu-phu">{c.ky}</p>
              <p className="text-center text-[11px] font-medium tabular-nums">
                {c.loiNhuan != null ? tyDong(c.loiNhuan) : "—"}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-chu-phu">Số dưới mỗi cột: lợi nhuận sau thuế, tỷ đồng.</p>
      </div>

      <BangBaoCao duLieu={duLieu} />
    </section>
  );
}
