// Phân tích chuyên sâu một doanh nghiệp từ số liệu theo quý đã chuẩn hoá của Mofi (financial/danh-gia/<MÃ>.json, đơn vị đồng).
// Tính sẵn đầu vào cho các mô hình định giá, bộ chỉ tiêu chất lượng theo từng loại hình (thường, ngân hàng, chứng khoán,
// bảo hiểm), rủi ro giá và danh sách tiêu chí đạt/không đạt. Chỉ dùng số đã công bố.

import { chiPhiVonChu, wacc, type DaiBoi, type DauVaoDinhGia, type GiaDinh } from "@/lib/mo-hinh-dinh-gia";

export type KyDanhGia = { ky: string; nam: number; q?: number; congBo?: string | null; cbThat?: number; so: Record<string, number | null | undefined> };
export type DanhGia = { ma: string; loai: string; quy: KyDanhGia[]; nam: KyDanhGia[] };
type NenGon = { time: number; close: number; volume: number };
export type Diem = { time: number; value: number };
export type TheSo = { nhan: string; gt: string; phu?: string; tot?: boolean | null };
export type TieuChi = { ten: string; dat: boolean | null; chiTiet: string };
export type TruCot = { ten: string; ds: TieuChi[] };
export type CotKy = { nam: string; gt: number | null };

const KHOA_DT: Record<string, string> = { thuong: "doanhThu", ngan_hang: "tongThuNhapHD", chung_khoan: "doanhThuHoatDong", bao_hiem: "doanhThuPhiThuan" };
export const TEN_DT: Record<string, string> = { thuong: "Doanh thu thuần", ngan_hang: "Tổng thu nhập hoạt động", chung_khoan: "Doanh thu hoạt động", bao_hiem: "Doanh thu phí thuần" };

const so = (x: number | null, le = 1) => (x == null || !Number.isFinite(x) ? "—" : x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le }));
const pt = (x: number | null, le = 1) => (x == null || !Number.isFinite(x) ? "—" : `${so(x, le)}%`);
const lan = (x: number | null, le = 2) => (x == null || !Number.isFinite(x) ? "—" : `${so(x, le)} lần`);
const ty = (x: number | null) => (x == null || !Number.isFinite(x) ? "—" : `${so(x / 1e9, 0)} tỷ`);
const kep = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const chia = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : a / b);
const tb = (ds: (number | null)[]) => {
  const co = ds.filter((x): x is number => x != null && Number.isFinite(x));
  return co.length ? co.reduce((s, x) => s + x, 0) / co.length : null;
};
const nhanQuy = (k: KyDanhGia) => `Q${k.q ?? Math.ceil(Number(k.ky.slice(5, 7)) / 3)}'${String(k.nam).slice(2)}`;
// Ngày thị trường biết báo cáo: ngày công bố thật, không có thì 45 ngày sau khi hết quý (kỳ cũ Mofi chỉ ghi ngày nhập liệu)
const lucBiet = (k: KyDanhGia) => (k.congBo && k.cbThat ? giay(k.congBo) : giay(k.ky) + 45 * 86400);
const giay = (ymd: string) => Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10))) / 1000 - 7 * 3600;

// Bộ đọc số theo quý: v = số của quý, ttm = cộng 4 quý, bq = bình quân cuối kỳ và cùng kỳ năm trước
function boDoc(dg: DanhGia) {
  const Q = dg.quy;
  const v = (i: number, k: string) => (i >= 0 && i < Q.length ? (Q[i].so[k] ?? null) : null);
  const ttm = (i: number, k: string) => {
    if (i < 3) return null;
    let s = 0;
    for (let j = i - 3; j <= i; j++) {
      const x = v(j, k);
      if (x == null) return null;
      s += x;
    }
    return s;
  };
  // Khoản mục có thể không phát sinh (lãi vay, khấu hao, cổ tức): thiếu thì coi là 0
  const ttm0 = (i: number, k: string) => {
    if (i < 3) return null;
    let s = 0;
    for (let j = i - 3; j <= i; j++) s += v(j, k) ?? 0;
    return s;
  };
  const bq = (i: number, k: string) => {
    const a = v(i, k);
    const b = v(i - 4, k);
    return a == null ? null : b == null ? a : (a + b) / 2;
  };
  return { Q, L: Q.length - 1, v, ttm, ttm0, bq };
}

function phanVi(ds: number[], p: number) {
  const i = (ds.length - 1) * p;
  const a = Math.floor(i);
  return ds[a] + (ds[Math.min(ds.length - 1, a + 1)] - ds[a]) * (i - a);
}

// Dải bội số: cắt 2% mỗi đầu để vài phiên đột biến không kéo lệch
function dai(giaTri: number[], nay: number | null): DaiBoi | null {
  if (giaTri.length < 120) return null;
  const s = [...giaTri].sort((a, b) => a - b);
  const cat = Math.floor(s.length * 0.02);
  const g = s.slice(cat, s.length - cat);
  return { p25: phanVi(g, 0.25), tv: phanVi(g, 0.5), p75: phanVi(g, 0.75), nay, vi: nay != null ? (s.filter((x) => x < nay).length / s.length) * 100 : null, soPhien: s.length };
}

const SO_PHIEN_DAI = 1250; // khoảng 5 năm giao dịch

// Mỗi phiên ghép với kỳ báo cáo đã công bố tính đến phiên đó: bội số "thị trường đã thật sự trả"
function lichSuBoi(dg: DanhGia, nen: NenGon[], soCp: number) {
  const { Q, v, ttm, ttm0 } = boDoc(dg);
  const moc = Q.map((k, i) => {
    const ln = ttm(i, "lnstMe");
    const vonChu = v(i, "vonChu");
    const ltt = ttm(i, "lnTruocThue");
    const ebitda = ltt != null ? ltt + (ttm0(i, "chiPhiLaiVay") ?? 0) + (ttm0(i, "khauHao") ?? 0) : null;
    const noRong = (v(i, "vayNganHan") ?? 0) + (v(i, "vayDaiHan") ?? 0) - (v(i, "tienVaTuongDuong") ?? 0) - (v(i, "dauTuNganHan") ?? 0);
    const tu = lucBiet(k);
    return { tu, eps: ln != null ? ln / soCp : null, bvps: vonChu != null ? vonChu / soCp : null, ebitda, noRong, thieuSo: v(i, "loiIchCDTS") ?? 0 };
  });
  const pe: Diem[] = [];
  const pb: Diem[] = [];
  const ev: Diem[] = [];
  let j = -1;
  for (const c of nen) {
    while (j + 1 < moc.length && moc[j + 1].tu <= c.time) j++;
    if (j < 0) continue;
    const m = moc[j];
    if (m.eps != null && m.eps > 0 && c.close / m.eps < 150) pe.push({ time: c.time, value: c.close / m.eps });
    if (m.bvps != null && m.bvps > 0) pb.push({ time: c.time, value: c.close / m.bvps });
    if (dg.loai === "thuong" && m.ebitda != null && m.ebitda > 0) {
      const x = (c.close * soCp + m.noRong + m.thieuSo) / m.ebitda;
      if (x > 0 && x < 100) ev.push({ time: c.time, value: x });
    }
  }
  const cuoiPhien = nen[nen.length - 1]?.time ?? 0;
  const lay = (ds: Diem[]) => {
    const gan = ds.slice(-SO_PHIEN_DAI);
    const nay = ds.length && ds[ds.length - 1].time === cuoiPhien ? ds[ds.length - 1].value : null;
    return dai(gan.map((x) => x.value), nay);
  };
  // Biểu đồ: mỗi tuần một điểm cho nhẹ
  const thua = (ds: Diem[]) => ds.filter((_, i) => i % 5 === 0 || i === ds.length - 1).slice(-520);
  return { boi: { pe: lay(pe), pb: lay(pb), evEbitda: lay(ev) }, duongPe: thua(pe), duongPb: thua(pb) };
}

// Beta theo lợi suất tuần 2 năm so với VN-Index, điều chỉnh Blume (kéo một phần ba về 1)
function tinhBeta(nen: NenGon[], vni: NenGon[]) {
  // Ghép theo ngày: nến cổ phiếu và nến chỉ số có thể đánh dấu giờ khác nhau
  const ngay = (t: number) => Math.floor((t + 7 * 3600) / 86400);
  const chiSo = new Map(vni.map((c) => [ngay(c.time), c.close]));
  const cap = nen.filter((c) => chiSo.has(ngay(c.time))).slice(-520).filter((_, i) => i % 5 === 0).map((c) => ({ time: ngay(c.time), close: c.close }));
  if (cap.length < 40) return null;
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 1; i < cap.length; i++) {
    x.push(chiSo.get(cap[i].time)! / chiSo.get(cap[i - 1].time)! - 1);
    y.push(cap[i].close / cap[i - 1].close - 1);
  }
  const mx = tb(x)!;
  const my = tb(y)!;
  let cov = 0;
  let vx = 0;
  for (let i = 0; i < x.length; i++) {
    cov += (x[i] - mx) * (y[i] - my);
    vx += (x[i] - mx) ** 2;
  }
  if (!vx) return null;
  const tho = cov / vx;
  return { tho, dieuChinh: kep(0.67 * tho + 0.33, 0.4, 2) };
}

function ruiRoGia(nen: NenGon[], vni: NenGon[], beta: ReturnType<typeof tinhBeta>): TheSo[] {
  const n = nen.length;
  const gia = nen[n - 1].close;
  const nam = nen.slice(-252);
  const ls = nam.slice(1).map((c, i) => Math.log(c.close / nam[i].close));
  const m = tb(ls) ?? 0;
  const bienDong = ls.length > 20 ? Math.sqrt(ls.reduce((s, x) => s + (x - m) ** 2, 0) / (ls.length - 1)) * Math.sqrt(252) * 100 : null;
  let dinh = 0;
  let sut = 0;
  for (const c of nen.slice(-756)) {
    dinh = Math.max(dinh, c.close);
    sut = Math.min(sut, c.close / dinh - 1);
  }
  const cao = Math.max(...nam.map((c) => c.close));
  const thap = Math.min(...nam.map((c) => c.close));
  const gtgd = tb(nen.slice(-20).map((c) => c.close * c.volume));
  const hieuSuat = (ds: NenGon[], phien: number) => (ds.length > phien ? (ds[ds.length - 1].close / ds[ds.length - 1 - phien].close - 1) * 100 : null);
  const hs = hieuSuat(nen, 252);
  const hsVni = hieuSuat(vni, 252);
  return [
    { nhan: "Beta so với VN-Index", gt: beta ? so(beta.dieuChinh, 2) : "—", phu: beta ? `Beta thô ${so(beta.tho, 2)}, lợi suất tuần 2 năm` : "Chưa đủ lịch sử", tot: null },
    { nhan: "Biến động 1 năm", gt: pt(bienDong, 0), phu: "Độ lệch chuẩn lợi suất ngày, quy năm", tot: null },
    { nhan: "Mức sụt sâu nhất 3 năm", gt: pt(sut * 100, 0), phu: "Từ đỉnh xuống đáy, theo giá đóng cửa", tot: null },
    { nhan: "Vị trí trong biên độ 52 tuần", gt: cao > thap ? pt(((gia - thap) / (cao - thap)) * 100, 0) : "—", phu: `Thấp ${so(thap / 1000, 2)} · cao ${so(cao / 1000, 2)}`, tot: null },
    { nhan: "Giá trị giao dịch bình quân", gt: ty(gtgd), phu: "20 phiên gần nhất, mỗi phiên", tot: gtgd != null ? gtgd >= 5e9 : null },
    { nhan: "Hiệu suất 1 năm", gt: hs != null ? `${hs > 0 ? "+" : ""}${so(hs, 1)}%` : "—", phu: hsVni != null ? `VN-Index ${hsVni > 0 ? "+" : ""}${so(hsVni, 1)}%` : undefined, tot: hs != null && hsVni != null ? hs > hsVni : null },
  ];
}

export function phanTichSau(a: { dg: DanhGia; nen: NenGon[]; vni: NenGon[]; soCp: number; gia: number; rf: number; peNganh: number | null; tenNganh: string | null; epsChuanHoa: number | null; noXau: number | null }) {
  const { dg, nen, vni, soCp, gia, rf } = a;
  const { Q, L, v, ttm, ttm0, bq } = boDoc(dg);
  const loai = dg.loai;
  const taiChinh = loai !== "thuong";
  const kDt = KHOA_DT[loai] ?? "doanhThu";
  const tenDt = TEN_DT[loai] ?? "Doanh thu";

  // ---- Số gốc 4 quý gần nhất
  const dt = ttm(L, kDt);
  const ln = ttm(L, "lnstMe");
  const ltt = ttm(L, "lnTruocThue");
  const lnst = ttm(L, "lnst");
  const vonChu = v(L, "vonChu");
  const thue = ltt != null && lnst != null && ltt > 0 ? kep(1 - lnst / ltt, 0, 0.35) : 0.2;
  const vayCua = (i: number) => (v(i, "vayNganHan") ?? 0) + (v(i, "vayDaiHan") ?? 0);
  const vay = vayCua(L);
  const tien = (v(L, "tienVaTuongDuong") ?? 0) + (v(L, "dauTuNganHan") ?? 0);
  const noRong = vay - tien;
  const laiVay = ttm0(L, "chiPhiLaiVay") ?? 0;
  const ebit = ltt != null ? ltt + laiVay : null;
  const ebitda = ebit != null ? ebit + (ttm0(L, "khauHao") ?? 0) : null;
  const roeCua = (i: number) => {
    const x = chia(ttm(i, "lnstMe"), bq(i, "vonChu"));
    return x != null ? x * 100 : null;
  };
  const roe = roeCua(L);
  const roeTb = tb([0, 4, 8, 12, 16].map((k) => roeCua(L - k)));
  const roa = (() => {
    const x = chia(ln, bq(L, "tongTaiSan"));
    return x != null ? x * 100 : null;
  })();
  const coTuc = Math.abs(ttm0(L, "coTucDaTra") ?? 0);
  const coTuc3Nam = tb([0, 4, 8].map((k) => (ttm(L - k, "lnstMe") != null ? Math.abs(ttm0(L - k, "coTucDaTra") ?? 0) : null)));
  const ln3Nam = tb([0, 4, 8].map((k) => ttm(L - k, "lnstMe")));
  const tyLeChiTra = ln3Nam != null && ln3Nam > 0 && coTuc3Nam != null ? kep(coTuc3Nam / ln3Nam, 0, 1) : 0;
  const eps = ln != null ? ln / soCp : null;
  const bvps = vonChu != null ? vonChu / soCp : null;
  const vonHoa = gia * soCp;

  // Dòng tiền tự do cho doanh nghiệp: tiền từ kinh doanh + lãi vay đã trả sau thuế − mua tài sản cố định; bình quân 3 năm cho đỡ nhiễu
  const fcffCua = (i: number) => {
    const cfo = ttm(i, "tienHDKD");
    return cfo == null ? null : cfo + Math.abs(ttm0(i, "tienLaiVayDaTra") ?? 0) * (1 - thue) + (ttm0(i, "muaTaiSan") ?? 0);
  };
  const fcffNam = [0, 4, 8].map((k) => fcffCua(L - k));
  const fcff = taiChinh ? null : tb(fcffNam);

  const vayBq = (vayCua(L) + vayCua(L - 4)) / 2;
  const laiDaTra = Math.abs(ttm0(L, "tienLaiVayDaTra") ?? 0) || laiVay;
  const chiPhiNo = vayBq > 0 && laiDaTra > 0 ? kep((laiDaTra / vayBq) * 100, 3, 15) : rf + 3;
  const beta = tinhBeta(nen, vni);

  // ---- Tăng trưởng
  const tangKep = (k: string, nam: number) => {
    const nay = ttm(L, k);
    const truoc = ttm(L - nam * 4, k);
    return nay != null && truoc != null && nay > 0 && truoc > 0 ? ((nay / truoc) ** (1 / nam) - 1) * 100 : null;
  };
  const cagr = { dt3: tangKep(kDt, 3), dt5: tangKep(kDt, 5), ln3: tangKep("lnstMe", 3), ln5: tangKep("lnstMe", 5) };
  const soCungKy = (k: string) => {
    const nay = ttm(L, k);
    const truoc = ttm(L - 4, k);
    return nay != null && truoc != null && truoc > 0 ? (nay / truoc - 1) * 100 : null;
  };
  const tangQuy = (k: string): CotKy[] =>
    Q.slice(-12).map((ky, j) => {
      const i = Q.length - Math.min(12, Q.length) + j;
      const nay = v(i, k);
      const truoc = v(i - 4, k);
      return { nam: nhanQuy(ky), gt: nay != null && truoc != null && truoc > 0 ? (nay / truoc - 1) * 100 : null };
    });
  const beVung = roeTb != null ? roeTb * (1 - tyLeChiTra) : null;
  const goiY = kep(Math.min(cagr.dt5 ?? cagr.dt3 ?? 6, taiChinh ? (beVung ?? 10) : 15), 0, 15);

  const giaDinh: GiaDinh = { rf, erp: 8, beta: beta?.dieuChinh ?? 1, g1: Math.round(goiY * 2) / 2, gT: 3 };
  const ls = lichSuBoi(dg, nen, soCp);
  const dauVao: DauVaoDinhGia = {
    ma: dg.ma,
    gia,
    soCp,
    taiChinh,
    eps,
    epsChuanHoa: a.epsChuanHoa,
    bvps,
    coTucCp: coTuc / soCp,
    roe: roeTb ?? roe,
    tyLeChiTra,
    fcff,
    ebitda,
    noRong: taiChinh ? 0 : noRong,
    loiIchThieuSo: v(L, "loiIchCDTS") ?? 0,
    tyTrongNo: taiChinh ? 0 : kep(vay / (vay + vonHoa), 0, 0.9),
    chiPhiNo,
    thue,
    boi: ls.boi,
    peNganh: a.peNganh,
    tenNganh: a.tenNganh,
  };
  const ke = chiPhiVonChu(giaDinh);
  const waccNay = wacc(dauVao, giaDinh);

  // ---- Chuỗi theo quý cho biểu đồ (10 năm)
  const tu = Math.max(3, Q.length - 40);
  const chuoi = (tinh: (i: number) => number | null): Diem[] => {
    const ds: Diem[] = [];
    for (let i = tu; i <= L; i++) {
      const x = tinh(i);
      if (x != null && Number.isFinite(x)) ds.push({ time: giay(Q[i].ky) + 7 * 3600, value: x });
    }
    return ds;
  };
  const tyLe = (tu_: string, mau: string) => (i: number) => {
    const x = chia(ttm(i, tu_), ttm(i, mau));
    return x != null ? x * 100 : null;
  };
  const bienRongNay = tyLe("lnstMe", kDt)(L);

  const chatLuong: { the: TheSo[]; duong: { ten: string; duong: { ten: string; diem: Diem[] }[] }[]; ghiChu: string } = { the: [], duong: [], ghiChu: "" };
  const sucKhoe: TheSo[] = [];
  const tcChatLuong: TieuChi[] = [];
  const tcSucKhoe: TieuChi[] = [];
  const tc = (ds: TieuChi[], ten: string, dat: boolean | null, chiTiet: string) => ds.push({ ten, dat, chiTiet });
  let fScore: { diem: number; ds: TieuChi[] } | null = null;

  tc(tcChatLuong, "ROE từ 15% trở lên", roe != null ? roe >= 15 : null, `ROE 4 quý ${pt(roe)}, bình quân 5 năm ${pt(roeTb)}`);
  tc(tcChatLuong, "ROE cao hơn chi phí vốn chủ", roe != null ? roe > ke : null, `Chi phí vốn chủ ước tính ${pt(ke)} (lãi tiết kiệm ${pt(rf)} + beta ${so(giaDinh.beta, 2)} × 8%)`);

  if (loai === "thuong") {
    const bienGop = tyLe("lnGop", kDt);
    const bienEbit = (i: number) => {
      const l = ttm(i, "lnTruocThue");
      const x = l != null ? chia(l + (ttm0(i, "chiPhiLaiVay") ?? 0), ttm(i, kDt)) : null;
      return x != null ? x * 100 : null;
    };
    const vonDauTu = (i: number) => {
      const x = v(i, "vonChu");
      return x == null ? null : x + vayCua(i);
    };
    const roicCua = (i: number) => {
      const l = ttm(i, "lnTruocThue");
      const a1 = vonDauTu(i);
      const a0 = vonDauTu(i - 4) ?? a1;
      if (l == null || a1 == null || a0 == null) return null;
      return (((l + (ttm0(i, "chiPhiLaiVay") ?? 0)) * (1 - thue)) / ((a1 + a0) / 2)) * 100;
    };
    const roic = roicCua(L);
    const cfo = ttm(L, "tienHDKD");
    const cfoLn = tb([0, 4, 8].map((k) => ttm(L - k, "tienHDKD")));
    const tyLeTien = cfoLn != null && ln3Nam != null && ln3Nam > 0 ? cfoLn / ln3Nam : null;
    const gv = ttm(L, "giaVon");
    const ngay = (k: string, mau: number | null) => {
      const x = chia(bq(L, k), mau);
      return x != null ? x * 365 : null;
    };
    const dso = ngay("phaiThuKhachHang", dt);
    const dio = ngay("hangTonKho", gv);
    const dpo = ngay("phaiTraNguoiBan", gv);
    const ccc = dso != null && dio != null && dpo != null ? dso + dio - dpo : null;
    const donTich = ln != null && cfo != null ? chia(ln - cfo, bq(L, "tongTaiSan")) : null;
    const g0 = bienGop(L);
    const g1 = bienGop(L - 4);

    // Piotroski F-Score: 9 phép thử, so 4 quý gần nhất với 4 quý liền trước
    const P = L - 4;
    const roaCua = (i: number) => chia(ttm(i, "lnstMe"), bq(i, "tongTaiSan"));
    const vongQuay = (i: number) => chia(ttm(i, kDt), bq(i, "tongTaiSan"));
    const thanhToan = (i: number) => chia(v(i, "taiSanNganHan"), v(i, "noNganHan"));
    const noDai = (i: number) => chia(v(i, "vayDaiHan") ?? 0, v(i, "tongTaiSan"));
    const hon = (x: number | null, y: number | null) => (x == null || y == null ? null : x > y);
    const f: TieuChi[] = [
      { ten: "Có lãi", dat: ln != null ? ln > 0 : null, chiTiet: `Lợi nhuận 4 quý ${ty(ln)}` },
      { ten: "Dòng tiền kinh doanh dương", dat: cfo != null ? cfo > 0 : null, chiTiet: ty(cfo) },
      { ten: "ROA cải thiện", dat: hon(roaCua(L), roaCua(P)), chiTiet: `${pt((roaCua(L) ?? NaN) * 100)} so với ${pt((roaCua(P) ?? NaN) * 100)}` },
      { ten: "Tiền thu về nhiều hơn lãi", dat: hon(cfo, ln), chiTiet: `${ty(cfo)} so với ${ty(ln)}` },
      { ten: "Nợ vay dài hạn trên tài sản giảm", dat: (() => { const x = noDai(L); const y = noDai(P); return x == null || y == null ? null : x <= y; })(), chiTiet: `${pt((noDai(L) ?? NaN) * 100)} so với ${pt((noDai(P) ?? NaN) * 100)}` },
      { ten: "Khả năng thanh toán hiện hành tăng", dat: hon(thanhToan(L), thanhToan(P)), chiTiet: `${so(thanhToan(L), 2)} so với ${so(thanhToan(P), 2)}` },
      { ten: "Không phát hành thêm cổ phần", dat: (() => { const x = v(L, "vonGop"); const y = v(P, "vonGop"); return x == null || y == null ? null : x <= y * 1.001; })(), chiTiet: `Vốn góp ${ty(v(L, "vonGop"))} so với ${ty(v(P, "vonGop"))}` },
      { ten: "Biên lợi nhuận gộp tăng", dat: hon(g0, g1), chiTiet: `${pt(g0)} so với ${pt(g1)}` },
      { ten: "Vòng quay tài sản tăng", dat: hon(vongQuay(L), vongQuay(P)), chiTiet: `${so(vongQuay(L), 2)} so với ${so(vongQuay(P), 2)}` },
    ];
    fScore = { diem: f.filter((x) => x.dat).length, ds: f };

    chatLuong.the = [
      { nhan: "ROIC", gt: pt(roic), phu: `Chi phí vốn (WACC) ${pt(waccNay)}`, tot: roic != null ? roic > waccNay : null },
      { nhan: "Biên lợi nhuận gộp", gt: pt(g0), phu: `Cùng kỳ năm trước ${pt(g1)}`, tot: g0 != null && g1 != null ? g0 >= g1 : null },
      { nhan: "Biên EBIT", gt: pt(bienEbit(L)), phu: `Biên ròng ${pt(bienRongNay)}`, tot: null },
      { nhan: "Tiền thu về trên mỗi đồng lãi", gt: tyLeTien != null ? `${so(tyLeTien, 2)} đồng` : "—", phu: "Dòng tiền kinh doanh / lợi nhuận, 3 năm", tot: tyLeTien != null ? tyLeTien >= 0.8 : null },
      { nhan: "Lợi nhuận dồn tích", gt: pt(donTich != null ? donTich * 100 : null), phu: "(Lãi − tiền kinh doanh) / tài sản; càng thấp càng thật", tot: donTich != null ? donTich < 0.05 : null },
      { nhan: "Số ngày thu tiền", gt: dso != null ? `${so(dso, 0)} ngày` : "—", phu: "Phải thu khách hàng / doanh thu", tot: null },
      { nhan: "Số ngày tồn kho", gt: dio != null ? `${so(dio, 0)} ngày` : "—", phu: `Trả người bán sau ${dpo != null ? so(dpo, 0) : "—"} ngày`, tot: null },
      { nhan: "Chu kỳ tiền mặt", gt: ccc != null ? `${so(ccc, 0)} ngày` : "—", phu: "Thu tiền + tồn kho − trả người bán", tot: null },
    ];
    chatLuong.duong = [
      { ten: "Biên lợi nhuận 4 quý cuốn chiếu (%)", duong: [{ ten: "Biên gộp", diem: chuoi(bienGop) }, { ten: "Biên EBIT", diem: chuoi(bienEbit) }, { ten: "Biên ròng", diem: chuoi(tyLe("lnstMe", kDt)) }] },
      { ten: "ROE và ROIC 4 quý cuốn chiếu (%)", duong: [{ ten: "ROE", diem: chuoi(roeCua) }, { ten: "ROIC", diem: chuoi(roicCua) }] },
    ];
    chatLuong.ghiChu = "ROIC = EBIT sau thuế / (vốn chủ + nợ vay) bình quân. Doanh nghiệp tạo giá trị khi ROIC cao hơn chi phí vốn.";
    tc(tcChatLuong, "ROIC cao hơn chi phí vốn", roic != null ? roic > waccNay : null, `ROIC ${pt(roic)} so với WACC ${pt(waccNay)}`);
    tc(tcChatLuong, "Lợi nhuận chuyển thành tiền", tyLeTien != null ? tyLeTien >= 0.8 : null, `Mỗi đồng lãi đi kèm ${tyLeTien != null ? so(tyLeTien, 2) : "—"} đồng tiền từ kinh doanh (3 năm)`);
    tc(tcChatLuong, "F-Score từ 6/9 trở lên", fScore.diem >= 6, `Đạt ${fScore.diem}/9 phép thử Piotroski`);

    const phuLai = laiVay > 0 ? chia(ebit, laiVay) : null;
    const noEbitda = ebitda != null && ebitda > 0 ? noRong / ebitda : null;
    const hienHanh = thanhToan(L);
    const nhanh = chia((v(L, "taiSanNganHan") ?? NaN) - (v(L, "hangTonKho") ?? 0), v(L, "noNganHan"));
    const vayVon = chia(vay, vonChu);
    sucKhoe.push(
      { nhan: "Nợ ròng / EBITDA", gt: noRong <= 0 ? "Tiền nhiều hơn nợ" : lan(noEbitda, 1), phu: `Nợ vay ${ty(vay)} · tiền và đầu tư ngắn hạn ${ty(tien)}`, tot: noRong <= 0 ? true : noEbitda != null ? noEbitda < 3 : null },
      { nhan: "EBIT / lãi vay", gt: laiVay > 0 ? lan(phuLai, 1) : "Không có lãi vay", phu: `Lãi vay 4 quý ${ty(laiVay)}`, tot: laiVay > 0 ? (phuLai != null ? phuLai > 3 : null) : true },
      { nhan: "Thanh toán hiện hành", gt: lan(hienHanh), phu: `Thanh toán nhanh ${lan(nhanh)}`, tot: hienHanh != null ? hienHanh > 1 : null },
      { nhan: "Nợ vay / vốn chủ", gt: lan(vayVon), phu: vay > 0 ? `${pt(((v(L, "vayNganHan") ?? 0) / vay) * 100, 0)} là vay ngắn hạn` : undefined, tot: vayVon != null ? vayVon < 1 : null },
    );
    tc(tcSucKhoe, "Nợ ròng dưới 3 lần EBITDA", noRong <= 0 ? true : noEbitda != null ? noEbitda < 3 : null, noRong <= 0 ? "Tiền và đầu tư ngắn hạn nhiều hơn nợ vay" : `Nợ ròng ${ty(noRong)}, bằng ${lan(noEbitda, 1)} EBITDA`);
    tc(tcSucKhoe, "EBIT gấp hơn 3 lần lãi vay", laiVay > 0 ? (phuLai != null ? phuLai > 3 : null) : true, laiVay > 0 ? `EBIT gấp ${lan(phuLai, 1)} lãi vay` : "Không phát sinh lãi vay");
    tc(tcSucKhoe, "Tài sản ngắn hạn đủ trả nợ ngắn hạn", hienHanh != null ? hienHanh > 1 : null, `Hệ số thanh toán hiện hành ${lan(hienHanh)}`);
    tc(tcSucKhoe, "Nợ vay thấp hơn vốn chủ", vayVon != null ? vayVon < 1 : null, `Nợ vay bằng ${lan(vayVon)} vốn chủ`);
  } else if (loai === "ngan_hang") {
    const sinhLai = (i: number) => (v(i, "choVayKhachHang") ?? 0) + (v(i, "chungKhoanDauTu") ?? 0) + (v(i, "tienGuiChoVayTCTD") ?? 0) + (v(i, "tienGuiNHNN") ?? 0);
    const nimCua = (i: number) => {
      const x = ttm(i, "thuNhapLaiThuan");
      const m = (sinhLai(i) + sinhLai(i - 4 >= 0 ? i - 4 : i)) / 2;
      return x != null && m > 0 ? (x / m) * 100 : null;
    };
    const cirCua = tyLe("chiPhiHoatDong", "tongThuNhapHD");
    const tinDungCua = (i: number) => {
      const x = chia(ttm(i, "chiPhiDuPhong"), bq(i, "choVayKhachHang"));
      return x != null ? x * 100 : null;
    };
    const nim = nimCua(L);
    const cir = cirCua(L);
    const tinDung = tinDungCua(L);
    const ldr = chia(v(L, "choVayKhachHang"), v(L, "tienGuiKhachHang"));
    const duPhong = chia(Math.abs(v(L, "duPhongChoVay") ?? NaN), v(L, "choVayKhachHang"));
    const ngoaiLai = dt != null ? chia(dt - (ttm(L, "thuNhapLaiThuan") ?? NaN), dt) : null;
    const car = [...Q].reverse().find((k) => k.so.heSoAnToanVon != null)?.so.heSoAnToanVon ?? null;
    const donBay = chia(v(L, "tongTaiSan"), vonChu);
    const tangTinDung = (() => {
      const x = v(L, "choVayKhachHang");
      const y = v(L - 4, "choVayKhachHang");
      return x != null && y != null && y > 0 ? (x / y - 1) * 100 : null;
    })();
    chatLuong.the = [
      { nhan: "Biên lãi thuần (NIM)", gt: pt(nim, 2), phu: "Thu nhập lãi thuần / tài sản sinh lãi bình quân", tot: nim != null ? nim >= 3 : null },
      { nhan: "Chi phí / thu nhập (CIR)", gt: pt(cir), phu: "Càng thấp càng hiệu quả", tot: cir != null ? cir < 40 : null },
      { nhan: "Chi phí tín dụng", gt: pt(tinDung, 2), phu: "Trích lập dự phòng 4 quý / dư nợ bình quân", tot: tinDung != null ? tinDung < 1.5 : null },
      { nhan: "Tỷ lệ nợ xấu", gt: pt(a.noXau, 2), phu: "Nợ nhóm 3 đến 5 / tổng dư nợ, kỳ gần nhất có thuyết minh", tot: a.noXau != null ? a.noXau < 2 : null },
      { nhan: "Thu nhập ngoài lãi", gt: pt(ngoaiLai != null ? ngoaiLai * 100 : null), phu: "Phí dịch vụ, ngoại hối, chứng khoán trên tổng thu nhập", tot: null },
      { nhan: "Tăng trưởng tín dụng", gt: pt(tangTinDung), phu: "Dư nợ cho vay khách hàng so với cùng kỳ", tot: null },
    ];
    chatLuong.duong = [
      { ten: "NIM và chi phí tín dụng, 4 quý cuốn chiếu (%)", duong: [{ ten: "NIM", diem: chuoi(nimCua) }, { ten: "Chi phí tín dụng", diem: chuoi(tinDungCua) }] },
      { ten: "ROE và CIR, 4 quý cuốn chiếu (%)", duong: [{ ten: "ROE", diem: chuoi(roeCua) }, { ten: "CIR", diem: chuoi(cirCua) }] },
    ];
    chatLuong.ghiChu = "Ngân hàng kiếm lời từ chênh lệch lãi và mất tiền ở nợ xấu: NIM, CIR và chi phí tín dụng quyết định ROE.";
    tc(tcChatLuong, "NIM từ 3% trở lên", nim != null ? nim >= 3 : null, `NIM ${pt(nim, 2)}`);
    tc(tcChatLuong, "CIR dưới 40%", cir != null ? cir < 40 : null, `Chi phí hoạt động bằng ${pt(cir)} thu nhập`);
    tc(tcChatLuong, "Chi phí tín dụng dưới 1,5%", tinDung != null ? tinDung < 1.5 : null, `Trích lập ${pt(tinDung, 2)} dư nợ bình quân`);
    sucKhoe.push(
      { nhan: "Hệ số an toàn vốn (CAR)", gt: pt(typeof car === "number" ? car : null, 2), phu: "Theo báo cáo thường niên gần nhất; tối thiểu 8%", tot: typeof car === "number" ? car >= 10 : null },
      { nhan: "Cho vay / tiền gửi (LDR)", gt: pt(ldr != null ? ldr * 100 : null), phu: "Tính thô trên bảng cân đối, khác cách tính của NHNN", tot: ldr != null ? ldr < 1 : null },
      { nhan: "Dự phòng / dư nợ", gt: pt(duPhong != null ? duPhong * 100 : null, 2), phu: a.noXau != null && duPhong != null && a.noXau > 0 ? `Bao phủ nợ xấu ${pt((duPhong * 100 / a.noXau) * 100, 0)}` : "Quỹ dự phòng rủi ro cho vay", tot: null },
      { nhan: "Tài sản / vốn chủ", gt: lan(donBay, 1), phu: "Đòn bẩy bảng cân đối", tot: null },
    );
    tc(tcSucKhoe, "CAR từ 10% trở lên", typeof car === "number" ? car >= 10 : null, typeof car === "number" ? `CAR ${pt(car, 2)}` : "Chưa có số CAR");
    tc(tcSucKhoe, "Nợ xấu dưới 2%", a.noXau != null ? a.noXau < 2 : null, a.noXau != null ? `Nợ xấu ${pt(a.noXau, 2)}` : "Chưa có thuyết minh nhóm nợ");
    tc(tcSucKhoe, "Cho vay không vượt tiền gửi", ldr != null ? ldr < 1 : null, `LDR thô ${pt(ldr != null ? ldr * 100 : null)}`);
  } else if (loai === "chung_khoan") {
    const choVay = v(L, "choVay");
    const kyQuy = chia(choVay, vonChu);
    const tuDoanhCua = (i: number) => {
      const l = ttm0(i, "laiFVTPL");
      const lo = ttm0(i, "loFVTPL");
      return l == null || lo == null ? null : l - lo + (ttm0(i, "laiTraiPhieuSanSangBan") ?? 0);
    };
    const tuDoanh = tuDoanhCua(L);
    const laiChoVay = ttm(L, "laiChoVay");
    const moiGioi = ttm(L, "doanhThuMoiGioi");
    const cpMoiGioi = ttm0(L, "chiPhiMoiGioi") ?? 0;
    const laiTienGui = (ttm0(L, "laiNamGiuDenDaoHan") ?? 0) + (ttm0(L, "coTucLaiTienGui") ?? 0);
    const nguon = (tuDoanh ?? 0) + (laiChoVay ?? 0) + ((moiGioi ?? 0) - cpMoiGioi) + laiTienGui;
    const tyTrongTuDoanh = tuDoanh != null && nguon > 0 ? (tuDoanh / nguon) * 100 : null;
    const bienMoiGioi = moiGioi != null && moiGioi > 0 ? ((moiGioi - cpMoiGioi) / moiGioi) * 100 : null;
    const loiSuatVay = chia(laiChoVay, bq(L, "choVay"));
    const chiPhiVon = vayBq > 0 ? laiDaTra / vayBq : null;
    const chenh = loiSuatVay != null && chiPhiVon != null ? (loiSuatVay - chiPhiVon) * 100 : null;
    const chuaThucHien = chia(ttm0(L, "lnTruocThueChuaThucHien"), bq(L, "vonChu"));
    const phuLai = laiDaTra > 0 && ltt != null ? (ltt + laiDaTra) / laiDaTra : null;
    const donBay = chia(v(L, "tongTaiSan"), vonChu);
    chatLuong.the = [
      { nhan: "Tỷ trọng tự doanh", gt: pt(tyTrongTuDoanh), phu: `Lãi tự doanh thuần ${ty(tuDoanh)} trong tổng lãi các mảng`, tot: tyTrongTuDoanh != null ? tyTrongTuDoanh < 50 : null },
      { nhan: "Biên gộp môi giới", gt: pt(bienMoiGioi), phu: `Doanh thu môi giới ${ty(moiGioi)}`, tot: bienMoiGioi != null ? bienMoiGioi > 0 : null },
      { nhan: "Lợi suất cho vay ký quỹ", gt: pt(loiSuatVay != null ? loiSuatVay * 100 : null, 2), phu: `Chi phí vốn vay ${pt(chiPhiVon != null ? chiPhiVon * 100 : null, 2)}`, tot: null },
      { nhan: "Chênh lệch lãi cho vay", gt: chenh != null ? `${so(chenh, 2)} điểm %` : "—", phu: "Lợi suất cho vay trừ chi phí vốn vay", tot: chenh != null ? chenh > 3 : null },
      { nhan: "Lãi chưa thực hiện / vốn chủ", gt: pt(chuaThucHien != null ? chuaThucHien * 100 : null, 2), phu: "Càng gần 0, lợi nhuận càng đã thành tiền", tot: chuaThucHien != null ? Math.abs(chuaThucHien) < 0.03 : null },
      { nhan: "Biên lợi nhuận ròng", gt: pt(bienRongNay), phu: "Lãi trên mỗi đồng doanh thu hoạt động", tot: null },
    ];
    chatLuong.duong = [
      { ten: "ROE và biên lợi nhuận ròng, 4 quý cuốn chiếu (%)", duong: [{ ten: "ROE", diem: chuoi(roeCua) }, { ten: "Biên ròng", diem: chuoi(tyLe("lnstMe", kDt)) }] },
      { ten: "Dư nợ cho vay / vốn chủ (%)", duong: [{ ten: "Cho vay / vốn chủ", diem: chuoi((i) => { const x = chia(v(i, "choVay"), v(i, "vonChu")); return x != null ? x * 100 : null; }) }] },
    ];
    chatLuong.ghiChu = "Phí môi giới và lãi cho vay ký quỹ là nguồn thu lặp lại; tự doanh lên xuống theo thị trường nên tỷ trọng tự doanh cao thì lợi nhuận kém ổn định.";
    tc(tcChatLuong, "Nguồn thu không dựa chủ yếu vào tự doanh", tyTrongTuDoanh != null ? tyTrongTuDoanh < 50 : null, `Tự doanh chiếm ${pt(tyTrongTuDoanh)} tổng lãi các mảng`);
    tc(tcChatLuong, "Mảng môi giới có lãi gộp", bienMoiGioi != null ? bienMoiGioi > 0 : null, `Biên gộp môi giới ${pt(bienMoiGioi)}`);
    tc(tcChatLuong, "Chênh lệch lãi cho vay trên 3 điểm %", chenh != null ? chenh > 3 : null, chenh != null ? `Chênh lệch ${so(chenh, 2)} điểm %` : "Chưa đủ số liệu");
    sucKhoe.push(
      { nhan: "Dư nợ cho vay / vốn chủ", gt: pt(kyQuy != null ? kyQuy * 100 : null), phu: "Trần quy định 200% vốn chủ", tot: kyQuy != null ? kyQuy < 1.5 : null },
      { nhan: "Dư địa cho vay thêm", gt: vonChu != null && choVay != null ? ty(vonChu * 2 - choVay) : "—", phu: `Đang cho vay ${ty(choVay)}`, tot: null },
      { nhan: "Hệ số thanh toán lãi vay", gt: lan(phuLai, 1), phu: "(Lợi nhuận trước thuế + lãi vay) / lãi vay đã trả", tot: phuLai != null ? phuLai > 2 : null },
      { nhan: "Tài sản / vốn chủ", gt: lan(donBay, 1), phu: `Nợ vay ${ty(vay)}`, tot: donBay != null ? donBay < 4 : null },
    );
    tc(tcSucKhoe, "Còn xa trần cho vay ký quỹ", kyQuy != null ? kyQuy < 1.5 : null, `Dư nợ cho vay bằng ${pt(kyQuy != null ? kyQuy * 100 : null)} vốn chủ, trần 200%`);
    tc(tcSucKhoe, "Lợi nhuận che được hơn 2 lần lãi vay", phuLai != null ? phuLai > 2 : null, `Hệ số thanh toán lãi vay ${lan(phuLai, 1)}`);
    tc(tcSucKhoe, "Đòn bẩy dưới 4 lần", donBay != null ? donBay < 4 : null, `Tài sản bằng ${lan(donBay, 1)} vốn chủ`);
  } else {
    const donBay = chia(v(L, "tongTaiSan"), vonChu);
    chatLuong.the = [
      { nhan: "ROE", gt: pt(roe), phu: `Bình quân 5 năm ${pt(roeTb)}`, tot: roe != null ? roe > ke : null },
      { nhan: "ROA", gt: pt(roa, 2), tot: null },
      { nhan: "Biên lợi nhuận ròng", gt: pt(bienRongNay), phu: `Trên ${tenDt.toLowerCase()}`, tot: null },
      { nhan: "Tài sản / vốn chủ", gt: lan(donBay, 1), tot: null },
    ];
    chatLuong.duong = [{ ten: "ROE và biên lợi nhuận ròng, 4 quý cuốn chiếu (%)", duong: [{ ten: "ROE", diem: chuoi(roeCua) }, { ten: "Biên ròng", diem: chuoi(tyLe("lnstMe", kDt)) }] }];
    chatLuong.ghiChu = "Bảo hiểm cần bộ chỉ tiêu riêng (tỷ lệ kết hợp, lợi suất đầu tư) mà Finlo chưa dựng; phần này chỉ có các chỉ tiêu chung.";
  }

  // ---- Tiêu chí định giá, tăng trưởng, cổ tức
  const { pe, pb } = ls.boi;
  const tcDinhGia: TieuChi[] = [];
  tc(tcDinhGia, "P/E thấp hơn trung vị 5 năm của chính mã", pe?.nay != null ? pe.nay < pe.tv : null, pe?.nay != null ? `P/E ${so(pe.nay)} so với trung vị ${so(pe.tv)}, rẻ hơn ${so(100 - (pe.vi ?? 0), 0)}% số phiên` : "Không tính được P/E (lỗ hoặc thiếu số liệu)");
  tc(tcDinhGia, "P/B thấp hơn trung vị 5 năm của chính mã", pb?.nay != null ? pb.nay < pb.tv : null, pb?.nay != null ? `P/B ${so(pb.nay, 2)} so với trung vị ${so(pb.tv, 2)}, rẻ hơn ${so(100 - (pb.vi ?? 0), 0)}% số phiên` : "Chưa đủ lịch sử");
  tc(tcDinhGia, "P/E thấp hơn trung vị ngành", pe?.nay != null && a.peNganh ? pe.nay < a.peNganh : null, a.peNganh ? `Trung vị ngành ${so(a.peNganh)} lần` : "Chưa có P/E ngành");
  const peg = pe?.nay != null && cagr.ln3 != null && cagr.ln3 > 0 ? pe.nay / cagr.ln3 : null;
  tc(tcDinhGia, "PEG dưới 1", peg != null ? peg < 1 : null, peg != null ? `P/E ${so(pe!.nay!)} / tăng trưởng lợi nhuận 3 năm ${pt(cagr.ln3)} = ${so(peg, 2)}` : "Cần lợi nhuận tăng trưởng dương 3 năm");

  const tcTangTruong: TieuChi[] = [];
  tc(tcTangTruong, `${tenDt} tăng trên 10%/năm trong 3 năm`, cagr.dt3 != null ? cagr.dt3 > 10 : null, `Tăng kép ${pt(cagr.dt3)}/năm`);
  tc(tcTangTruong, "Lợi nhuận tăng trên 10%/năm trong 3 năm", cagr.ln3 != null ? cagr.ln3 > 10 : null, `Tăng kép ${pt(cagr.ln3)}/năm`);
  const lnCungKy = soCungKy("lnstMe");
  tc(tcTangTruong, "Lợi nhuận 4 quý cao hơn cùng kỳ", lnCungKy != null ? lnCungKy > 0 : null, lnCungKy != null ? `${lnCungKy > 0 ? "+" : ""}${so(lnCungKy)}% so với 4 quý liền trước` : "Chưa đủ số liệu");
  const quyGan = tangQuy("lnstMe").slice(-4).filter((x) => x.gt != null);
  tc(tcTangTruong, "Ít nhất 3 trong 4 quý gần nhất lãi tăng so với cùng kỳ", quyGan.length === 4 ? quyGan.filter((x) => x.gt! > 0).length >= 3 : null, `${quyGan.filter((x) => x.gt! > 0).length}/${quyGan.length} quý tăng`);

  const tySuat = (coTuc / soCp / gia) * 100;
  const chiTraNay = ln != null && ln > 0 ? (coTuc / ln) * 100 : null;
  const soNamTra = [0, 4, 8, 12, 16].filter((k) => Math.abs(ttm0(L - k, "coTucDaTra") ?? 0) > 0).length;
  const tcCoTuc: TieuChi[] = [];
  tc(tcCoTuc, "Có trả cổ tức tiền mặt 4 quý gần nhất", coTuc > 0, coTuc > 0 ? `Đã chi ${ty(coTuc)}, tương đương ${so(coTuc / soCp, 0)} đồng/cổ phiếu` : "Không chi cổ tức tiền mặt");
  tc(tcCoTuc, "Tỷ suất cổ tức cao hơn lãi tiết kiệm", coTuc > 0 ? tySuat > rf : false, `Tỷ suất ${pt(tySuat)} so với lãi tiết kiệm 12 tháng ${pt(rf)}`);
  tc(tcCoTuc, "Chi trả dưới 80% lợi nhuận", chiTraNay != null ? chiTraNay < 80 : null, chiTraNay != null ? `Chi ${pt(chiTraNay, 0)} lợi nhuận 4 quý` : "Không tính được");
  tc(tcCoTuc, "Trả đều trong 5 năm", soNamTra >= 4, `Có chi cổ tức tiền mặt ${soNamTra}/5 năm gần nhất`);

  const truCot: TruCot[] = [
    { ten: "Định giá", ds: tcDinhGia },
    { ten: "Chất lượng", ds: tcChatLuong },
    { ten: "Sức khoẻ tài chính", ds: tcSucKhoe },
    { ten: "Tăng trưởng", ds: tcTangTruong },
    { ten: "Cổ tức", ds: tcCoTuc },
  ].filter((t) => t.ds.length > 0);

  return {
    loai,
    taiChinh,
    tenDt,
    kyGanNhat: Q[L] ? `${nhanQuy(Q[L])}${Q[L].congBo ? `, công bố ${Q[L].congBo!.slice(8, 10)}/${Q[L].congBo!.slice(5, 7)}/${Q[L].congBo!.slice(0, 4)}` : ""}` : "",
    dauVao,
    giaDinh,
    ke,
    wacc: waccNay,
    duongPe: ls.duongPe,
    duongPb: ls.duongPb,
    coBan: { dt, ln, eps, bvps, roe, roeTb, roa, vonHoa, ebitda, noRong, fcffNam, thue: thue * 100, chiPhiNo, tySuat, chiTraNay, beVung, peg },
    cagr,
    tangQuyDt: tangQuy(kDt),
    tangQuyLn: tangQuy("lnstMe"),
    chatLuong,
    sucKhoe,
    fScore,
    ruiRo: ruiRoGia(nen, vni, beta),
    truCot,
  };
}

export type PhanTichSau = ReturnType<typeof phanTichSau>;
