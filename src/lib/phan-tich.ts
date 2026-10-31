import type { DongLoc } from "@/lib/bo-loc";
import type { BaoCao, MucBaoCao, Nen } from "@/lib/mofi";
import { mocDinhGia, tim } from "@/lib/tai-chinh";

// Phân tích doanh nghiệp theo từng chương (định giá, quy mô, sinh lời, DuPont, nợ, dòng tiền, tăng trưởng, cổ tức).
// Số báo cáo theo triệu đồng, giá theo đồng. Chỉ dùng số đã công bố, không dự phóng.

export type Diem = { time: number; value: number };
export type SoNam = { nam: string; gt: number | null };

const SO_NAM = 8;

export const trungVi = (ds: (number | null | undefined)[]) => {
  const s = ds.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const g = Math.floor(s.length / 2);
  return s.length % 2 ? s[g] : (s[g - 1] + s[g]) / 2;
};

// Tỷ lệ phần trăm số giá trị thấp hơn x (0: thấp nhất, 100: cao nhất)
export const phanVi = (ds: number[], x: number) => (ds.length ? (ds.filter((v) => v < x).length / ds.length) * 100 : null);

const chia = (a: number | null | undefined, b: number | null | undefined) =>
  a == null || b == null || b === 0 ? null : a / b;

// Chuỗi theo năm (mới nhất ở cuối), chỉ lấy SO_NAM năm gần đây
function theoNam(bc: BaoCao, tinh: (i: number) => number | null): SoNam[] {
  const bd = Math.max(0, bc.nam.length - SO_NAM);
  return bc.nam.slice(bd).map((nam, k) => ({ nam, gt: tinh(bd + k) }));
}

const n = (m: MucBaoCao | undefined, i: number) => m?.n[i] ?? null;
// Bình quân đầu kỳ và cuối kỳ (cho ROE, vòng quay tài sản)
const binhQuan = (m: MucBaoCao | undefined, i: number) => {
  const cuoi = n(m, i);
  const dau = i > 0 ? n(m, i - 1) : null;
  return cuoi == null ? null : dau == null ? cuoi : (cuoi + dau) / 2;
};

// Tăng trưởng kép hằng năm giữa giá trị đầu và cuối chuỗi (cả hai phải dương)
export function cagr(ds: SoNam[], soNam = 5) {
  const co = ds.filter((x) => x.gt != null);
  if (co.length < 2) return null;
  const cuoi = co[co.length - 1];
  const dau = co[Math.max(0, co.length - 1 - soNam)];
  const k = Number(cuoi.nam) - Number(dau.nam);
  if (k <= 0 || dau.gt! <= 0 || cuoi.gt! <= 0) return null;
  return { gt: ((cuoi.gt! / dau.gt!) ** (1 / k) - 1) * 100, soNam: k };
}

// Lịch sử P/E, P/B theo tháng: giá cuối tháng / EPS (BVPS) đã công bố tại thời điểm đó
function lichSuDinhGia(bc: BaoCao, nen: Nen[], soCoPhieu: number) {
  const moc = mocDinhGia(bc, soCoPhieu);
  const pe: Diem[] = [];
  const pb: Diem[] = [];
  let j = -1;
  for (let i = 0; i < nen.length; i++) {
    const c = nen[i];
    while (j + 1 < moc.length && moc[j + 1].tu <= c.time) j++;
    const thangSau = nen[i + 1] ? new Date((nen[i + 1].time + 7 * 3600) * 1000).getUTCMonth() : -1;
    if (j < 0 || thangSau === new Date((c.time + 7 * 3600) * 1000).getUTCMonth()) continue;
    const { eps, bvps } = moc[j];
    // Bỏ P/E khi lỗ hoặc lãi quá mỏng (P/E vô nghĩa, làm méo trung vị)
    if (eps && eps > 0 && c.close / eps < 200) pe.push({ time: c.time, value: c.close / eps });
    if (bvps && bvps > 0) pb.push({ time: c.time, value: c.close / bvps });
  }
  return { pe, pb };
}

export type ChiTieuNganh = { gt: number | null; tv: number | null; hang: number; tong: number };

// Vị trí của mã trong ngành theo một chỉ tiêu ("thapTot": thấp hơn là tốt hơn)
export function soVoiNganh(ban: DongLoc | undefined, nganh: DongLoc[], khoa: keyof DongLoc, thapTot = false): ChiTieuNganh {
  const loc = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && (khoa !== "pe" || (v > 0 && v < 200));
  const ds = nganh.map((d) => d[khoa]).filter(loc);
  const gt = ban && loc(ban[khoa]) ? (ban[khoa] as number) : null;
  const sx = [...ds].sort((a, b) => (thapTot ? a - b : b - a));
  return { gt, tv: trungVi(ds), hang: gt != null ? sx.indexOf(gt) + 1 : 0, tong: sx.length };
}

export function phanTichDoanhNghiep(bc: BaoCao, nen: Nen[], soCoPhieu: number) {
  const nh = bc.loai === "ngan_hang";
  const lnMe = tim(bc, "kqkd", "lợi nhuận sau thuế của công ty mẹ", "lợi nhuận sau thuế thu nhập doanh nghiệp");
  const doanhThu = tim(bc, "kqkd", "doanh thu thuần", "tổng thu nhập hoạt động", "cộng doanh thu hoạt động");
  const lnGop = tim(bc, "kqkd", "lợi nhuận gộp");
  const vcsh = tim(bc, "can_doi", "vốn chủ sở hữu");
  const tongTS = tim(bc, "can_doi", "tổng cộng tài sản");
  const no = tim(bc, "can_doi", "nợ phải trả");
  const cfo = tim(bc, "lctt", "lưu chuyển tiền thuần từ hoạt động kinh doanh");
  const capex = tim(bc, "lctt", "mua sắm tscđ", "tiền chi để mua sắm, xây dựng tscđ và các tài sản dài hạn khác");
  const coTuc = tim(bc, "lctt", "cổ tức, lợi nhuận đã trả cho chủ sở hữu", "cổ tức đã trả");

  const dinhGia = lichSuDinhGia(bc, nen, soCoPhieu);

  const dt = theoNam(bc, (i) => n(doanhThu, i));
  const ln = theoNam(bc, (i) => n(lnMe, i));
  // DuPont: ROE = biên lợi nhuận ròng × vòng quay tài sản × đòn bẩy tài chính
  const bd = Math.max(0, bc.nam.length - SO_NAM);
  const dupont = bc.nam.slice(bd).map((nam, k) => {
    const i = bd + k;
    const bien = chia(n(lnMe, i), n(doanhThu, i));
    const vongQuay = chia(n(doanhThu, i), binhQuan(tongTS, i));
    const donBay = chia(binhQuan(tongTS, i), binhQuan(vcsh, i));
    const roe = chia(n(lnMe, i), binhQuan(vcsh, i));
    return {
      nam,
      bien: bien != null ? bien * 100 : null,
      vongQuay,
      donBay,
      roe: roe != null ? roe * 100 : null,
    };
  });
  const noVon = theoNam(bc, (i) => chia(n(no, i), n(vcsh, i)));
  const noTS = theoNam(bc, (i) => {
    const x = chia(n(no, i), n(tongTS, i));
    return x != null ? x * 100 : null;
  });
  const dongTien = theoNam(bc, (i) => n(cfo, i));
  const dongTienTuDo = theoNam(bc, (i) => {
    const a = n(cfo, i);
    const b = n(capex, i);
    // Chi mua tài sản cố định ghi số âm
    return a == null ? null : a + (b ?? 0);
  });
  const cfoTrenLn = theoNam(bc, (i) => {
    const x = chia(n(cfo, i), n(lnMe, i));
    return x != null && (n(lnMe, i) ?? 0) > 0 ? x : null;
  });
  const coTucTra = theoNam(bc, (i) => {
    const x = n(coTuc, i);
    return x == null ? null : Math.abs(x);
  });
  const tyLeChiTra = theoNam(bc, (i) => {
    const x = n(coTuc, i);
    const l = n(lnMe, i);
    return x == null || l == null || l <= 0 ? null : (Math.abs(x) / l) * 100;
  });
  const bienGop = theoNam(bc, (i) => {
    const x = chia(n(lnGop, i), n(doanhThu, i));
    return x != null ? x * 100 : null;
  });

  return {
    nh,
    tenDoanhThu: nh ? "Tổng thu nhập hoạt động" : "Doanh thu thuần",
    dinhGia,
    dt,
    ln,
    bienGop,
    dupont,
    noVon,
    noTS,
    dongTien,
    dongTienTuDo,
    coCapex: !!capex,
    cfoTrenLn,
    coTucTra,
    tyLeChiTra,
  };
}

export type PhanTich = ReturnType<typeof phanTichDoanhNghiep>;
