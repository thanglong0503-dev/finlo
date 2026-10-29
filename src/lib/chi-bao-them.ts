// Bộ chỉ báo mở rộng: trung bình động, kênh giá, dao động, khối lượng và hỗ trợ/kháng cự.
// Cùng quy ước với chi-bao.ts: kết quả dài bằng mảng nến, phiên chưa đủ dữ liệu là null.

import { atr, ema, sma, type Chuoi, type NenCB } from "@/lib/chi-bao";

const rong = (n: number): Chuoi => Array.from({ length: n }, () => null);

// Trung bình cộng trên chuỗi có null (bỏ qua đoạn đầu chưa có số)
export function smaChuoi(gt: Chuoi, n: number): Chuoi {
  const dau = gt.findIndex((x) => x != null);
  if (dau < 0) return gt.map(() => null);
  return [...rong(dau), ...sma(gt.slice(dau) as number[], n)];
}

// Trung bình trọng số giảm dần đều (phiên mới nhất nặng nhất)
export function wma(gt: number[], n: number): Chuoi {
  const mau = (n * (n + 1)) / 2;
  return gt.map((_, i) => {
    if (i < n - 1) return null;
    let s = 0;
    for (let j = 0; j < n; j++) s += gt[i - j] * (n - j);
    return s / mau;
  });
}

// Hull MA: bám giá nhanh mà ít nhiễu
export function hma(gt: number[], n: number): Chuoi {
  const nua = wma(gt, Math.max(1, Math.round(n / 2)));
  const du = wma(gt, n);
  const hieu: Chuoi = gt.map((_, i) => (nua[i] != null && du[i] != null ? 2 * nua[i]! - du[i]! : null));
  const dau = hieu.findIndex((x) => x != null);
  if (dau < 0) return hieu;
  return [...rong(dau), ...wma(hieu.slice(dau) as number[], Math.max(1, Math.round(Math.sqrt(n))))];
}

// VWAP trượt n phiên: giá điển hình có trọng số khối lượng
export function vwap(nen: NenCB[], n: number): Chuoi {
  return nen.map((_, i) => {
    if (i < n - 1) return null;
    let tu = 0;
    let mau = 0;
    for (let j = i - n + 1; j <= i; j++) {
      const x = nen[j];
      tu += ((x.high + x.low + x.close) / 3) * x.volume;
      mau += x.volume;
    }
    return mau > 0 ? tu / mau : null;
  });
}

// Kênh Keltner: EMA ± k × ATR
export function keltner(nen: NenCB[], n: number, k: number, nAtr: number) {
  const giua = ema(
    nen.map((x) => x.close),
    n,
  );
  const a = atr(nen, nAtr);
  return {
    giua,
    tren: giua.map((g, i) => (g != null && a[i] != null ? g + k * a[i]! : null)),
    duoi: giua.map((g, i) => (g != null && a[i] != null ? g - k * a[i]! : null)),
  };
}

// Kênh Donchian: đỉnh cao nhất và đáy thấp nhất n phiên
export function donchian(nen: NenCB[], n: number) {
  const tren: Chuoi = [];
  const duoi: Chuoi = [];
  for (let i = 0; i < nen.length; i++) {
    if (i < n - 1) {
      tren.push(null);
      duoi.push(null);
      continue;
    }
    let c = -Infinity;
    let t = Infinity;
    for (let j = i - n + 1; j <= i; j++) {
      c = Math.max(c, nen[j].high);
      t = Math.min(t, nen[j].low);
    }
    tren.push(c);
    duoi.push(t);
  }
  return { tren, duoi, giua: tren.map((c, i) => (c != null && duoi[i] != null ? (c + duoi[i]!) / 2 : null)) };
}

export type DiemDao = { time: number; len: boolean };

// SuperTrend: đường dừng lỗ theo ATR, đổi phía khi xu hướng đảo chiều
export function superTrend(nen: NenCB[], n: number, k: number) {
  const a = atr(nen, n);
  const len: Chuoi = rong(nen.length);
  const xuong: Chuoi = rong(nen.length);
  const dao: DiemDao[] = [];
  let tren = 0;
  let duoi = 0;
  let huong = 1;
  let batDau = false;
  for (let i = 0; i < nen.length; i++) {
    if (a[i] == null) continue;
    const x = nen[i];
    const giua = (x.high + x.low) / 2;
    const tCoBan = giua + k * a[i]!;
    const dCoBan = giua - k * a[i]!;
    if (!batDau) {
      tren = tCoBan;
      duoi = dCoBan;
      huong = x.close >= giua ? 1 : -1;
      batDau = true;
    } else {
      const truoc = nen[i - 1].close;
      tren = tCoBan < tren || truoc > tren ? tCoBan : tren;
      duoi = dCoBan > duoi || truoc < duoi ? dCoBan : duoi;
      const huongMoi = huong === -1 && x.close > tren ? 1 : huong === 1 && x.close < duoi ? -1 : huong;
      if (huongMoi !== huong) dao.push({ time: x.time, len: huongMoi === 1 });
      huong = huongMoi;
    }
    if (huong === 1) len[i] = duoi;
    else xuong[i] = tren;
  }
  return { len, xuong, dao };
}

// Parabolic SAR: chuỗi chấm bám giá, đổi phía khi xu hướng đảo chiều
export function psar(nen: NenCB[], buoc: number, toiDa: number) {
  const kq: Chuoi = rong(nen.length);
  const dao: DiemDao[] = [];
  if (nen.length < 3) return { gt: kq, dao };
  let len = nen[1].close >= nen[0].close;
  let sar = len ? nen[0].low : nen[0].high;
  let cucTri = len ? nen[1].high : nen[1].low;
  let af = buoc;
  for (let i = 2; i < nen.length; i++) {
    sar = sar + af * (cucTri - sar);
    const x = nen[i];
    if (len) {
      sar = Math.min(sar, nen[i - 1].low, nen[i - 2].low);
      if (x.low < sar) {
        len = false;
        sar = cucTri;
        cucTri = x.low;
        af = buoc;
        dao.push({ time: x.time, len: false });
      } else if (x.high > cucTri) {
        cucTri = x.high;
        af = Math.min(af + buoc, toiDa);
      }
    } else {
      sar = Math.max(sar, nen[i - 1].high, nen[i - 2].high);
      if (x.high > sar) {
        len = true;
        sar = cucTri;
        cucTri = x.high;
        af = buoc;
        dao.push({ time: x.time, len: true });
      } else if (x.low < cucTri) {
        cucTri = x.low;
        af = Math.min(af + buoc, toiDa);
      }
    }
    kq[i] = sar;
  }
  return { gt: kq, dao };
}

// Ichimoku: Tenkan, Kijun, mây (Senkou A/B dời về trước), Chikou dời về sau
export function ichimoku(nen: NenCB[], nTenkan: number, nKijun: number, nSenkouB: number) {
  const giuaKenh = (n: number) => donchian(nen, n).giua;
  const tenkan = giuaKenh(nTenkan);
  const kijun = giuaKenh(nKijun);
  const bGoc = giuaKenh(nSenkouB);
  const aGoc: Chuoi = tenkan.map((t, i) => (t != null && kijun[i] != null ? (t + kijun[i]!) / 2 : null));
  const doi = nKijun;
  const senkouA: Chuoi = nen.map((_, i) => (i - doi >= 0 ? aGoc[i - doi] : null));
  const senkouB: Chuoi = nen.map((_, i) => (i - doi >= 0 ? bGoc[i - doi] : null));
  const chikou: Chuoi = nen.map((_, i) => (i + doi < nen.length ? nen[i + doi].close : null));
  return { tenkan, kijun, senkouA, senkouB, chikou };
}

// Stochastic RSI: Stochastic tính trên chuỗi RSI
export function stochRsi(rsiGt: Chuoi, nStoch: number, kMuot: number, dMuot: number) {
  const tho: Chuoi = rsiGt.map((r, i) => {
    if (r == null || i < nStoch - 1) return null;
    const doan = rsiGt.slice(i - nStoch + 1, i + 1);
    if (doan.some((v) => v == null)) return null;
    const c = Math.max(...(doan as number[]));
    const t = Math.min(...(doan as number[]));
    return c > t ? ((r - t) / (c - t)) * 100 : 50;
  });
  const k = smaChuoi(tho, kMuot);
  return { k, d: smaChuoi(k, dMuot) };
}

export function cci(nen: NenCB[], n: number): Chuoi {
  const dien = nen.map((x) => (x.high + x.low + x.close) / 3);
  return dien.map((p, i) => {
    if (i < n - 1) return null;
    const doan = dien.slice(i - n + 1, i + 1);
    const tb = doan.reduce((s, v) => s + v, 0) / n;
    const lech = doan.reduce((s, v) => s + Math.abs(v - tb), 0) / n;
    return lech > 0 ? (p - tb) / (0.015 * lech) : 0;
  });
}

export function williamsR(nen: NenCB[], n: number): Chuoi {
  const d = donchian(nen, n);
  return nen.map((x, i) => {
    const c = d.tren[i];
    const t = d.duoi[i];
    return c == null || t == null ? null : c > t ? ((x.close - c) / (c - t)) * 100 : -50;
  });
}

export function roc(dong: number[], n: number): Chuoi {
  return dong.map((v, i) => (i >= n && dong[i - n] ? (v / dong[i - n] - 1) * 100 : null));
}

// ADX với +DI, −DI (làm mượt Wilder)
export function adx(nen: NenCB[], n: number) {
  const len = nen.length;
  const diCong: Chuoi = rong(len);
  const diTru: Chuoi = rong(len);
  const dx: Chuoi = rong(len);
  let tr = 0;
  let pdm = 0;
  let mdm = 0;
  for (let i = 1; i < len; i++) {
    const x = nen[i];
    const t = nen[i - 1];
    const lenMoi = x.high - t.high;
    const xuongMoi = t.low - x.low;
    const p = lenMoi > xuongMoi && lenMoi > 0 ? lenMoi : 0;
    const m = xuongMoi > lenMoi && xuongMoi > 0 ? xuongMoi : 0;
    const trI = Math.max(x.high - x.low, Math.abs(x.high - t.close), Math.abs(x.low - t.close));
    if (i <= n) {
      tr += trI;
      pdm += p;
      mdm += m;
      if (i < n) continue;
    } else {
      tr = tr - tr / n + trI;
      pdm = pdm - pdm / n + p;
      mdm = mdm - mdm / n + m;
    }
    const dp = tr > 0 ? (pdm / tr) * 100 : 0;
    const dm = tr > 0 ? (mdm / tr) * 100 : 0;
    diCong[i] = dp;
    diTru[i] = dm;
    dx[i] = dp + dm > 0 ? (Math.abs(dp - dm) / (dp + dm)) * 100 : 0;
  }
  // ADX: trung bình Wilder của DX
  const adxGt: Chuoi = rong(len);
  const dau = dx.findIndex((v) => v != null);
  if (dau >= 0) {
    let tb = 0;
    for (let i = dau; i < len; i++) {
      const k = i - dau;
      if (k < n) {
        tb += dx[i]!;
        if (k === n - 1) {
          tb /= n;
          adxGt[i] = tb;
        }
      } else {
        tb = (tb * (n - 1) + dx[i]!) / n;
        adxGt[i] = tb;
      }
    }
  }
  return { adx: adxGt, diCong, diTru };
}

// Aroon: bao nhiêu phiên kể từ đỉnh/đáy gần nhất trong n phiên
export function aroon(nen: NenCB[], n: number) {
  const len: Chuoi = [];
  const xuong: Chuoi = [];
  for (let i = 0; i < nen.length; i++) {
    if (i < n) {
      len.push(null);
      xuong.push(null);
      continue;
    }
    let iCao = i;
    let iThap = i;
    for (let j = i - n; j <= i; j++) {
      if (nen[j].high >= nen[iCao].high) iCao = j;
      if (nen[j].low <= nen[iThap].low) iThap = j;
    }
    len.push(((n - (i - iCao)) / n) * 100);
    xuong.push(((n - (i - iThap)) / n) * 100);
  }
  return { len, xuong };
}

// MFI: RSI có trọng số khối lượng
export function mfi(nen: NenCB[], n: number): Chuoi {
  const dien = nen.map((x) => (x.high + x.low + x.close) / 3);
  return nen.map((_, i) => {
    if (i < n) return null;
    let duong = 0;
    let am = 0;
    for (let j = i - n + 1; j <= i; j++) {
      const tien = dien[j] * nen[j].volume;
      if (dien[j] > dien[j - 1]) duong += tien;
      else if (dien[j] < dien[j - 1]) am += tien;
    }
    return am === 0 ? 100 : 100 - 100 / (1 + duong / am);
  });
}

// Chaikin Money Flow: dòng tiền n phiên, −1..+1
export function cmf(nen: NenCB[], n: number): Chuoi {
  const mfv = nen.map((x) => {
    const bien = x.high - x.low;
    return bien > 0 ? ((x.close - x.low - (x.high - x.close)) / bien) * x.volume : 0;
  });
  return nen.map((_, i) => {
    if (i < n - 1) return null;
    let tu = 0;
    let mau = 0;
    for (let j = i - n + 1; j <= i; j++) {
      tu += mfv[j];
      mau += nen[j].volume;
    }
    return mau > 0 ? tu / mau : 0;
  });
}

// Pivot cổ điển theo từng khối n phiên: mức của khối trước áp cho cả khối hiện tại (bậc thang)
export function pivotKhoi(nen: NenCB[], n: number) {
  const ten = ["r2", "r1", "p", "s1", "s2"] as const;
  const kq = Object.fromEntries(ten.map((t) => [t, rong(nen.length)])) as Record<(typeof ten)[number], Chuoi>;
  for (let dau = n; dau < nen.length; dau += n) {
    const truoc = nen.slice(dau - n, dau);
    const c = Math.max(...truoc.map((x) => x.high));
    const t = Math.min(...truoc.map((x) => x.low));
    const d = truoc[truoc.length - 1].close;
    const p = (c + t + d) / 3;
    const muc = { r2: p + (c - t), r1: 2 * p - t, p, s1: 2 * p - c, s2: p - (c - t) };
    for (let i = dau; i < Math.min(dau + n, nen.length); i++) for (const k of ten) kq[k][i] = muc[k];
  }
  return kq;
}

// FL Hỗ trợ/Kháng cự: gom các đỉnh/đáy cục bộ (swing) gần nhau thành vùng giá,
// chấm điểm theo số lần chạm và khối lượng tại đó; lấy các vùng mạnh nhất trên và dưới giá hiện tại.
export function flHoTroKhangCu(nen: NenCB[], soPhien: number, soMuc: number) {
  const ds = nen.slice(-soPhien);
  if (ds.length < 20) return [];
  const w = 3;
  const diem: { gia: number; kl: number }[] = [];
  for (let i = w; i < ds.length - w; i++) {
    const doan = ds.slice(i - w, i + w + 1);
    if (ds[i].high === Math.max(...doan.map((x) => x.high))) diem.push({ gia: ds[i].high, kl: ds[i].volume });
    if (ds[i].low === Math.min(...doan.map((x) => x.low))) diem.push({ gia: ds[i].low, kl: ds[i].volume });
  }
  const a = atr(ds, 14).at(-1) ?? (ds.at(-1)!.close * 0.02);
  const nguong = a * 0.6;
  const cum: { gia: number; cham: number; kl: number }[] = [];
  for (const d of diem.sort((x, y) => x.gia - y.gia)) {
    const c = cum[cum.length - 1];
    if (c && d.gia - c.gia / c.cham <= nguong) {
      c.gia += d.gia;
      c.cham += 1;
      c.kl += d.kl;
    } else cum.push({ gia: d.gia, cham: 1, kl: d.kl });
  }
  const klTb = ds.reduce((s, x) => s + x.volume, 0) / ds.length || 1;
  const vung = cum.map((c) => ({ gia: c.gia / c.cham, cham: c.cham, diem: c.cham + c.kl / klTb / 4 }));
  const gia = ds.at(-1)!.close;
  const tren = vung.filter((v) => v.gia > gia && v.cham >= 2).sort((x, y) => y.diem - x.diem).slice(0, soMuc);
  const duoi = vung.filter((v) => v.gia <= gia && v.cham >= 2).sort((x, y) => y.diem - x.diem).slice(0, soMuc);
  return [
    ...tren.sort((x, y) => x.gia - y.gia).map((v, i) => ({ gia: v.gia, ten: `KC${i + 1}`, khangCu: true, cham: v.cham })),
    ...duoi.sort((x, y) => y.gia - x.gia).map((v, i) => ({ gia: v.gia, ten: `HT${i + 1}`, khangCu: false, cham: v.cham })),
  ];
}

