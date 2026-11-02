// Phần bổ sung cho tab kỹ thuật: ADX, mẫu hình nến, điểm xoay nhiều phương pháp theo ngày/tuần/tháng,
// và thống kê mùa vụ (lợi nhuận theo tháng trong năm). Tính trên nến ngày đã điều chỉnh của Mofi.

import type { NenCB } from "@/lib/chi-bao";

// Mốc thời gian nến là nửa đêm giờ Việt Nam: cộng 7 giờ để lấy ngày theo UTC
const ngayVN = (giay: number) => new Date((giay + 7 * 3600) * 1000);

// ---- ADX (14) theo Wilder: độ mạnh xu hướng, +DI/−DI cho hướng ----
export function adx(nen: NenCB[], n = 14) {
  const tr: number[] = [];
  const pdm: number[] = [];
  const mdm: number[] = [];
  for (let i = 1; i < nen.length; i++) {
    const a = nen[i];
    const b = nen[i - 1];
    const len = a.high - b.high;
    const xuong = b.low - a.low;
    tr.push(Math.max(a.high - a.low, Math.abs(a.high - b.close), Math.abs(a.low - b.close)));
    pdm.push(len > xuong && len > 0 ? len : 0);
    mdm.push(xuong > len && xuong > 0 ? xuong : 0);
  }
  if (tr.length < 2 * n) return null;
  let sTr = tr.slice(0, n).reduce((s, x) => s + x, 0);
  let sP = pdm.slice(0, n).reduce((s, x) => s + x, 0);
  let sM = mdm.slice(0, n).reduce((s, x) => s + x, 0);
  const dx: number[] = [];
  let pdi = 0;
  let mdi = 0;
  for (let i = n; i <= tr.length; i++) {
    if (i > n) {
      sTr = sTr - sTr / n + tr[i - 1];
      sP = sP - sP / n + pdm[i - 1];
      sM = sM - sM / n + mdm[i - 1];
    }
    pdi = sTr ? (sP / sTr) * 100 : 0;
    mdi = sTr ? (sM / sTr) * 100 : 0;
    dx.push(pdi + mdi ? (Math.abs(pdi - mdi) / (pdi + mdi)) * 100 : 0);
  }
  let gt = dx.slice(0, n).reduce((s, x) => s + x, 0) / n;
  for (let i = n; i < dx.length; i++) gt = (gt * (n - 1) + dx[i]) / n;
  return { adx: gt, pdi, mdi };
}

// ---- Mẫu hình nến ----
export type MauHinh = { time: number; ten: string; huong: "tang" | "giam" | "trung"; moTa: string };

export function mauHinhNen(nen: NenCB[], soPhien = 60): MauHinh[] {
  const kq: MauHinh[] = [];
  const bat = Math.max(3, nen.length - soPhien);
  for (let i = bat; i < nen.length; i++) {
    const c = nen[i];
    const b = nen[i - 1];
    const a = nen[i - 2];
    const than = (x: NenCB) => Math.abs(x.close - x.open);
    const bien = (x: NenCB) => x.high - x.low;
    const tang = (x: NenCB) => x.close > x.open;
    const giam = (x: NenCB) => x.close < x.open;
    // Xu hướng ngắn trước nến: so giá đóng cửa với 5 phiên trước đó
    const truoc = nen[Math.max(0, i - 6)].close;
    const dangGiam = b.close < truoc;
    const dangTang = b.close > truoc;
    // Thân trung bình 10 phiên để phân biệt nến lớn / nhỏ
    const tb = nen.slice(Math.max(0, i - 10), i).reduce((s, x) => s + than(x), 0) / Math.min(10, i) || 1;
    const bongTren = c.high - Math.max(c.open, c.close);
    const bongDuoi = Math.min(c.open, c.close) - c.low;
    const them = (ten: string, huong: MauHinh["huong"], moTa: string) => kq.push({ time: c.time, ten, huong, moTa });

    if (giam(a) && than(a) > tb && than(b) < tb * 0.4 && tang(c) && than(c) > tb && c.close > (a.open + a.close) / 2 && dangGiam)
      them("Sao mai", "tang", "Nến giảm dài, nến thân nhỏ, rồi nến tăng dài đóng cửa quá nửa thân nến đầu");
    else if (tang(a) && than(a) > tb && than(b) < tb * 0.4 && giam(c) && than(c) > tb && c.close < (a.open + a.close) / 2 && dangTang)
      them("Sao hôm", "giam", "Nến tăng dài, nến thân nhỏ, rồi nến giảm dài đóng cửa dưới nửa thân nến đầu");
    else if (tang(a) && tang(b) && tang(c) && b.close > a.close && c.close > b.close && than(a) > tb * 0.6 && than(b) > tb * 0.6 && than(c) > tb * 0.6 && b.open > a.open && c.open > b.open)
      them("Ba chàng lính trắng", "tang", "Ba nến tăng liên tiếp, mỗi nến mở và đóng cao hơn nến trước");
    else if (giam(a) && giam(b) && giam(c) && b.close < a.close && c.close < b.close && than(a) > tb * 0.6 && than(b) > tb * 0.6 && than(c) > tb * 0.6 && b.open < a.open && c.open < b.open)
      them("Ba con quạ đen", "giam", "Ba nến giảm liên tiếp, mỗi nến mở và đóng thấp hơn nến trước");

    if (giam(b) && tang(c) && c.close >= b.open && c.open <= b.close && than(c) > than(b) && dangGiam)
      them("Nhấn chìm tăng", "tang", "Thân nến tăng bao trọn thân nến giảm phiên trước sau nhịp giảm");
    else if (tang(b) && giam(c) && c.open >= b.close && c.close <= b.open && than(c) > than(b) && dangTang)
      them("Nhấn chìm giảm", "giam", "Thân nến giảm bao trọn thân nến tăng phiên trước sau nhịp tăng");
    else if (giam(b) && than(b) > tb && tang(c) && c.open > b.close && c.close < b.open && than(c) < than(b) * 0.5 && dangGiam)
      them("Harami tăng", "tang", "Nến tăng nhỏ nằm gọn trong thân nến giảm lớn phiên trước");
    else if (tang(b) && than(b) > tb && giam(c) && c.open < b.close && c.close > b.open && than(c) < than(b) * 0.5 && dangTang)
      them("Harami giảm", "giam", "Nến giảm nhỏ nằm gọn trong thân nến tăng lớn phiên trước");
    else if (giam(b) && than(b) > tb && tang(c) && c.open < b.low && c.close > (b.open + b.close) / 2 && c.close < b.open)
      them("Đường xuyên", "tang", "Mở dưới đáy phiên trước rồi đóng cửa quá nửa thân nến giảm");
    else if (tang(b) && than(b) > tb && giam(c) && c.open > b.high && c.close < (b.open + b.close) / 2 && c.close > b.open)
      them("Mây đen che phủ", "giam", "Mở trên đỉnh phiên trước rồi đóng cửa dưới nửa thân nến tăng");

    if (bien(c) > 0 && than(c) <= bien(c) * 0.1 && bien(c) > tb * 0.5) {
      if (bongDuoi > bien(c) * 0.65) them("Doji chuồn chuồn", dangGiam ? "tang" : "trung", "Mở và đóng sát đỉnh phiên, bóng dưới dài");
      else if (bongTren > bien(c) * 0.65) them("Doji bia mộ", dangTang ? "giam" : "trung", "Mở và đóng sát đáy phiên, bóng trên dài");
      else them("Doji", "trung", "Giá mở và đóng gần như bằng nhau: phe mua và bán cân bằng");
    } else if (than(c) > 0 && bongDuoi >= than(c) * 2 && bongTren <= than(c) * 0.5) {
      if (dangGiam) them("Búa", "tang", "Bóng dưới dài gấp đôi thân sau nhịp giảm: lực mua đỡ giá");
      else if (dangTang) them("Người treo cổ", "giam", "Bóng dưới dài sau nhịp tăng: cảnh báo áp lực bán");
    } else if (than(c) > 0 && bongTren >= than(c) * 2 && bongDuoi <= than(c) * 0.5) {
      if (dangTang) them("Sao băng", "giam", "Bóng trên dài gấp đôi thân sau nhịp tăng: giá bị đạp xuống");
      else if (dangGiam) them("Búa ngược", "tang", "Bóng trên dài sau nhịp giảm: lực mua bắt đầu thử");
    } else if (than(c) > tb * 2 && bongTren < than(c) * 0.05 && bongDuoi < than(c) * 0.05)
      them(tang(c) ? "Marubozu tăng" : "Marubozu giảm", tang(c) ? "tang" : "giam", "Nến thân dài gần như không có bóng");
  }
  return kq.sort((x, y) => y.time - x.time);
}

// ---- Điểm xoay theo 4 phương pháp ----
export type MucPivot = { r3: number; r2: number; r1: number; p: number; s1: number; s2: number; s3: number };
export type PhuongPhap = "Cổ điển" | "Fibonacci" | "Camarilla" | "Woodie";

function tinhPivot(h: number, l: number, c: number): Record<PhuongPhap, MucPivot> {
  const r = h - l;
  const p = (h + l + c) / 3;
  const w = (h + l + 2 * c) / 4;
  return {
    "Cổ điển": { r3: h + 2 * (p - l), r2: p + r, r1: 2 * p - l, p, s1: 2 * p - h, s2: p - r, s3: l - 2 * (h - p) },
    Fibonacci: { r3: p + r, r2: p + 0.618 * r, r1: p + 0.382 * r, p, s1: p - 0.382 * r, s2: p - 0.618 * r, s3: p - r },
    Camarilla: {
      r3: c + (r * 1.1) / 4,
      r2: c + (r * 1.1) / 6,
      r1: c + (r * 1.1) / 12,
      p,
      s1: c - (r * 1.1) / 12,
      s2: c - (r * 1.1) / 6,
      s3: c - (r * 1.1) / 4,
    },
    Woodie: { r3: h + 2 * (w - l), r2: w + r, r1: 2 * w - l, p: w, s1: 2 * w - h, s2: w - r, s3: l - 2 * (h - w) },
  };
}

// Khung ngày dùng phiên gần nhất; tuần/tháng dùng kỳ đã kết thúc gần nhất (tuần trước, tháng trước).
// homNay (giây): kỳ của phiên cuối khác kỳ hôm nay thì kỳ đó đã kết thúc và được dùng luôn.
export function diemXoay(nen: NenCB[], homNay?: number) {
  const khoaTuan = (giay: number) => {
    const d = ngayVN(giay);
    const thu = (d.getUTCDay() + 6) % 7; // thứ Hai = 0
    return Math.floor((d.getTime() - thu * 86400_000) / 86400_000);
  };
  const khoaThang = (giay: number) => {
    const d = ngayVN(giay);
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
  };
  const kyTruoc = (khoa: (g: number) => number) => {
    const n = nen.length;
    const nay = khoa(nen[n - 1].time);
    let j = n - 1;
    if (homNay == null || khoa(homNay) === nay) while (j >= 0 && khoa(nen[j].time) === nay) j--;
    if (j < 0) return null;
    const truoc = khoa(nen[j].time);
    let i = j;
    while (i > 0 && khoa(nen[i - 1].time) === truoc) i--;
    return nen.slice(i, j + 1);
  };
  const tuNen = (ds: NenCB[] | null) =>
    ds?.length
      ? {
          tu: ds[0].time,
          den: ds[ds.length - 1].time,
          muc: tinhPivot(Math.max(...ds.map((x) => x.high)), Math.min(...ds.map((x) => x.low)), ds[ds.length - 1].close),
        }
      : null;
  return {
    ngay: tuNen(nen.slice(-1)),
    tuan: tuNen(kyTruoc(khoaTuan)),
    thang: tuNen(kyTruoc(khoaThang)),
  };
}

export type DiemXoay = ReturnType<typeof diemXoay>;

// ---- Mùa vụ: lợi nhuận từng tháng dương lịch qua các năm ----
export type ThangMuaVu = { thang: number; tb: number | null; tyLeTang: number | null; soNam: number };

export function muaVu(nen: NenCB[], soNam = 10) {
  // Giá đóng cửa cuối mỗi tháng
  const cuoiThang = new Map<number, number>();
  for (const x of nen) {
    const d = ngayVN(x.time);
    cuoiThang.set(d.getUTCFullYear() * 12 + d.getUTCMonth(), x.close);
  }
  const khoa = [...cuoiThang.keys()].sort((a, b) => a - b);
  const thangNay = khoa[khoa.length - 1];
  const tu = thangNay - soNam * 12;
  // Bảng năm × tháng; tháng của phiên gần nhất có thể chưa kết thúc nên hiện trong bảng nhưng không tính bình quân
  const bang = new Map<number, (number | null)[]>();
  for (let i = 1; i < khoa.length; i++) {
    const k = khoa[i];
    if (k < tu || khoa[i - 1] !== k - 1) continue;
    const nam = Math.floor(k / 12);
    if (!bang.has(nam)) bang.set(nam, Array(12).fill(null));
    bang.get(nam)![k % 12] = (cuoiThang.get(k)! / cuoiThang.get(k - 1)! - 1) * 100;
  }
  const thang: ThangMuaVu[] = Array.from({ length: 12 }, (_, t) => {
    const ds = [...bang.entries()]
      .filter(([nam]) => nam * 12 + t !== thangNay)
      .map(([, r]) => r[t])
      .filter((x): x is number => x != null);
    return {
      thang: t + 1,
      tb: ds.length ? ds.reduce((s, x) => s + x, 0) / ds.length : null,
      tyLeTang: ds.length ? (ds.filter((x) => x > 0).length / ds.length) * 100 : null,
      soNam: ds.length,
    };
  });
  const nam = [...bang.entries()].sort((a, b) => b[0] - a[0]).map(([nam, thang]) => ({ nam, thang }));
  return { thang, nam, thangHienTai: (thangNay % 12) + 1 };
}

export type MuaVu = ReturnType<typeof muaVu>;

// Thời điểm hiện tại theo giây, cho diemXoay (trang phải gọi connection() trước)
export const bayGio = () => Date.now() / 1000;
