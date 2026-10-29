import type { CoPhieu, DuLieuNganh, TaiChinhMa } from "@/lib/mofi";

// Một dòng của bộ lọc: giá trong phiên + chỉ số tài chính 4 quý gần nhất
export type DongLoc = {
  ma: string;
  ten: string;
  san: string;
  nganh: string | null; // khoá ngành Mofi
  gia: number;
  phanTram: number;
  giaTri: number;
  vonHoa: number | null;
  pe: number | null;
  pb: number | null;
  roe: number | null; // %
  roa: number | null; // %
  tangLN: number | null; // % so với 4 quý cùng kỳ năm trước
  tangDT: number | null;
  bienGop: number | null; // %
  bienRong: number | null; // %
  noVon: number | null; // lần
  coTuc: number | null; // tỷ suất cổ tức tiền mặt 4 quý, %
  nnRong: number | null; // nước ngoài mua ròng trong phiên, triệu đồng
};

const chia = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : a / b);
const tangTruong = (nay: number | null, truoc: number | null) =>
  nay == null || truoc == null || truoc <= 0 ? null : (nay / truoc - 1) * 100;

export function taoDongLoc(ds: CoPhieu[], tc: Record<string, TaiChinhMa>, nganh: DuLieuNganh): DongLoc[] {
  return ds.map((cp) => {
    const t = tc[cp.ma];
    // Vốn hoá theo đồng, báo cáo theo triệu đồng
    const vh = cp.vonHoa;
    const lnst = t?.lnst ?? null;
    const pe = vh != null && lnst != null && lnst > 0 ? vh / (lnst * 1e6) : null;
    const pb = vh != null && t?.vonChu != null && t.vonChu > 0 ? vh / (t.vonChu * 1e6) : null;
    const phanTram = (x: number | null) => (x == null ? null : x * 100);
    return {
      ma: cp.ma,
      ten: cp.ten,
      san: cp.san,
      nganh: nganh.maNganh[cp.ma] ?? null,
      gia: cp.gia,
      phanTram: cp.phanTram,
      giaTri: cp.giaTri,
      vonHoa: vh,
      pe,
      pb,
      roe: t?.vonChu && t.vonChu > 0 ? phanTram(chia(lnst, t.vonChu)) : null,
      roa: phanTram(chia(lnst, t?.tongTaiSan ?? null)),
      tangLN: tangTruong(lnst, t?.lnstTruoc ?? null),
      tangDT: tangTruong(t?.doanhThu ?? null, t?.doanhThuTruoc ?? null),
      bienGop: t?.loai === "thuong" ? phanTram(chia(t.lnGop, t.doanhThu)) : null,
      bienRong: phanTram(chia(lnst, t?.doanhThu ?? null)),
      noVon: t?.vonChu && t.vonChu > 0 ? chia(t.noPhaiTra, t.vonChu) : null,
      coTuc: vh && t?.coTuc != null ? ((t.coTuc * 1e6) / vh) * 100 : null,
      nnRong: cp.nnMua != null && cp.nnBan != null ? cp.nnMua - cp.nnBan : null,
    };
  });
}
