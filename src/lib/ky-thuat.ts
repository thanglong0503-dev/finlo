// Tổng hợp phân tích kỹ thuật cho một mã từ chuỗi nến ngày:
// đường trung bình, dao động, hỗ trợ/kháng cự, hiệu suất giá và trạng thái chỉ báo Finlo.

import { atr, ema, flDongTien, flVungGia, flXuHuong, macd, rsi, sma, stochastic, type NenCB, type TinHieu } from "@/lib/chi-bao";

export type HuongTH = "mua" | "ban" | "trung";

export type DongTH = { ten: string; giaTri: number | null; huong: HuongTH; ghiChu?: string };

export type KetLuan = "Mua mạnh" | "Mua" | "Trung tính" | "Bán" | "Bán mạnh";

export type TongHopTH = { mua: number; ban: number; trung: number; diem: number; ketLuan: KetLuan };

const cuoi = (c: (number | null)[]) => c[c.length - 1] ?? null;

function tongHop(ds: DongTH[]): TongHopTH {
  const mua = ds.filter((d) => d.huong === "mua").length;
  const ban = ds.filter((d) => d.huong === "ban").length;
  const trung = ds.length - mua - ban;
  // -1 (toàn bán) .. +1 (toàn mua)
  const diem = ds.length ? (mua - ban) / ds.length : 0;
  const ketLuan: KetLuan =
    diem >= 0.5 ? "Mua mạnh" : diem >= 0.1 ? "Mua" : diem <= -0.5 ? "Bán mạnh" : diem <= -0.1 ? "Bán" : "Trung tính";
  return { mua, ban, trung, diem, ketLuan };
}

// Chỉ dùng phần dữ liệu cần cho các chỉ báo dài nhất (MA200 + EMA200 ổn định)
export function phanTichKyThuat(nenDayDu: NenCB[]) {
  const nen = nenDayDu.slice(-600);
  const n = nen.length;
  const dong = nen.map((x) => x.close);
  const gia = dong[n - 1];

  // ---- Đường trung bình: giá trên đường là mua, dưới là bán ----
  const trungBinh: DongTH[] = [];
  for (const k of [5, 10, 20, 50, 100, 200]) {
    for (const [loai, ham] of [
      ["MA", sma],
      ["EMA", ema],
    ] as const) {
      const v = n >= k ? cuoi(ham(dong, k)) : null;
      trungBinh.push({
        ten: `${loai}${k}`,
        giaTri: v,
        huong: v == null ? "trung" : gia > v ? "mua" : gia < v ? "ban" : "trung",
      });
    }
  }

  // ---- Dao động ----
  const r = cuoi(rsi(dong));
  const st = stochastic(nen);
  const k = cuoi(st.k);
  const d = cuoi(st.d);
  const m = macd(dong);
  const mDuong = cuoi(m.duong);
  const mTin = cuoi(m.tin);
  // Williams %R 14: -100 sát đáy, 0 sát đỉnh biên độ 14 phiên
  const bien14 = nen.slice(-14);
  const cao14 = Math.max(...bien14.map((x) => x.high));
  const thap14 = Math.min(...bien14.map((x) => x.low));
  const wr = cao14 > thap14 ? ((gia - cao14) / (cao14 - thap14)) * 100 : null;
  // ROC 12: % thay đổi so với 12 phiên trước
  const roc = n > 12 ? (gia / dong[n - 13] - 1) * 100 : null;
  // CCI 20: độ lệch giá điển hình khỏi trung bình, chia 0,015 × độ lệch tuyệt đối trung bình
  const dien = nen.slice(-20).map((x) => (x.high + x.low + x.close) / 3);
  const tbDien = dien.reduce((s, x) => s + x, 0) / dien.length;
  const lechTb = dien.reduce((s, x) => s + Math.abs(x - tbDien), 0) / dien.length;
  const cci = n >= 20 && lechTb > 0 ? (dien[dien.length - 1] - tbDien) / (0.015 * lechTb) : null;

  const daoDong: DongTH[] = [
    {
      ten: "RSI (14)",
      giaTri: r,
      huong: r == null ? "trung" : r > 70 ? "ban" : r < 30 ? "mua" : r > 55 ? "mua" : r < 45 ? "ban" : "trung",
      ghiChu: r == null ? undefined : r > 70 ? "Quá mua" : r < 30 ? "Quá bán" : undefined,
    },
    {
      ten: "Stochastic %K (14, 3)",
      giaTri: k,
      huong: k == null || d == null ? "trung" : k > 80 ? "ban" : k < 20 ? "mua" : k > d ? "mua" : k < d ? "ban" : "trung",
      ghiChu: k == null ? undefined : k > 80 ? "Quá mua" : k < 20 ? "Quá bán" : undefined,
    },
    {
      ten: "MACD (12, 26, 9)",
      giaTri: mDuong != null ? mDuong / 1000 : null, // theo nghìn đồng như giá
      huong: mDuong == null || mTin == null ? "trung" : mDuong > mTin ? "mua" : mDuong < mTin ? "ban" : "trung",
      ghiChu: mDuong != null && mTin != null ? (mDuong > mTin ? "Trên đường tín hiệu" : "Dưới đường tín hiệu") : undefined,
    },
    {
      ten: "Williams %R (14)",
      giaTri: wr,
      huong: wr == null ? "trung" : wr > -20 ? "ban" : wr < -80 ? "mua" : "trung",
      ghiChu: wr == null ? undefined : wr > -20 ? "Quá mua" : wr < -80 ? "Quá bán" : undefined,
    },
    {
      ten: "CCI (20)",
      giaTri: cci,
      huong: cci == null ? "trung" : cci > 100 ? "ban" : cci < -100 ? "mua" : cci > 0 ? "mua" : "ban",
      ghiChu: cci == null ? undefined : cci > 100 ? "Quá mua" : cci < -100 ? "Quá bán" : undefined,
    },
    {
      ten: "ROC (12)",
      giaTri: roc,
      huong: roc == null ? "trung" : roc > 0 ? "mua" : roc < 0 ? "ban" : "trung",
    },
  ];

  // ---- Hỗ trợ / kháng cự: pivot cổ điển từ phiên gần nhất + đỉnh/đáy theo kỳ ----
  const p = nen[n - 1];
  const pivot = (p.high + p.low + p.close) / 3;
  const muc = {
    r3: p.high + 2 * (pivot - p.low),
    r2: pivot + (p.high - p.low),
    r1: 2 * pivot - p.low,
    pivot,
    s1: 2 * pivot - p.high,
    s2: pivot - (p.high - p.low),
    s3: p.low - 2 * (p.high - pivot),
  };
  const bienKy = [20, 60, 250].map((ky) => {
    const ds = nen.slice(-ky);
    return {
      ky,
      cao: Math.max(...ds.map((x) => x.high)),
      thap: Math.min(...ds.map((x) => x.low)),
    };
  });

  // ---- Hiệu suất giá ----
  const truoc = (phien: number) => (n > phien ? (gia / dong[n - 1 - phien] - 1) * 100 : null);
  // Mốc thời gian nến là nửa đêm giờ Việt Nam (UTC+7)
  const nam = (giay: number) => new Date((giay + 7 * 3600) * 1000).getUTCFullYear();
  const namNay = nam(nen[n - 1].time);
  const dauNam = nen.findLastIndex((x) => nam(x.time) < namNay);
  const hieuSuat = [
    { ten: "1 tuần", gt: truoc(5) },
    { ten: "1 tháng", gt: truoc(21) },
    { ten: "3 tháng", gt: truoc(63) },
    { ten: "6 tháng", gt: truoc(126) },
    { ten: "1 năm", gt: truoc(250) },
    { ten: "Từ đầu năm", gt: dauNam >= 0 ? (gia / dong[dauNam] - 1) * 100 : null },
  ];

  // ---- Biến động và thanh khoản ----
  const a = cuoi(atr(nen, 14));
  const kl20 = nen.slice(-20).reduce((s, x) => s + x.volume, 0) / Math.min(20, n);

  // ---- Chỉ báo Finlo ----
  const xh = flXuHuong(nen);
  const vg = flVungGia(nen);
  const dt = cuoi(flDongTien(nen));
  const tren = cuoi(vg.tren);
  const duoi = cuoi(vg.duoi);
  const tinHieu: TinHieu[] = [...xh.tinHieu, ...vg.tinHieu].sort((x, y) => y.time - x.time).slice(0, 8);

  return {
    gia,
    ngay: nen[n - 1].time,
    trungBinh,
    daoDong,
    tongTB: tongHop(trungBinh),
    tongDD: tongHop(daoDong),
    tong: tongHop([...trungBinh, ...daoDong]),
    muc,
    bienKy,
    hieuSuat,
    atrPhanTram: a != null ? (a / gia) * 100 : null,
    klSoTb20: kl20 > 0 ? p.volume / kl20 : null,
    finlo: {
      xuHuong: cuoi(xh.diem),
      dongTien: dt,
      vungGia: tren == null || duoi == null ? null : { tren, duoi, viTri: gia > tren ? "tren" : gia < duoi ? "duoi" : "trong" },
      tinHieu,
    },
  };
}

export type PhanTichKyThuat = ReturnType<typeof phanTichKyThuat>;
