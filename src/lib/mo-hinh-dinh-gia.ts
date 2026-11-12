// Các mô hình định giá cổ phiếu: chiết khấu dòng tiền (DCF), thu nhập thặng dư (RI), chiết khấu cổ tức (DDM)
// và bội số so sánh. Hàm thuần, chạy được cả ở server lẫn trình duyệt để người dùng tự đổi giả định.
// Đơn vị: giá và số trên mỗi cổ phiếu theo đồng; tỷ lệ trong GiaDinh theo phần trăm.

export type DaiBoi = { p25: number; tv: number; p75: number; nay: number | null; vi: number | null; soPhien: number };

export type DauVaoDinhGia = {
  ma: string;
  gia: number;
  soCp: number;
  taiChinh: boolean; // ngân hàng, chứng khoán, bảo hiểm: không dùng DCF, dùng thu nhập thặng dư
  eps: number | null; // 4 quý gần nhất
  epsChuanHoa: number | null; // ngành chu kỳ: EPS trên biên lợi nhuận trung vị (Mofi tính)
  bvps: number | null;
  coTucCp: number; // cổ tức tiền mặt 4 quý / cổ phiếu
  roe: number | null; // % bình quân các năm gần đây, dùng làm điểm xuất phát
  tyLeChiTra: number; // 0..1
  fcff: number | null; // dòng tiền tự do cho doanh nghiệp, đồng/năm (bình quân 3 năm)
  ebitda: number | null; // 4 quý
  noRong: number; // nợ vay trừ tiền và đầu tư ngắn hạn, đồng
  loiIchThieuSo: number;
  tyTrongNo: number; // nợ vay / (nợ vay + vốn hoá), 0..1
  chiPhiNo: number; // % trước thuế
  thue: number; // 0..1
  boi: { pe: DaiBoi | null; pb: DaiBoi | null; evEbitda: DaiBoi | null };
  peNganh: number | null;
  tenNganh: string | null;
};

export type GiaDinh = {
  rf: number; // lãi suất phi rủi ro, %
  erp: number; // phần bù rủi ro vốn cổ phần, %
  beta: number;
  g1: number; // tăng trưởng 5 năm đầu, %
  gT: number; // tăng trưởng dài hạn, %
};

export const SO_NAM = 10;
const NGUONG_CHI_TRA = 0.3;
const DAI_QUA_RONG = 3; // cận trên/cận dưới của dải bội số lịch sử

export const chiPhiVonChu = (gd: GiaDinh) => gd.rf + gd.beta * gd.erp;

export function wacc(dv: DauVaoDinhGia, gd: GiaDinh) {
  const ke = chiPhiVonChu(gd);
  return ke * (1 - dv.tyTrongNo) + dv.chiPhiNo * (1 - dv.thue) * dv.tyTrongNo;
}

// Tăng trưởng từng năm: 5 năm đầu giữ g1, 5 năm sau giảm đều về gT
const tangNam = (t: number, g1: number, gT: number) => (t <= 5 ? g1 : g1 + ((gT - g1) * (t - 5)) / (SO_NAM - 5));

export type KetQuaDcf = { gia: number; ev: number; pvGiaiDoan: number; pvCuoi: number; r: number; dong: { nam: number; g: number; fcf: number; pv: number }[] };

// DCF hai giai đoạn trên dòng tiền tự do cho doanh nghiệp; rLech: cộng thêm vào WACC (điểm %) để thử độ nhạy
export function dcf(dv: DauVaoDinhGia, gd: GiaDinh, rLech = 0, gTLech = 0): KetQuaDcf | null {
  if (dv.taiChinh || dv.fcff == null || dv.fcff <= 0) return null;
  const r = (wacc(dv, gd) + rLech) / 100;
  const gT = (gd.gT + gTLech) / 100;
  if (r - gT < 0.01) return null;
  let fcf = dv.fcff;
  let pvGiaiDoan = 0;
  const dong: KetQuaDcf["dong"] = [];
  for (let t = 1; t <= SO_NAM; t++) {
    const g = tangNam(t, gd.g1, gd.gT + gTLech) / 100;
    fcf *= 1 + g;
    const pv = fcf / (1 + r) ** t;
    pvGiaiDoan += pv;
    dong.push({ nam: t, g: g * 100, fcf, pv });
  }
  const pvCuoi = (fcf * (1 + gT)) / (r - gT) / (1 + r) ** SO_NAM;
  const ev = pvGiaiDoan + pvCuoi;
  return { gia: (ev - dv.noRong - dv.loiIchThieuSo) / dv.soCp, ev, pvGiaiDoan, pvCuoi, r: r * 100, dong };
}

export type KetQuaRi = { gia: number; pvThangDu: number; ke: number; roeDau: number; dong: { nam: number; roe: number; bv: number; ri: number; pv: number }[] };

// Thu nhập thặng dư: giá trị = sổ sách + phần lãi vượt chi phí vốn chủ, ROE lùi dần về chi phí vốn trong 10 năm
// (lợi thế cạnh tranh không kéo dài mãi nên không cộng giá trị cuối kỳ)
export function thuNhapThangDu(dv: DauVaoDinhGia, gd: GiaDinh, keLech = 0): KetQuaRi | null {
  if (dv.bvps == null || dv.bvps <= 0 || dv.roe == null) return null;
  const ke = (chiPhiVonChu(gd) + keLech) / 100;
  const roeDau = dv.roe / 100;
  let bv = dv.bvps;
  let pvThangDu = 0;
  const dong: KetQuaRi["dong"] = [];
  for (let t = 1; t <= SO_NAM; t++) {
    const roe = roeDau + ((ke - roeDau) * t) / SO_NAM;
    const ri = (roe - ke) * bv;
    const pv = ri / (1 + ke) ** t;
    pvThangDu += pv;
    dong.push({ nam: t, roe: roe * 100, bv, ri, pv });
    bv *= 1 + roe * (1 - dv.tyLeChiTra);
  }
  return { gia: dv.bvps + pvThangDu, pvThangDu, ke: ke * 100, roeDau: dv.roe, dong };
}

// Chiết khấu cổ tức hai giai đoạn; tăng trưởng cổ tức không vượt mức công ty tự tài trợ được (ROE × phần giữ lại)
export function ddm(dv: DauVaoDinhGia, gd: GiaDinh, keLech = 0) {
  if (dv.coTucCp <= 0) return null;
  const ke = (chiPhiVonChu(gd) + keLech) / 100;
  const gT = gd.gT / 100;
  if (ke - gT < 0.01) return null;
  const beVung = dv.roe != null ? Math.max(0, dv.roe * (1 - dv.tyLeChiTra)) : gd.g1;
  const g = Math.min(gd.g1, beVung) / 100;
  let d = dv.coTucCp;
  let gia = 0;
  for (let t = 1; t <= 5; t++) {
    d *= 1 + g;
    gia += d / (1 + ke) ** t;
  }
  gia += (d * (1 + gT)) / (ke - gT) / (1 + ke) ** 5;
  return { gia, g: g * 100, ke: ke * 100 };
}

// P/B hợp lý theo lý thuyết: (ROE − g) / (Ke − g)
export function pbHopLy(dv: DauVaoDinhGia, gd: GiaDinh) {
  const ke = chiPhiVonChu(gd);
  if (dv.roe == null || ke - gd.gT < 1) return null;
  return Math.max(0, (dv.roe - gd.gT) / (ke - gd.gT));
}

// DCF ngược: thị trường đang ngầm kỳ vọng tăng trưởng 5 năm đầu bao nhiêu để ra đúng giá hiện tại
export function tangTruongNgam(dv: DauVaoDinhGia, gd: GiaDinh) {
  if (!dcf(dv, gd)) return null;
  let thap = -30;
  let cao = 60;
  const tai = (g: number) => dcf(dv, { ...gd, g1: g })?.gia ?? -Infinity;
  if (tai(thap) > dv.gia) return { g: thap, ngoai: "thap" as const };
  if (tai(cao) < dv.gia) return { g: cao, ngoai: "cao" as const };
  for (let i = 0; i < 40; i++) {
    const giua = (thap + cao) / 2;
    if (tai(giua) < dv.gia) thap = giua;
    else cao = giua;
  }
  return { g: (thap + cao) / 2, ngoai: null };
}

export type PhuongPhap = { ma: string; ten: string; thap: number; giua: number; cao: number; trongSo: number; ghiChu: string };

const TRONG_SO: Record<string, [number, number]> = {
  // [doanh nghiệp thường, tài chính]
  dcf: [30, 0],
  ri: [0, 25],
  "pe-ls": [25, 20],
  "pe-nganh": [10, 10],
  "pb-ls": [10, 30],
  ev: [15, 0],
  ddm: [10, 15],
};

export function cacPhuongPhap(dv: DauVaoDinhGia, gd: GiaDinh): PhuongPhap[] {
  const ds: PhuongPhap[] = [];
  const them = (ma: string, ten: string, thap: number, giua: number, cao: number, ghiChu: string) => {
    if (![thap, giua, cao].every((x) => Number.isFinite(x)) || giua <= 0) return;
    const [a, b] = [Math.min(thap, cao), Math.max(thap, cao)];
    ds.push({ ma, ten, thap: Math.max(0, a), giua, cao: b, trongSo: TRONG_SO[ma]?.[dv.taiChinh ? 1 : 0] ?? 0, ghiChu });
  };
  const so = (x: number, le = 1) => x.toLocaleString("vi-VN", { maximumFractionDigits: le });

  const d = dcf(dv, gd);
  if (d) them("dcf", "Chiết khấu dòng tiền (DCF)", dcf(dv, gd, 1)?.gia ?? d.gia, d.gia, dcf(dv, gd, -1)?.gia ?? d.gia, `WACC ${so(d.r)}% ± 1 điểm, tăng trưởng ${so(gd.g1)}% rồi về ${so(gd.gT)}%`);
  const ri = thuNhapThangDu(dv, gd);
  if (ri && dv.taiChinh) them("ri", "Thu nhập thặng dư (RI)", thuNhapThangDu(dv, gd, 1)?.gia ?? ri.gia, ri.gia, thuNhapThangDu(dv, gd, -1)?.gia ?? ri.gia, `ROE ${so(ri.roeDau)}% lùi dần về chi phí vốn ${so(ri.ke)}% ± 1 điểm`);

  const eps = dv.epsChuanHoa ?? dv.eps;
  const nhanEps = dv.epsChuanHoa ? "EPS chuẩn hoá theo chu kỳ" : "EPS 4 quý";
  if (eps != null && eps > 0) {
    const pe = dv.boi.pe;
    if (pe) them("pe-ls", "P/E theo lịch sử của chính mã", eps * pe.p25, eps * pe.tv, eps * pe.p75, `${nhanEps} × P/E ${so(pe.p25)}–${so(pe.p75)} (trung vị ${so(pe.tv)})`);
    if (dv.peNganh) them("pe-nganh", `P/E trung vị ngành${dv.tenNganh ? ` ${dv.tenNganh}` : ""}`, eps * dv.peNganh * 0.85, eps * dv.peNganh, eps * dv.peNganh * 1.15, `${nhanEps} × ${so(dv.peNganh)} lần, ± 15%`);
  }
  if (dv.bvps != null && dv.bvps > 0 && dv.boi.pb) {
    const pb = dv.boi.pb;
    them("pb-ls", "P/B theo lịch sử của chính mã", dv.bvps * pb.p25, dv.bvps * pb.tv, dv.bvps * pb.p75, `Giá trị sổ sách × P/B ${so(pb.p25, 2)}–${so(pb.p75, 2)} (trung vị ${so(pb.tv, 2)})`);
  }
  if (!dv.taiChinh && dv.ebitda != null && dv.ebitda > 0 && dv.boi.evEbitda) {
    const b = dv.boi.evEbitda;
    const gia = (boi: number) => (dv.ebitda! * boi - dv.noRong - dv.loiIchThieuSo) / dv.soCp;
    them("ev", "EV/EBITDA theo lịch sử", gia(b.p25), gia(b.tv), gia(b.p75), `EBITDA 4 quý × ${so(b.p25)}–${so(b.p75)} lần, trừ nợ ròng`);
  }
  // Dải lịch sử quá rộng thường do vốn chủ hoặc số cổ phiếu đổi mạnh (tái cấu trúc, phát hành lớn, mới niêm yết):
  // vẫn bày để tham khảo nhưng không tính vào tổng hợp
  for (const p of ds) {
    const b = p.ma === "pe-ls" ? dv.boi.pe : p.ma === "pb-ls" ? dv.boi.pb : p.ma === "ev" ? dv.boi.evEbitda : null;
    if (b && b.p25 > 0 && b.p75 / b.p25 > DAI_QUA_RONG) {
      p.trongSo = 0;
      p.ghiChu += `; chỉ tham khảo vì dải lịch sử quá rộng, cận trên gấp ${so(b.p75 / b.p25)} lần cận dưới`;
    }
  }
  const dd = ddm(dv, gd);
  if (dd) {
    them("ddm", "Chiết khấu cổ tức (DDM)", ddm(dv, gd, 1)?.gia ?? dd.gia, dd.gia, ddm(dv, gd, -1)?.gia ?? dd.gia, `Cổ tức tăng ${so(dd.g)}% trong 5 năm rồi ${so(gd.gT)}%, chiết khấu ${so(dd.ke)}% ± 1 điểm`);
    // Công ty giữ lại phần lớn lợi nhuận thì cổ tức không phản ánh giá trị: chỉ bày để tham khảo, không tính vào tổng hợp
    const p = ds[ds.length - 1];
    if (p?.ma === "ddm" && dv.tyLeChiTra < NGUONG_CHI_TRA) {
      p.trongSo = 0;
      p.ghiChu += `; chỉ tham khảo vì công ty mới chia ${so(dv.tyLeChiTra * 100, 0)}% lợi nhuận`;
    }
  }
  return ds;
}

// Giá trị tổng hợp: bình quân theo trọng số của các phương pháp chạy được
export function tongHop(ds: PhuongPhap[]) {
  const co = ds.filter((p) => p.trongSo > 0);
  const tong = co.reduce((s, p) => s + p.trongSo, 0);
  if (!tong) return null;
  const tb = (lay: (p: PhuongPhap) => number) => co.reduce((s, p) => s + lay(p) * p.trongSo, 0) / tong;
  return { thap: tb((p) => p.thap), giua: tb((p) => p.giua), cao: tb((p) => p.cao), tong };
}
