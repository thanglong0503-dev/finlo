// Chỉ báo kỹ thuật tính trên mảng nến. Kết quả cùng độ dài với mảng đầu vào,
// các phiên chưa đủ dữ liệu là null.

export type NenCB = { time: number; open: number; high: number; low: number; close: number; volume: number };
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
function emaChuoi(gt: Chuoi, n: number): Chuoi {
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
