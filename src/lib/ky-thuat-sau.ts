// Phần kỹ thuật chuyên sâu: xu hướng nhiều khung, sức mạnh so với VN-Index, hỗ trợ kháng cự, khối lượng theo vùng giá,
// Fibonacci thoái lui và mức dừng lỗ theo ATR. Tính trên nến ngày, quy tắc cố định.

import { atr, khoiLuongTheoGia, sma, type NenCB } from "@/lib/chi-bao";

const cuoi = <T,>(ds: T[]) => ds[ds.length - 1];
const ngay = (t: number) => Math.floor((t + 7 * 3600) / 86400);

export type KhungXuHuong = { ten: string; duong: string; giaTri: number | null; tren: boolean | null; doc: number | null; ketLuan: "Tăng" | "Giảm" | "Đi ngang" | "Chưa đủ dữ liệu" };
export type MucGia = { gia: number; cham: number; cach: number };

// Một khung: giá so với đường trung bình và đường đó đang dốc lên hay xuống (so với 1/4 chu kỳ trước)
function khung(ten: string, dong: number[], n: number): KhungXuHuong {
  const ma = sma(dong, n);
  const nay = cuoi(ma);
  const truoc = ma[ma.length - 1 - Math.max(3, Math.round(n / 4))] ?? null;
  if (nay == null || truoc == null) return { ten, duong: `MA${n}`, giaTri: nay ?? null, tren: null, doc: null, ketLuan: "Chưa đủ dữ liệu" };
  const gia = cuoi(dong);
  const doc = (nay / truoc - 1) * 100;
  const tren = gia > nay;
  const ketLuan = tren && doc > 0.3 ? "Tăng" : !tren && doc < -0.3 ? "Giảm" : "Đi ngang";
  return { ten, duong: `MA${n}`, giaTri: nay, tren, doc, ketLuan };
}

// Đỉnh/đáy cục bộ: cao (thấp) hơn 5 phiên mỗi bên. Gom các mức cách nhau dưới 1,5% thành một vùng, đếm số lần giá quay đầu ở đó.
function hoTroKhangCu(nen: NenCB[], gia: number) {
  const ds = nen.slice(-250);
  const K = 5;
  const moc: number[] = [];
  for (let i = K; i < ds.length - K; i++) {
    const cua = ds.slice(i - K, i + K + 1);
    if (ds[i].high === Math.max(...cua.map((x) => x.high))) moc.push(ds[i].high);
    if (ds[i].low === Math.min(...cua.map((x) => x.low))) moc.push(ds[i].low);
  }
  moc.sort((a, b) => a - b);
  const vung: { tong: number; cham: number }[] = [];
  for (const m of moc) {
    const v = cuoi(vung);
    if (v && m / (v.tong / v.cham) - 1 < 0.015) {
      v.tong += m;
      v.cham++;
    } else vung.push({ tong: m, cham: 1 });
  }
  const muc: MucGia[] = vung.map((v) => ({ gia: v.tong / v.cham, cham: v.cham, cach: (v.tong / v.cham / gia - 1) * 100 }));
  return {
    hoTro: muc.filter((m) => m.gia < gia * 0.995).sort((a, b) => b.gia - a.gia).slice(0, 3),
    khangCu: muc.filter((m) => m.gia > gia * 1.005).sort((a, b) => a.gia - b.gia).slice(0, 3),
  };
}

const TY_LE_FIBO = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export function kyThuatSau(nen: NenCB[], vni: { time: number; close: number }[]) {
  const dong = nen.map((x) => x.close);
  const gia = cuoi(dong);

  const xuHuong = [khung("Ngắn hạn (1 tháng)", dong, 20), khung("Trung hạn (1 quý)", dong, 50), khung("Dài hạn (1 năm)", dong, 200)];
  const [m20, m50, m200] = xuHuong.map((k) => k.giaTri);
  const xepHang = m20 == null || m50 == null || m200 == null ? null : m20 > m50 && m50 > m200 ? "tang" : m20 < m50 && m50 < m200 ? "giam" : "lan";

  // ---- Sức mạnh so với VN-Index
  const chiSo = new Map(vni.map((c) => [ngay(c.time), c.close]));
  const cap = nen.filter((c) => chiSo.has(ngay(c.time))).map((c) => ({ time: c.time, ma: c.close, cs: chiSo.get(ngay(c.time))! }));
  const soSanh = [
    { ten: "1 tháng", phien: 21 },
    { ten: "3 tháng", phien: 63 },
    { ten: "6 tháng", phien: 126 },
    { ten: "1 năm", phien: 252 },
  ].map(({ ten, phien }) => {
    if (cap.length <= phien) return { ten, ma: null, cs: null, lech: null };
    const a = cuoi(cap);
    const b = cap[cap.length - 1 - phien];
    const ma = (a.ma / b.ma - 1) * 100;
    const cs = (a.cs / b.cs - 1) * 100;
    return { ten, ma, cs, lech: ma - cs };
  });
  // Đường sức mạnh tương đối: giá chia chỉ số, quy về 100 ở đầu kỳ 1 năm. Đi lên là mã mạnh hơn thị trường.
  const nam = cap.slice(-252);
  const goc = nam.length ? nam[0].ma / nam[0].cs : 1;
  const duongRs = nam.map((c) => ({ time: c.time, value: (c.ma / c.cs / goc) * 100 }));
  const rsMa = sma(duongRs.map((x) => x.value), 50);
  const duongRsTb = duongRs.flatMap((x, i) => (rsMa[i] != null ? [{ time: x.time, value: rsMa[i]! }] : []));

  // ---- Hỗ trợ, kháng cự và khối lượng theo vùng giá (6 tháng)
  const muc = hoTroKhangCu(nen, gia);
  const o = khoiLuongTheoGia(nen, 120, 20);
  const tongKl = o.reduce((s, x) => s + x.kl, 0);
  const dinhKl = Math.max(1, ...o.map((x) => x.kl));
  const iPoc = o.findIndex((x) => x.kl === dinhKl);
  // Vùng giá trị: mở rộng từ ô nhiều khối lượng nhất tới khi gom đủ 70% khối lượng
  let tren = iPoc;
  let duoi = iPoc;
  let gom = o[iPoc]?.kl ?? 0;
  while (tongKl > 0 && gom < tongKl * 0.7 && (tren > 0 || duoi < o.length - 1)) {
    const a = tren > 0 ? o[tren - 1].kl : -1;
    const b = duoi < o.length - 1 ? o[duoi + 1].kl : -1;
    if (a >= b) gom += o[--tren].kl;
    else gom += o[++duoi].kl;
  }
  const vungKl = {
    o: o.map((x, i) => ({ ...x, pt: (x.kl / dinhKl) * 100, trongVung: i >= tren && i <= duoi, poc: i === iPoc, coGia: gia >= x.tu && gia < x.den })),
    poc: o[iPoc] ? (o[iPoc].tu + o[iPoc].den) / 2 : null,
    vungTu: o[duoi]?.tu ?? null,
    vungDen: o[tren]?.den ?? null,
  };

  // ---- Fibonacci thoái lui của nhịp lớn nhất trong 6 tháng
  const ky = nen.slice(-120);
  const cao = Math.max(...ky.map((x) => x.high));
  const thap = Math.min(...ky.map((x) => x.low));
  const iCao = ky.findIndex((x) => x.high === cao);
  const iThap = ky.findIndex((x) => x.low === thap);
  const nhipTang = iThap < iCao; // đáy trước, đỉnh sau: đang hồi về sau nhịp tăng
  const fibo = TY_LE_FIBO.map((t) => {
    const g = nhipTang ? cao - (cao - thap) * t : thap + (cao - thap) * t;
    return { tyLe: t * 100, gia: g, cach: (g / gia - 1) * 100 };
  });
  const daHoi = cao > thap ? ((nhipTang ? cao - gia : gia - thap) / (cao - thap)) * 100 : null;

  // ---- Dừng lỗ theo biến động
  const a = cuoi(atr(nen, 14));
  const dungLo = a != null ? gia - 2 * a : null;
  const hoTroGan = muc.hoTro[0]?.gia ?? null;
  const khangCuGan = muc.khangCu[0]?.gia ?? null;
  const ruiRo = dungLo != null ? gia - dungLo : null;
  const loiNhuan = khangCuGan != null ? khangCuGan - gia : null;

  return {
    gia,
    xuHuong,
    xepHang,
    soSanh,
    duongRs,
    duongRsTb,
    muc,
    vungKl,
    fibo: { nhipTang, cao, thap, muc: fibo, daHoi },
    quanTri: { atr: a ?? null, atrPt: a != null ? (a / gia) * 100 : null, dungLo, hoTroGan, khangCuGan, tyLe: ruiRo && loiNhuan != null && ruiRo > 0 ? loiNhuan / ruiRo : null },
  };
}

export type KyThuatSau = ReturnType<typeof kyThuatSau>;
