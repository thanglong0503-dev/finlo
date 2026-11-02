// Chỉ báo kỹ thuật tính trên mảng nến. Kết quả cùng độ dài với mảng đầu vào,
// các phiên chưa đủ dữ liệu là null.

// muaCD: khối lượng mua chủ động (chỉ có ở nến tiền số từ Binance)
export type NenCB = { time: number; open: number; high: number; low: number; close: number; volume: number; muaCD?: number };
export type Chuoi = (number | null)[];

export function sma(gt: number[], n: number): Chuoi {
  const kq: Chuoi = [];
  let tong = 0;
  for (let i = 0; i < gt.length; i++) {
    tong += gt[i];
    if (i >= n) tong -= gt[i - n];
    kq.push(i >= n - 1 ? tong / n : null);
  }
  return kq;
}

export function ema(gt: number[], n: number): Chuoi {
  const kq: Chuoi = [];
  const k = 2 / (n + 1);
  let truoc: number | null = null;
  let tong = 0;
  for (let i = 0; i < gt.length; i++) {
    if (truoc == null) {
      tong += gt[i];
      // Khởi đầu bằng trung bình cộng n phiên đầu
      if (i === n - 1) truoc = tong / n;
      kq.push(truoc);
    } else {
      truoc = gt[i] * k + truoc * (1 - k);
      kq.push(truoc);
    }
  }
  return kq;
}

// EMA trên chuỗi có null ở đầu (dùng cho đường tín hiệu MACD)
export function emaChuoi(gt: Chuoi, n: number): Chuoi {
  const dau = gt.findIndex((x) => x != null);
  if (dau < 0) return gt.map(() => null);
  const phan = ema(gt.slice(dau) as number[], n);
  return [...gt.slice(0, dau).map(() => null), ...phan];
}

export function bollinger(dong: number[], n = 20, k = 2) {
  const giua = sma(dong, n);
  const tren: Chuoi = [];
  const duoi: Chuoi = [];
  for (let i = 0; i < dong.length; i++) {
    const g = giua[i];
    if (g == null) {
      tren.push(null);
      duoi.push(null);
      continue;
    }
    let ps = 0;
    for (let j = i - n + 1; j <= i; j++) ps += (dong[j] - g) ** 2;
    const lech = Math.sqrt(ps / n);
    tren.push(g + k * lech);
    duoi.push(g - k * lech);
  }
  return { giua, tren, duoi };
}

// RSI theo cách làm mượt của Wilder
export function rsi(dong: number[], n = 14): Chuoi {
  const kq: Chuoi = dong.map(() => null);
  let tang = 0;
  let giam = 0;
  for (let i = 1; i < dong.length; i++) {
    const d = dong[i] - dong[i - 1];
    const t = Math.max(d, 0);
    const g = Math.max(-d, 0);
    if (i <= n) {
      tang += t;
      giam += g;
      if (i === n) {
        tang /= n;
        giam /= n;
        kq[i] = giam === 0 ? 100 : 100 - 100 / (1 + tang / giam);
      }
    } else {
      tang = (tang * (n - 1) + t) / n;
      giam = (giam * (n - 1) + g) / n;
      kq[i] = giam === 0 ? 100 : 100 - 100 / (1 + tang / giam);
    }
  }
  return kq;
}

export function macd(dong: number[], nhanh = 12, cham = 26, tinHieu = 9) {
  const e1 = ema(dong, nhanh);
  const e2 = ema(dong, cham);
  const duong: Chuoi = dong.map((_, i) => (e1[i] != null && e2[i] != null ? e1[i]! - e2[i]! : null));
  const tin = emaChuoi(duong, tinHieu);
  const cot: Chuoi = duong.map((m, i) => (m != null && tin[i] != null ? m - tin[i]! : null));
  return { duong, tin, cot };
}

// Biên độ dao động thực trung bình (Wilder)
export function atr(nen: NenCB[], n = 14): Chuoi {
  const kq: Chuoi = nen.map(() => null);
  let tb = 0;
  for (let i = 1; i < nen.length; i++) {
    const tr = Math.max(
      nen[i].high - nen[i].low,
      Math.abs(nen[i].high - nen[i - 1].close),
      Math.abs(nen[i].low - nen[i - 1].close),
    );
    if (i <= n) {
      tb += tr;
      if (i === n) {
        tb /= n;
        kq[i] = tb;
      }
    } else {
      tb = (tb * (n - 1) + tr) / n;
      kq[i] = tb;
    }
  }
  return kq;
}

// ===================== Chỉ báo riêng của Finlo =====================

export type TinHieu = { time: number; loai: "mua" | "ban"; ly: string };

// FL Xu hướng: điểm -100..+100 từ 4 yếu tố, mỗi yếu tố tối đa 25 điểm
//  1. Giá đóng cửa trên/dưới EMA20      (xu hướng ngắn)
//  2. EMA20 trên/dưới EMA50             (xu hướng trung hạn)
//  3. Cột MACD dương/âm                 (động lượng)
//  4. RSI so với mốc 50, tỷ lệ tuyến tính (sức mạnh tương đối)
// Làm mượt bằng EMA5. Cắt lên 0 là tín hiệu mua, cắt xuống 0 là tín hiệu bán.
export function flXuHuong(nen: NenCB[]) {
  const dong = nen.map((x) => x.close);
  const e20 = ema(dong, 20);
  const e50 = ema(dong, 50);
  const { cot } = macd(dong);
  const r = rsi(dong);
  const tho: Chuoi = nen.map((_, i) => {
    if (e20[i] == null || e50[i] == null || cot[i] == null || r[i] == null) return null;
    let d = dong[i] > e20[i]! ? 25 : -25;
    d += e20[i]! > e50[i]! ? 25 : -25;
    d += cot[i]! > 0 ? 25 : -25;
    d += ((r[i]! - 50) / 50) * 25;
    return d;
  });
  const diem = emaChuoi(tho, 5);
  const tinHieu: TinHieu[] = [];
  for (let i = 1; i < nen.length; i++) {
    const a = diem[i - 1];
    const b = diem[i];
    if (a == null || b == null) continue;
    if (a <= 0 && b > 0) tinHieu.push({ time: nen[i].time, loai: "mua", ly: "FL Xu hướng cắt lên 0" });
    if (a >= 0 && b < 0) tinHieu.push({ time: nen[i].time, loai: "ban", ly: "FL Xu hướng cắt xuống 0" });
  }
  return { diem, tinHieu };
}

// FL Dòng tiền: vị trí giá đóng cửa trong biên độ phiên (-1 sát đáy, +1 sát đỉnh)
// nhân khối lượng, cộng dồn n phiên rồi chia tổng khối lượng, quy về -100..+100.
// Dương kéo dài: tiền đang vào (đóng cửa liên tục ở nửa trên phiên với khối lượng lớn).
export function flDongTien(nen: NenCB[], n = 20): Chuoi {
  const mfv = nen.map((x) => {
    const bien = x.high - x.low;
    const viTri = bien > 0 ? (x.close - x.low - (x.high - x.close)) / bien : 0;
    return viTri * x.volume;
  });
  return nen.map((_, i) => {
    if (i < n - 1) return null;
    let tu = 0;
    let mau = 0;
    for (let j = i - n + 1; j <= i; j++) {
      tu += mfv[j];
      mau += nen[j].volume;
    }
    return mau > 0 ? (tu / mau) * 100 : 0;
  });
}

// FL Vùng giá: dải EMA20 ± 2 × ATR14, co giãn theo biến động.
// Đóng cửa vượt dải trên sau khi nằm trong dải là phá vỡ đi lên (mua), thủng dải dưới là bán.
export function flVungGia(nen: NenCB[]) {
  const dong = nen.map((x) => x.close);
  const giua = ema(dong, 20);
  const a = atr(nen, 14);
  const tren: Chuoi = giua.map((g, i) => (g != null && a[i] != null ? g + 2 * a[i]! : null));
  const duoi: Chuoi = giua.map((g, i) => (g != null && a[i] != null ? g - 2 * a[i]! : null));
  const tinHieu: TinHieu[] = [];
  for (let i = 1; i < nen.length; i++) {
    if (tren[i] == null || tren[i - 1] == null || duoi[i] == null || duoi[i - 1] == null) continue;
    if (dong[i - 1] <= tren[i - 1]! && dong[i] > tren[i]!)
      tinHieu.push({ time: nen[i].time, loai: "mua", ly: "Phá vỡ lên FL Vùng giá" });
    if (dong[i - 1] >= duoi[i - 1]! && dong[i] < duoi[i]!)
      tinHieu.push({ time: nen[i].time, loai: "ban", ly: "Thủng xuống FL Vùng giá" });
  }
  return { giua, tren, duoi, tinHieu };
}

// Khối lượng theo giá: chia khoảng giá n phiên gần nhất thành các ô, cộng khối lượng mỗi phiên
// vào ô chứa giá trung bình phiên đó. Ô nhiều khối lượng là vùng giá được giao dịch nhiều (hỗ trợ/kháng cự).
export function khoiLuongTheoGia(nen: NenCB[], soPhien = 60, soO = 16) {
  const ds = nen.slice(-soPhien);
  if (ds.length === 0) return [];
  const thap = Math.min(...ds.map((x) => x.low));
  const cao = Math.max(...ds.map((x) => x.high));
  const buoc = (cao - thap) / soO || 1;
  const o = Array.from({ length: soO }, (_, i) => ({ tu: thap + i * buoc, den: thap + (i + 1) * buoc, kl: 0, tang: 0 }));
  for (const x of ds) {
    const tb = (x.high + x.low + x.close) / 3;
    const i = Math.min(soO - 1, Math.max(0, Math.floor((tb - thap) / buoc)));
    o[i].kl += x.volume;
    if (x.close >= x.open) o[i].tang += x.volume;
  }
  return o.reverse(); // giá cao ở trên
}

// OBV: cộng khối lượng phiên tăng, trừ khối lượng phiên giảm
export function obv(nen: NenCB[]): Chuoi {
  let s = 0;
  return nen.map((x, i) => {
    if (i > 0) s += x.close > nen[i - 1].close ? x.volume : x.close < nen[i - 1].close ? -x.volume : 0;
    return s;
  });
}

// Stochastic (14, 3): vị trí giá đóng cửa trong biên độ 14 phiên; %D là trung bình 3 phiên của %K
export function stochastic(nen: NenCB[], n = 14, d = 3) {
  const k: Chuoi = nen.map((x, i) => {
    if (i < n - 1) return null;
    let cao = -Infinity;
    let thap = Infinity;
    for (let j = i - n + 1; j <= i; j++) {
      cao = Math.max(cao, nen[j].high);
      thap = Math.min(thap, nen[j].low);
    }
    return cao > thap ? ((x.close - thap) / (cao - thap)) * 100 : 50;
  });
  const dong: Chuoi = k.map((_, i) => {
    if (i < d - 1 || k.slice(i - d + 1, i + 1).some((v) => v == null)) return null;
    return (k.slice(i - d + 1, i + 1) as number[]).reduce((s, v) => s + v, 0) / d;
  });
  return { k, d: dong };
}

// ===================== FL Giá trị =====================
// Vùng giá ứng với các mức P/B mà chính mã từng có (cùng cách làm với Mofi Fair Value).
//  - Thước đo: P/B = giá / giá trị sổ sách mỗi cổ phiếu, cho mọi ngành.
//  - Mỗi phiên dùng giá trị sổ sách của báo cáo ĐÃ CÔNG BỐ tại phiên đó (không lấy số tương lai),
//    nên các vạch đi bậc thang, chỉ đổi khi có báo cáo mới.
//  - Năm vạch: P/B ở bách phân vị 10 / 25 / 50 / 75 / 90 trên toàn bộ lịch sử, nhân giá trị sổ sách hiện hành.
//  - Điểm: P/B hôm nay cao hơn bao nhiêu % số phiên trong lịch sử (0 rẻ nhất, 100 đắt nhất).

export type MocGiaTri = { tu: number; eps: number | null; bvps: number | null };

const phanVi = (ds: number[], p: number) => {
  const i = (ds.length - 1) * p;
  const a = Math.floor(i);
  return ds[a] + (ds[Math.min(a + 1, ds.length - 1)] - ds[a]) * (i - a);
};

export const MUC_GIA_TRI = [
  { p: 0.1, ten: "Rẻ hiếm gặp" },
  { p: 0.25, ten: "Rẻ" },
  { p: 0.5, ten: "Thường gặp" },
  { p: 0.75, ten: "Đắt" },
  { p: 0.9, ten: "Đắt hiếm gặp" },
] as const;

export function flGiaTri(nen: NenCB[], moc: MocGiaTri[]) {
  const ds = [...moc].sort((a, b) => a.tu - b.tu);
  // Giá trị sổ sách hiện hành tại từng phiên
  const neo: Chuoi = [];
  let j = -1;
  for (const x of nen) {
    while (j + 1 < ds.length && ds[j + 1].tu <= x.time) j++;
    const v = j >= 0 ? ds[j].bvps : null;
    neo.push(v != null && v > 0 ? v : null);
  }
  const boi: Chuoi = nen.map((x, i) => (neo[i] ? x.close / neo[i]! : null));
  const sapXep = (boi.filter((v) => v != null) as number[]).sort((a, b) => a - b);
  if (sapXep.length < 60) return null; // dưới ~3 tháng dữ liệu thì chưa đủ để nói rẻ/đắt

  const muc = MUC_GIA_TRI.map((m) => ({ ...m, boi: phanVi(sapXep, m.p), gt: [] as Chuoi }));
  for (const m of muc) m.gt = neo.map((n) => (n ? n * m.boi : null));

  const iCuoi = nen.length - 1;
  const boiNay = boi[iCuoi];
  const diem = boiNay != null ? (sapXep.filter((v) => v < boiNay).length / sapXep.length) * 100 : null;
  // Mức gần nhất với P/B hôm nay
  const nhom =
    boiNay == null
      ? null
      : boiNay < muc[0].boi
        ? "Rẻ hiếm gặp"
        : boiNay < muc[1].boi
          ? "Rẻ"
          : boiNay <= muc[3].boi
            ? "Quanh mức thường gặp"
            : boiNay <= muc[4].boi
              ? "Đắt"
              : "Đắt hiếm gặp";
  // Số năm lịch sử và số kỳ báo cáo đã dùng
  const dau = nen.findIndex((_, i) => boi[i] != null);
  const soNam = dau >= 0 ? (nen[iCuoi].time - nen[dau].time) / (365.25 * 86400) : 0;
  const soKy = dau >= 0 ? ds.filter((m) => m.tu <= nen[iCuoi].time && m.tu >= ds[Math.max(0, ds.findLastIndex((x) => x.tu <= nen[dau].time))].tu).length : 0;

  return { muc, neo, neoNay: neo[iCuoi], boiNay, diem, nhom, soNam, soKy };
}
