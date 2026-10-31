// Danh mục chỉ báo của biểu đồ tương tác: mô tả, tham số chỉnh được và cách tính ra các đường cần vẽ.
// Biểu đồ chỉ cần duyệt danh mục này, nên thêm chỉ báo mới không phải sửa phần vẽ.

import {
  bollinger,
  ema,
  flDongTien,
  flGiaTri,
  flVungGia,
  flXuHuong,
  macd,
  obv,
  rsi,
  sma,
  stochastic,
  atr,
  type Chuoi,
  type MocGiaTri,
  type NenCB,
} from "@/lib/chi-bao";
import {
  adx,
  aroon,
  cci,
  cmf,
  donchian,
  flHoTroKhangCu,
  hma,
  ichimoku,
  keltner,
  mfi,
  pivotKhoi,
  psar,
  roc,
  smaChuoi,
  stochRsi,
  superTrend,
  vwap,
  williamsR,
  wma,
} from "@/lib/chi-bao-them";
import type { Diem, DuLieuPhaiSinh } from "@/lib/phai-sinh-bieu-do";

export type NhomChiBao = "xu-huong" | "dao-dong" | "khoi-luong" | "dinh-gia" | "phai-sinh";

export const NHOM: { ma: NhomChiBao; ten: string }[] = [
  { ma: "xu-huong", ten: "Xu hướng" },
  { ma: "dao-dong", ten: "Dao động" },
  { ma: "khoi-luong", ten: "Khối lượng" },
  { ma: "dinh-gia", ten: "Định giá" },
  { ma: "phai-sinh", ten: "Long/Short" },
];

export type ThamSo = { khoa: string; nhan: string; macDinh: number; min: number; max: number; buoc?: number };

export type DinhDang = "gia" | "so" | "kl" | "pt" | "pt4";

export type Ve =
  | {
      loai: "duong";
      ten: string;
      gt: Chuoi;
      mau: string;
      rong?: 1 | 2 | 3;
      net?: "lien" | "dut" | "cham";
      chiCham?: boolean; // vẽ thành chấm rời (Parabolic SAR)
      nhan?: string; // hiện nhãn tên + giá trị cuối trên trục giá
      dinhDang: DinhDang;
    }
  | { loai: "cot"; ten: string; gt: Chuoi; mau: (v: number, i: number) => string; dinhDang: DinhDang }
  // Tô nền phía trên đường (mauTren) và phía dưới đường (mauDuoi) tới mép khung, không làm đổi thang giá
  | { loai: "vung"; ten: string; gt: Chuoi; mauTren: string; mauDuoi: string };

export type Moc = { time: number; len: boolean; mau: string; chu: string };

export type KetQuaChiBao = {
  ve: Ve[];
  muc?: { gia: number; mau: string }[]; // đường ngang tham chiếu trong khung riêng (70/30, 0…)
  mucGia?: { gia: number; mau: string; nhan: string }[]; // đường ngang có nhãn trên biểu đồ giá
  moc?: Moc[];
};

export type MauChiBao = { tang: string; giam: string; nhan: string; phu: string; chu: string };

export type NguCanh = {
  nguon: "ck" | "ts";
  mau: MauChiBao;
  dinhGia: { loai: string; moc: MocGiaTri[]; peNganh: number | null } | null;
  noiBo: { ngay: string; mua: boolean; soCp: number; toChuc: boolean }[] | null;
  phaiSinh: DuLieuPhaiSinh | null;
};

export type ChiBao = {
  ma: string;
  ten: string;
  tenNgan?: (ts: Record<string, number>) => string; // nhãn trên thẻ, có tham số: "RSI 14"
  nhom: NhomChiBao;
  moTa: string;
  finlo?: boolean;
  khung: "gia" | "rieng" | "kl"; // vẽ đè giá, khung riêng bên dưới, hay cột khối lượng đáy biểu đồ
  chiCoPhieu?: boolean; // cần báo cáo tài chính, giao dịch nội bộ: chỉ có ở cổ phiếu
  chiTienSo?: boolean; // cần dữ liệu phái sinh hoặc lệnh chủ động của sàn tiền số
  can?: "dinh-gia" | "noi-bo" | "phai-sinh"; // cần tải thêm dữ liệu
  thamSo: ThamSo[];
  tinh: (nen: NenCB[], ts: Record<string, number>, nc: NguCanh) => KetQuaChiBao | null;
};

// Bảng màu cố định cho các đường (đọc rõ trên nền sáng lẫn tối)
const M = {
  vang: "#e3a008",
  lam: "#3b82f6",
  tim: "#a855f7",
  hong: "#ec4899",
  lo: "#14b8a6",
  cam: "#f97316",
  xam: "#94a3b8",
};

const dongCua = (nen: NenCB[]) => nen.map((x) => x.close);
const ky = (ten: string, khoa = "n") => (ts: Record<string, number>) => `${ten} ${ts[khoa]}`;
const tsN = (macDinh: number, nhan = "Chu kỳ", max = 400): ThamSo => ({ khoa: "n", nhan, macDinh, min: 2, max });

export type ApDung = "ck" | "ts" | "ca-hai";
export const apDung = (c: ChiBao): ApDung => (c.chiCoPhieu ? "ck" : c.chiTienSo ? "ts" : "ca-hai");
export const dungDuoc = (c: ChiBao, nguon: "ck" | "ts") => apDung(c) === "ca-hai" || apDung(c) === nguon;

// Gắn dữ liệu theo thời gian (OI, tỷ lệ Long/Short, funding…) vào từng nến: giá trị mới nhất tính đến lúc nến đóng.
// Nến nằm trước khoảng có dữ liệu (Binance chỉ giữ ~30 ngày OI và Long/Short) thì để trống.
function theoNen(nen: NenCB[], diem: Diem[]): Chuoi {
  if (!diem.length || !nen.length) return nen.map(() => null);
  const buoc = nen.length > 1 ? nen[nen.length - 1].time - nen[nen.length - 2].time : 3600;
  const hanCu = Math.max(buoc, 9 * 3600) * 2;
  const kq: Chuoi = [];
  let j = -1;
  for (const x of nen) {
    const het = x.time + buoc;
    while (j + 1 < diem.length && diem[j + 1].t < het) j++;
    kq.push(j >= 0 && het - diem[j].t <= hanCu ? diem[j].v : null);
  }
  return kq;
}

// Điểm chuẩn hoá (z-score) của giá trị i so với n giá trị gần nhất
function diemZ(gt: Chuoi, i: number, n: number): number | null {
  const x = gt[i];
  if (x == null) return null;
  const cua = gt.slice(Math.max(0, i - n + 1), i + 1).filter((v): v is number => v != null);
  if (cua.length < Math.min(n, 12)) return null;
  const tb = cua.reduce((t, v) => t + v, 0) / cua.length;
  const lech = Math.sqrt(cua.reduce((t, v) => t + (v - tb) ** 2, 0) / cua.length);
  return lech > 0 ? (x - tb) / lech : 0;
}

const PS_MO_TA = " Dữ liệu Binance Futures; Open Interest và tỷ lệ Long/Short chỉ có khoảng 30 ngày gần nhất.";

// Ba đường trung bình cùng loại, chu kỳ 0 là tắt
function baDuong(ten: string, ham: (g: number[], n: number) => Chuoi, macDinh: [number, number, number]): Pick<ChiBao, "thamSo" | "tinh" | "tenNgan"> {
  const mau = [M.vang, M.lam, M.hong];
  return {
    thamSo: macDinh.map((v, i) => ({ khoa: `n${i + 1}`, nhan: `Đường ${i + 1} (0 = tắt)`, macDinh: v, min: 0, max: 400 })),
    tenNgan: (ts) => `${ten} ${[ts.n1, ts.n2, ts.n3].filter((x) => x > 0).join("/")}`,
    tinh: (nen, ts) => {
      const d = dongCua(nen);
      return {
        ve: [ts.n1, ts.n2, ts.n3].flatMap((n, i) =>
          n > 0 ? [{ loai: "duong" as const, ten: `${ten}${n}`, gt: ham(d, n), mau: mau[i], dinhDang: "gia" as const }] : [],
        ),
      };
    },
  };
}

const dao = (ds: { time: number; len: boolean }[], nc: NguCanh, chu: string): Moc[] =>
  ds.map((d) => ({ time: d.time, len: d.len, mau: d.len ? nc.mau.tang : nc.mau.giam, chu }));

// Bội số P/E hoặc P/B theo từng phiên, dùng báo cáo đã công bố tại phiên đó
function chuoiBoiSo(nen: NenCB[], moc: MocGiaTri[], loai: "eps" | "bvps"): Chuoi {
  const ds = [...moc].sort((a, b) => a.tu - b.tu);
  let j = -1;
  return nen.map((x) => {
    while (j + 1 < ds.length && ds[j + 1].tu <= x.time) j++;
    const neo = j >= 0 ? ds[j][loai] : null;
    return neo != null && neo > 0 ? x.close / neo : null;
  });
}

function phanVi(ds: number[], p: number) {
  const s = [...ds].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const a = Math.floor(i);
  return s[a] + (s[Math.min(a + 1, s.length - 1)] - s[a]) * (i - a);
}

function boiSoLichSu(ten: string, loai: "eps" | "bvps"): ChiBao["tinh"] {
  return (nen, _ts, nc) => {
    if (!nc.dinhGia) return null;
    const gt = chuoiBoiSo(nen, nc.dinhGia.moc, loai);
    const hopLe = gt.filter((v): v is number => v != null && v < 300);
    if (hopLe.length < 30) return null;
    const giu = (v: number) => gt.map((x) => (x == null ? null : v));
    return {
      ve: [
        { loai: "duong", ten, gt, mau: M.tim, rong: 2, dinhDang: "so" },
        { loai: "duong", ten: "Trung vị", gt: giu(phanVi(hopLe, 0.5)), mau: nc.mau.phu, rong: 1, net: "dut", dinhDang: "so" },
        { loai: "duong", ten: "Rẻ (P20)", gt: giu(phanVi(hopLe, 0.2)), mau: nc.mau.tang, rong: 1, net: "cham", dinhDang: "so" },
        { loai: "duong", ten: "Đắt (P80)", gt: giu(phanVi(hopLe, 0.8)), mau: nc.mau.giam, rong: 1, net: "cham", dinhDang: "so" },
      ],
    };
  };
}

export const CHI_BAO: ChiBao[] = [
  // ================= Xu hướng (vẽ đè lên giá) =================
  {
    ma: "ma",
    ten: "MA",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Trung bình cộng giá đóng cửa N phiên. Tối đa ba đường, mặc định 20/50/200.",
    ...baDuong("MA", sma, [20, 50, 200]),
  },
  {
    ma: "ema",
    ten: "EMA",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Trung bình hàm mũ: phiên gần đây nặng hơn nên bám giá sát hơn MA.",
    ...baDuong("EMA", ema, [9, 21, 50]),
  },
  {
    ma: "wma",
    ten: "WMA",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Trung bình trọng số giảm dần đều: hôm nay nặng nhất, phiên xa nhất nhẹ nhất.",
    thamSo: [tsN(20)],
    tenNgan: ky("WMA"),
    tinh: (nen, ts) => ({ ve: [{ loai: "duong", ten: `WMA${ts.n}`, gt: wma(dongCua(nen), ts.n), mau: M.lo, dinhDang: "gia" }] }),
  },
  {
    ma: "hma",
    ten: "Hull MA",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Trung bình Hull: phản ứng nhanh gần như tức thời mà vẫn mượt, hợp để bắt đảo chiều sớm.",
    thamSo: [tsN(21)],
    tenNgan: ky("HMA"),
    tinh: (nen, ts) => ({ ve: [{ loai: "duong", ten: `HMA${ts.n}`, gt: hma(dongCua(nen), ts.n), mau: M.cam, dinhDang: "gia" }] }),
  },
  {
    ma: "vwap",
    ten: "VWAP",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Giá trung bình có trọng số khối lượng N phiên: mức giá thị trường thực sự đã giao dịch.",
    thamSo: [tsN(20)],
    tenNgan: ky("VWAP"),
    tinh: (nen, ts) => ({ ve: [{ loai: "duong", ten: `VWAP${ts.n}`, gt: vwap(nen, ts.n), mau: M.hong, net: "dut", dinhDang: "gia" }] }),
  },
  {
    ma: "bb",
    ten: "Bollinger Bands",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "MA ở giữa và hai dải ± k độ lệch chuẩn, nới rộng khi giá biến động mạnh. Dải co hẹp thường báo sắp bùng nổ.",
    thamSo: [tsN(20), { khoa: "k", nhan: "Độ lệch chuẩn", macDinh: 2, min: 0.5, max: 5, buoc: 0.1 }],
    tenNgan: (ts) => `BB ${ts.n}, ${ts.k}`,
    tinh: (nen, ts, nc) => {
      const b = bollinger(dongCua(nen), ts.n, ts.k);
      return {
        ve: [
          { loai: "duong", ten: "BB trên", gt: b.tren, mau: nc.mau.phu, rong: 1, net: "dut", dinhDang: "gia" },
          { loai: "duong", ten: "BB giữa", gt: b.giua, mau: nc.mau.phu, rong: 1, dinhDang: "gia" },
          { loai: "duong", ten: "BB dưới", gt: b.duoi, mau: nc.mau.phu, rong: 1, net: "dut", dinhDang: "gia" },
        ],
      };
    },
  },
  {
    ma: "keltner",
    ten: "Keltner Channel",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "EMA ± k lần ATR. Giá đóng ngoài kênh thường là dấu hiệu xu hướng mạnh.",
    thamSo: [tsN(20), { khoa: "k", nhan: "Hệ số ATR", macDinh: 2, min: 0.5, max: 5, buoc: 0.1 }, { khoa: "atr", nhan: "Chu kỳ ATR", macDinh: 10, min: 2, max: 100 }],
    tenNgan: (ts) => `KC ${ts.n}, ${ts.k}`,
    tinh: (nen, ts) => {
      const k = keltner(nen, ts.n, ts.k, ts.atr);
      return {
        ve: [
          { loai: "duong", ten: "KC trên", gt: k.tren, mau: M.lo, rong: 1, dinhDang: "gia" },
          { loai: "duong", ten: "KC giữa", gt: k.giua, mau: M.lo, rong: 1, net: "cham", dinhDang: "gia" },
          { loai: "duong", ten: "KC dưới", gt: k.duoi, mau: M.lo, rong: 1, dinhDang: "gia" },
        ],
      };
    },
  },
  {
    ma: "donchian",
    ten: "Donchian Channel",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Đỉnh cao nhất và đáy thấp nhất N phiên. Vượt cạnh trên là phá vỡ kiểu Turtle.",
    thamSo: [tsN(20)],
    tenNgan: ky("DC"),
    tinh: (nen, ts) => {
      const d = donchian(nen, ts.n);
      return {
        ve: [
          { loai: "duong", ten: "DC trên", gt: d.tren, mau: M.lam, rong: 1, dinhDang: "gia" },
          { loai: "duong", ten: "DC giữa", gt: d.giua, mau: M.lam, rong: 1, net: "cham", dinhDang: "gia" },
          { loai: "duong", ten: "DC dưới", gt: d.duoi, mau: M.lam, rong: 1, dinhDang: "gia" },
        ],
      };
    },
  },
  {
    ma: "supertrend",
    ten: "SuperTrend",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Đường dừng lỗ theo ATR: nằm dưới giá (xanh) khi xu hướng lên, nhảy lên trên (đỏ) khi đảo chiều.",
    thamSo: [tsN(10, "Chu kỳ ATR"), { khoa: "k", nhan: "Hệ số", macDinh: 3, min: 0.5, max: 10, buoc: 0.1 }],
    tenNgan: (ts) => `ST ${ts.n}, ${ts.k}`,
    tinh: (nen, ts, nc) => {
      const s = superTrend(nen, ts.n, ts.k);
      return {
        ve: [
          { loai: "duong", ten: "ST lên", gt: s.len, mau: nc.mau.tang, rong: 2, dinhDang: "gia" },
          { loai: "duong", ten: "ST xuống", gt: s.xuong, mau: nc.mau.giam, rong: 2, dinhDang: "gia" },
        ],
        moc: dao(s.dao, nc, "ST"),
      };
    },
  },
  {
    ma: "sar",
    ten: "Parabolic SAR",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Chuỗi chấm bám theo giá, đổi từ dưới lên trên khi xu hướng đảo chiều. Hay dùng để dời điểm dừng lỗ.",
    thamSo: [
      { khoa: "buoc", nhan: "Bước tăng", macDinh: 0.02, min: 0.005, max: 0.2, buoc: 0.005 },
      { khoa: "toiDa", nhan: "Tối đa", macDinh: 0.2, min: 0.05, max: 1, buoc: 0.05 },
    ],
    tenNgan: (ts) => `SAR ${ts.buoc}, ${ts.toiDa}`,
    tinh: (nen, ts) => {
      const s = psar(nen, ts.buoc, ts.toiDa);
      // Chấm đã cho thấy điểm đảo chiều nên không thêm nhãn trên nến (tránh rối)
      return { ve: [{ loai: "duong", ten: "SAR", gt: s.gt, mau: M.cam, chiCham: true, dinhDang: "gia" }] };
    },
  },
  {
    ma: "ichimoku",
    ten: "Ichimoku",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Tenkan, Kijun và mây Senkou A/B (dời trước 26 phiên). Giá trên mây và Tenkan trên Kijun là xu hướng tăng.",
    thamSo: [
      { khoa: "t", nhan: "Tenkan", macDinh: 9, min: 2, max: 100 },
      { khoa: "k", nhan: "Kijun", macDinh: 26, min: 2, max: 200 },
      { khoa: "b", nhan: "Senkou B", macDinh: 52, min: 2, max: 300 },
    ],
    tenNgan: (ts) => `Ichimoku ${ts.t}/${ts.k}/${ts.b}`,
    tinh: (nen, ts, nc) => {
      const i = ichimoku(nen, ts.t, ts.k, ts.b);
      return {
        ve: [
          { loai: "duong", ten: "Tenkan", gt: i.tenkan, mau: M.lam, rong: 1, dinhDang: "gia" },
          { loai: "duong", ten: "Kijun", gt: i.kijun, mau: M.hong, rong: 1, dinhDang: "gia" },
          { loai: "duong", ten: "Senkou A", gt: i.senkouA, mau: nc.mau.tang, rong: 1, net: "dut", dinhDang: "gia" },
          { loai: "duong", ten: "Senkou B", gt: i.senkouB, mau: nc.mau.giam, rong: 1, net: "dut", dinhDang: "gia" },
          { loai: "duong", ten: "Chikou", gt: i.chikou, mau: M.xam, rong: 1, net: "cham", dinhDang: "gia" },
        ],
      };
    },
  },
  {
    ma: "pivot",
    ten: "Pivot Points",
    nhom: "xu-huong",
    khung: "gia",
    moTa: "Điểm xoay cổ điển tính từ đỉnh, đáy, đóng cửa của khối N phiên trước, áp cho khối hiện tại (mặc định 20 phiên ≈ 1 tháng).",
    thamSo: [tsN(20, "Số phiên mỗi khối", 120)],
    tenNgan: ky("Pivot"),
    tinh: (nen, ts, nc) => {
      const p = pivotKhoi(nen, ts.n);
      return {
        ve: [
          { loai: "duong", ten: "R2", gt: p.r2, mau: nc.mau.giam, rong: 1, net: "cham", dinhDang: "gia" },
          { loai: "duong", ten: "R1", gt: p.r1, mau: nc.mau.giam, rong: 1, net: "dut", dinhDang: "gia" },
          { loai: "duong", ten: "P", gt: p.p, mau: nc.mau.phu, rong: 1, dinhDang: "gia" },
          { loai: "duong", ten: "S1", gt: p.s1, mau: nc.mau.tang, rong: 1, net: "dut", dinhDang: "gia" },
          { loai: "duong", ten: "S2", gt: p.s2, mau: nc.mau.tang, rong: 1, net: "cham", dinhDang: "gia" },
        ],
      };
    },
  },
  {
    ma: "fl-vung-gia",
    ten: "FL Vùng giá",
    nhom: "xu-huong",
    khung: "gia",
    finlo: true,
    moTa: "Dải EMA20 ± 2 ATR co giãn theo biến động; mũi tên khi giá phá vỡ lên hoặc thủng xuống.",
    thamSo: [],
    tinh: (nen, _ts, nc) => {
      const v = flVungGia(nen);
      return {
        ve: [
          { loai: "duong", ten: "FL Vùng trên", gt: v.tren, mau: nc.mau.nhan, rong: 1, net: "dut", dinhDang: "gia" },
          { loai: "duong", ten: "FL Vùng giữa", gt: v.giua, mau: nc.mau.nhan, rong: 1, net: "cham", dinhDang: "gia" },
          { loai: "duong", ten: "FL Vùng dưới", gt: v.duoi, mau: nc.mau.nhan, rong: 1, net: "dut", dinhDang: "gia" },
        ],
        moc: v.tinHieu.map((t) => ({ time: t.time, len: t.loai === "mua", mau: t.loai === "mua" ? nc.mau.tang : nc.mau.giam, chu: "VG" })),
      };
    },
  },
  {
    ma: "fl-ht-kc",
    ten: "FL Hỗ trợ/Kháng cự",
    nhom: "xu-huong",
    khung: "gia",
    finlo: true,
    moTa: "Tự tìm các vùng giá đã nhiều lần đảo chiều (đỉnh/đáy cục bộ), chấm điểm theo số lần chạm và khối lượng; vẽ các vùng mạnh nhất trên và dưới giá.",
    thamSo: [tsN(250, "Số phiên xét", 1000), { khoa: "muc", nhan: "Số mức mỗi phía", macDinh: 3, min: 1, max: 6 }],
    tenNgan: (ts) => `FL HT/KC ${ts.n}`,
    tinh: (nen, ts, nc) => ({
      ve: [],
      mucGia: flHoTroKhangCu(nen, ts.n, ts.muc).map((m) => ({
        gia: m.gia,
        mau: m.khangCu ? nc.mau.giam : nc.mau.tang,
        nhan: `${m.ten} · ${m.cham} lần`,
      })),
    }),
  },

  // ================= Dao động (khung riêng) =================
  {
    ma: "rsi",
    ten: "RSI",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "Sức mạnh tương đối: trên 70 quá mua, dưới 30 quá bán. Phân kỳ với giá là tín hiệu đảo chiều sớm.",
    thamSo: [tsN(14, "Chu kỳ", 100), { khoa: "tren", nhan: "Ngưỡng quá mua", macDinh: 70, min: 50, max: 95 }, { khoa: "duoi", nhan: "Ngưỡng quá bán", macDinh: 30, min: 5, max: 50 }],
    tenNgan: ky("RSI"),
    tinh: (nen, ts, nc) => {
      const r = rsi(dongCua(nen), ts.n);
      return {
        ve: [
          { loai: "duong", ten: `RSI${ts.n}`, gt: r, mau: M.tim, dinhDang: "so" },
          { loai: "duong", ten: "TB RSI", gt: smaChuoi(r, 14), mau: M.vang, rong: 1, dinhDang: "so" },
        ],
        muc: [
          { gia: ts.tren, mau: nc.mau.giam },
          { gia: 50, mau: nc.mau.phu },
          { gia: ts.duoi, mau: nc.mau.tang },
        ],
      };
    },
  },
  {
    ma: "stochrsi",
    ten: "Stoch RSI",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "Stochastic tính trên RSI: nhạy hơn RSI, hợp bắt nhịp ngắn. Trên 80 quá mua, dưới 20 quá bán.",
    thamSo: [tsN(14, "Chu kỳ RSI", 100), { khoa: "st", nhan: "Chu kỳ Stoch", macDinh: 14, min: 2, max: 100 }, { khoa: "k", nhan: "Làm mượt %K", macDinh: 3, min: 1, max: 20 }, { khoa: "d", nhan: "Làm mượt %D", macDinh: 3, min: 1, max: 20 }],
    tenNgan: (ts) => `StochRSI ${ts.n}`,
    tinh: (nen, ts, nc) => {
      const s = stochRsi(rsi(dongCua(nen), ts.n), ts.st, ts.k, ts.d);
      return {
        ve: [
          { loai: "duong", ten: "%K", gt: s.k, mau: M.lam, dinhDang: "so" },
          { loai: "duong", ten: "%D", gt: s.d, mau: M.vang, rong: 1, dinhDang: "so" },
        ],
        muc: [{ gia: 80, mau: nc.mau.giam }, { gia: 20, mau: nc.mau.tang }],
      };
    },
  },
  {
    ma: "macd",
    ten: "MACD",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "Hiệu hai EMA nhanh/chậm và đường tín hiệu. Cột dương mở rộng là đà tăng mạnh lên.",
    thamSo: [
      { khoa: "nhanh", nhan: "EMA nhanh", macDinh: 12, min: 2, max: 100 },
      { khoa: "cham", nhan: "EMA chậm", macDinh: 26, min: 3, max: 200 },
      { khoa: "tin", nhan: "Tín hiệu", macDinh: 9, min: 2, max: 50 },
    ],
    tenNgan: (ts) => `MACD ${ts.nhanh}, ${ts.cham}, ${ts.tin}`,
    tinh: (nen, ts, nc) => {
      const m = macd(dongCua(nen), ts.nhanh, ts.cham, ts.tin);
      return {
        ve: [
          // Cùng đơn vị với giá (cổ phiếu: nghìn đồng)
          { loai: "cot", ten: "Chênh", gt: m.cot, mau: (v) => (v >= 0 ? nc.mau.tang : nc.mau.giam) + "99", dinhDang: "gia" },
          { loai: "duong", ten: "MACD", gt: m.duong, mau: M.lam, dinhDang: "gia" },
          { loai: "duong", ten: "Tín hiệu", gt: m.tin, mau: M.vang, dinhDang: "gia" },
        ],
        muc: [{ gia: 0, mau: nc.mau.phu }],
      };
    },
  },
  {
    ma: "stoch",
    ten: "Stochastic",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "Vị trí giá đóng cửa trong biên độ N phiên. Trên 80 quá mua, dưới 20 quá bán; %K cắt %D là tín hiệu.",
    thamSo: [tsN(14, "Chu kỳ", 100), { khoa: "d", nhan: "Làm mượt %D", macDinh: 3, min: 1, max: 20 }],
    tenNgan: (ts) => `Stoch ${ts.n}, ${ts.d}`,
    tinh: (nen, ts, nc) => {
      const s = stochastic(nen, ts.n, ts.d);
      return {
        ve: [
          { loai: "duong", ten: "%K", gt: s.k, mau: M.lam, dinhDang: "so" },
          { loai: "duong", ten: "%D", gt: s.d, mau: M.vang, rong: 1, dinhDang: "so" },
        ],
        muc: [{ gia: 80, mau: nc.mau.giam }, { gia: 20, mau: nc.mau.tang }],
      };
    },
  },
  {
    ma: "cci",
    ten: "CCI",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "Độ lệch của giá điển hình khỏi trung bình. Trên +100 là mạnh/quá mua, dưới −100 là yếu/quá bán.",
    thamSo: [tsN(20, "Chu kỳ", 200)],
    tenNgan: ky("CCI"),
    tinh: (nen, ts, nc) => ({
      ve: [{ loai: "duong", ten: `CCI${ts.n}`, gt: cci(nen, ts.n), mau: M.lo, dinhDang: "so" }],
      muc: [{ gia: 100, mau: nc.mau.giam }, { gia: 0, mau: nc.mau.phu }, { gia: -100, mau: nc.mau.tang }],
    }),
  },
  {
    ma: "wr",
    ten: "Williams %R",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "Khoảng cách giá đóng cửa tới đỉnh N phiên, thang −100..0. Trên −20 quá mua, dưới −80 quá bán.",
    thamSo: [tsN(14, "Chu kỳ", 200)],
    tenNgan: ky("%R"),
    tinh: (nen, ts, nc) => ({
      ve: [{ loai: "duong", ten: `%R${ts.n}`, gt: williamsR(nen, ts.n), mau: M.hong, dinhDang: "so" }],
      muc: [{ gia: -20, mau: nc.mau.giam }, { gia: -80, mau: nc.mau.tang }],
    }),
  },
  {
    ma: "roc",
    ten: "ROC",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "Phần trăm thay đổi giá so với N phiên trước: đo tốc độ, cắt lên 0 là đà chuyển dương.",
    thamSo: [tsN(12, "Chu kỳ", 250)],
    tenNgan: ky("ROC"),
    tinh: (nen, ts, nc) => ({
      ve: [{ loai: "cot", ten: `ROC${ts.n}`, gt: roc(dongCua(nen), ts.n), mau: (v) => (v >= 0 ? nc.mau.tang : nc.mau.giam) + "bb", dinhDang: "pt" }],
      muc: [{ gia: 0, mau: nc.mau.phu }],
    }),
  },
  {
    ma: "adx",
    ten: "ADX / DMI",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "ADX đo độ mạnh xu hướng (trên 25 là có xu hướng rõ), +DI/−DI cho biết bên mua hay bán đang trội.",
    thamSo: [tsN(14, "Chu kỳ", 100)],
    tenNgan: ky("ADX"),
    tinh: (nen, ts, nc) => {
      const a = adx(nen, ts.n);
      return {
        ve: [
          { loai: "duong", ten: "ADX", gt: a.adx, mau: M.vang, rong: 2, dinhDang: "so" },
          { loai: "duong", ten: "+DI", gt: a.diCong, mau: nc.mau.tang, rong: 1, dinhDang: "so" },
          { loai: "duong", ten: "−DI", gt: a.diTru, mau: nc.mau.giam, rong: 1, dinhDang: "so" },
        ],
        muc: [{ gia: 25, mau: nc.mau.phu }],
      };
    },
  },
  {
    ma: "aroon",
    ten: "Aroon",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "Đo thời gian kể từ đỉnh/đáy gần nhất. Aroon lên trên 70 và trên Aroon xuống là xu hướng tăng mới.",
    thamSo: [tsN(25, "Chu kỳ", 200)],
    tenNgan: ky("Aroon"),
    tinh: (nen, ts, nc) => {
      const a = aroon(nen, ts.n);
      return {
        ve: [
          { loai: "duong", ten: "Aroon lên", gt: a.len, mau: nc.mau.tang, dinhDang: "so" },
          { loai: "duong", ten: "Aroon xuống", gt: a.xuong, mau: nc.mau.giam, dinhDang: "so" },
        ],
        muc: [{ gia: 70, mau: nc.mau.phu }, { gia: 30, mau: nc.mau.phu }],
      };
    },
  },
  {
    ma: "atr",
    ten: "ATR",
    nhom: "dao-dong",
    khung: "rieng",
    moTa: "Biên độ dao động thực trung bình mỗi phiên (cùng đơn vị giá). Dùng để đặt dừng lỗ và cỡ vị thế.",
    thamSo: [tsN(14, "Chu kỳ", 100)],
    tenNgan: ky("ATR"),
    tinh: (nen, ts) => ({ ve: [{ loai: "duong", ten: `ATR${ts.n}`, gt: atr(nen, ts.n), mau: M.cam, dinhDang: "gia" }] }),
  },
  {
    ma: "fl-xu-huong",
    ten: "FL Xu hướng",
    nhom: "dao-dong",
    khung: "rieng",
    finlo: true,
    moTa: "Điểm −100..+100 gộp giá so với EMA20, EMA20 so với EMA50, MACD và RSI. Cắt lên 0 là tín hiệu mua, cắt xuống là bán.",
    thamSo: [],
    tinh: (nen, _ts, nc) => {
      const x = flXuHuong(nen);
      return {
        ve: [{ loai: "cot", ten: "FL Xu hướng", gt: x.diem, mau: (v) => (v >= 0 ? nc.mau.tang : nc.mau.giam), dinhDang: "so" }],
        muc: [{ gia: 0, mau: nc.mau.phu }],
        moc: x.tinHieu.map((t) => ({ time: t.time, len: t.loai === "mua", mau: t.loai === "mua" ? nc.mau.tang : nc.mau.giam, chu: t.loai === "mua" ? "Mua" : "Bán" })),
      };
    },
  },

  // ================= Khối lượng =================
  {
    ma: "kl",
    ten: "Khối lượng",
    tenNgan: (ts) => `KL · TB${ts.n}`,
    nhom: "khoi-luong",
    khung: "kl",
    moTa: "Khối lượng từng phiên ở đáy biểu đồ kèm đường trung bình. Phiên vượt hẳn trung bình là có dòng tiền lớn.",
    thamSo: [tsN(20, "Trung bình KL", 200)],
    tinh: (nen, ts, nc) => ({
      ve: [
        { loai: "cot", ten: "KL", gt: nen.map((x) => x.volume), mau: (_v, i) => (nen[i].close >= nen[i].open ? nc.mau.tang : nc.mau.giam) + "55", dinhDang: "kl" },
        { loai: "duong", ten: `TB KL${ts.n}`, gt: sma(nen.map((x) => x.volume), ts.n), mau: M.vang, rong: 1, dinhDang: "kl" },
      ],
    }),
  },
  {
    ma: "obv",
    ten: "OBV",
    nhom: "khoi-luong",
    khung: "rieng",
    moTa: "Cộng dồn khối lượng phiên tăng, trừ phiên giảm. OBV đi trước giá là dấu hiệu tích luỹ hoặc phân phối.",
    thamSo: [tsN(20, "Đường trung bình", 200)],
    tenNgan: ky("OBV"),
    tinh: (nen, ts) => {
      const o = obv(nen);
      return {
        ve: [
          { loai: "duong", ten: "OBV", gt: o, mau: M.lam, dinhDang: "kl" },
          { loai: "duong", ten: `TB${ts.n}`, gt: smaChuoi(o, ts.n), mau: M.vang, rong: 1, dinhDang: "kl" },
        ],
      };
    },
  },
  {
    ma: "mfi",
    ten: "MFI",
    nhom: "khoi-luong",
    khung: "rieng",
    moTa: "Giống RSI nhưng có tính khối lượng nên phản ánh tiền vào ra. Trên 80 quá mua, dưới 20 quá bán.",
    thamSo: [tsN(14, "Chu kỳ", 100)],
    tenNgan: ky("MFI"),
    tinh: (nen, ts, nc) => ({
      ve: [{ loai: "duong", ten: `MFI${ts.n}`, gt: mfi(nen, ts.n), mau: M.lo, dinhDang: "so" }],
      muc: [{ gia: 80, mau: nc.mau.giam }, { gia: 20, mau: nc.mau.tang }],
    }),
  },
  {
    ma: "cmf",
    ten: "Chaikin Money Flow",
    nhom: "khoi-luong",
    khung: "rieng",
    moTa: "Dòng tiền N phiên theo vị trí đóng cửa trong phiên, thang −1..+1. Dương kéo dài là áp lực mua.",
    thamSo: [tsN(20, "Chu kỳ", 100)],
    tenNgan: ky("CMF"),
    tinh: (nen, ts, nc) => ({
      ve: [{ loai: "cot", ten: `CMF${ts.n}`, gt: cmf(nen, ts.n), mau: (v) => (v >= 0 ? nc.mau.tang : nc.mau.giam) + "bb", dinhDang: "so" }],
      muc: [{ gia: 0, mau: nc.mau.phu }],
    }),
  },
  {
    ma: "fl-dong-tien",
    ten: "FL Dòng tiền",
    nhom: "khoi-luong",
    khung: "rieng",
    finlo: true,
    moTa: "Tiền vào/ra N phiên theo vị trí giá đóng cửa trong phiên, có trọng số khối lượng, quy về −100..+100.",
    thamSo: [tsN(20, "Chu kỳ", 100)],
    tenNgan: ky("FL Dòng tiền"),
    tinh: (nen, ts, nc) => ({
      ve: [{ loai: "cot", ten: "FL Dòng tiền", gt: flDongTien(nen, ts.n), mau: (v) => (v >= 0 ? nc.mau.tang : nc.mau.giam) + "bb", dinhDang: "so" }],
      muc: [{ gia: 0, mau: nc.mau.phu }],
    }),
  },

  // ================= Định giá và cơ bản (chỉ cổ phiếu) =================
  {
    ma: "fl-gia-tri",
    ten: "FL Giá trị",
    nhom: "dinh-gia",
    khung: "gia",
    finlo: true,
    chiCoPhieu: true,
    can: "dinh-gia",
    moTa: "Mức giá thường lệ của chính mã theo lịch sử bội số (P/E, hoặc P/B với ngân hàng, chứng khoán, bảo hiểm, doanh nghiệp lỗ). Nền xanh là vùng rẻ, nền hồng là vùng đắt so với chính mã; hai đường chấm là mép rẻ (P20) và đắt (P80). Chỉ dùng báo cáo đã công bố tại từng phiên.",
    thamSo: [],
    tinh: (nen, _ts, nc) => {
      if (!nc.dinhGia) return null;
      const g = flGiaTri(nen, nc.dinhGia.moc, nc.dinhGia.loai, nc.dinhGia.peNganh);
      if (!g) return null;
      // Mức thường lệ = trung vị bội số của chính mã nhân EPS/BVPS hiện hành (re = neo × P20)
      const thuongLe = g.re.map((v) => (v == null ? null : (v * g.p50) / g.p20));
      return {
        ve: [
          { loai: "vung", ten: "Vùng định giá", gt: thuongLe, mauTren: nc.mau.giam, mauDuoi: nc.mau.tang },
          { loai: "duong", ten: "Đắt (P80)", gt: g.dat, mau: nc.mau.giam, rong: 1, net: "cham", nhan: "Đắt", dinhDang: "gia" },
          { loai: "duong", ten: "Thường lệ", gt: thuongLe, mau: nc.mau.chu, rong: 2, nhan: "Thường lệ", dinhDang: "gia" },
          { loai: "duong", ten: "Rẻ (P20)", gt: g.re, mau: nc.mau.tang, rong: 1, net: "cham", nhan: "Rẻ", dinhDang: "gia" },
        ],
      };
    },
  },
  {
    ma: "pe",
    ten: "P/E lịch sử",
    nhom: "dinh-gia",
    khung: "rieng",
    chiCoPhieu: true,
    can: "dinh-gia",
    moTa: "Giá / lợi nhuận mỗi cổ phiếu 4 quý tại từng phiên, kèm trung vị và vùng rẻ (P20) / đắt (P80) của chính mã.",
    thamSo: [],
    tinh: boiSoLichSu("P/E", "eps"),
  },
  {
    ma: "pb",
    ten: "P/B lịch sử",
    nhom: "dinh-gia",
    khung: "rieng",
    chiCoPhieu: true,
    can: "dinh-gia",
    moTa: "Giá / giá trị sổ sách mỗi cổ phiếu tại từng phiên, kèm trung vị và vùng rẻ/đắt. Hợp cho ngân hàng, chứng khoán.",
    thamSo: [],
    tinh: boiSoLichSu("P/B", "bvps"),
  },
  {
    ma: "gia-vs-ln",
    ten: "Giá vs Lợi nhuận",
    nhom: "dinh-gia",
    khung: "rieng",
    chiCoPhieu: true,
    can: "dinh-gia",
    moTa: "Đưa giá và lợi nhuận mỗi cổ phiếu (4 quý) về cùng mốc 100 từ N năm trước. Giá chạy trước lợi nhuận quá xa là đang được kỳ vọng cao; tụt lại phía sau là đang bị định giá thấp đi.",
    thamSo: [{ khoa: "nam", nhan: "Số năm", macDinh: 5, min: 1, max: 20 }],
    tenNgan: (ts) => `Giá vs LN ${ts.nam} năm`,
    tinh: (nen, ts, nc) => {
      if (!nc.dinhGia || nen.length === 0) return null;
      const moc = [...nc.dinhGia.moc].sort((a, b) => a.tu - b.tu);
      const tu = nen[nen.length - 1].time - ts.nam * 365 * 86400;
      let j = -1;
      const eps = nen.map((x) => {
        while (j + 1 < moc.length && moc[j + 1].tu <= x.time) j++;
        return j >= 0 ? moc[j].eps : null;
      });
      // Mốc 100: phiên đầu tiên trong khoảng xét có EPS dương
      const dau = nen.findIndex((x, i) => x.time >= tu && eps[i] != null && eps[i]! > 0);
      if (dau < 0) return null;
      const g0 = nen[dau].close;
      const e0 = eps[dau]!;
      return {
        ve: [
          { loai: "duong", ten: "Giá", gt: nen.map((x, i) => (i < dau ? null : (x.close / g0) * 100)), mau: "#3b82f6", nhan: "Giá", dinhDang: "so" },
          {
            loai: "duong",
            ten: "Lợi nhuận/CP",
            gt: eps.map((e, i) => (i < dau || e == null ? null : (e / e0) * 100)),
            mau: nc.mau.nhan,
            nhan: "LN/CP",
            dinhDang: "so",
          },
        ],
        muc: [{ gia: 100, mau: nc.mau.phu }],
      };
    },
  },
  {
    ma: "noi-bo",
    ten: "Giao dịch nội bộ",
    nhom: "dinh-gia",
    khung: "gia",
    chiCoPhieu: true,
    can: "noi-bo",
    moTa: "Dấu trên nến ở phiên lãnh đạo, cổ đông lớn mua (NB+) hoặc bán (NB−) đã thực hiện xong, kèm số cổ phiếu ròng.",
    thamSo: [],
    tinh: (nen, _ts, nc) => {
      if (!nc.noiBo || nen.length === 0) return null;
      // Gộp theo ngày giao dịch, gắn vào phiên đầu tiên từ ngày đó trở đi
      const theoNgay = new Map<string, number>();
      for (const d of nc.noiBo) theoNgay.set(d.ngay, (theoNgay.get(d.ngay) ?? 0) + (d.mua ? d.soCp : -d.soCp));
      const gon = (x: number) => Math.abs(x).toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 1 });
      const moc: Moc[] = [];
      for (const [ngay, rong] of theoNgay) {
        if (rong === 0) continue;
        const [y, m, d] = ngay.split("-").map(Number);
        const t = Date.UTC(y, m - 1, d) / 1000 - 7 * 3600;
        const phien = nen.find((x) => x.time >= t);
        if (!phien || phien.time - t > 7 * 86400) continue;
        moc.push({ time: phien.time, len: rong > 0, mau: rong > 0 ? nc.mau.tang : nc.mau.giam, chu: `NB${rong > 0 ? "+" : "−"}${gon(rong)}` });
      }
      return { ve: [], moc };
    },
  },

  // ---------------- Long/Short: chỉ tiền số (dữ liệu sàn phái sinh) ----------------
  {
    ma: "ls-tai-khoan",
    ten: "Long/Short tài khoản",
    nhom: "phai-sinh",
    khung: "rieng",
    chiTienSo: true,
    can: "phai-sinh",
    moTa: "Số tài khoản đang Long chia cho số đang Short. Trên 1: đám đông nghiêng về Long; lệch quá mạnh một phía thường là tín hiệu ngược." + PS_MO_TA,
    thamSo: [],
    tinh: (nen, _ts, nc) =>
      nc.phaiSinh
        ? {
            ve: [{ loai: "duong", ten: "Long/Short tài khoản", gt: theoNen(nen, nc.phaiSinh.lsTaiKhoan), mau: M.lam, dinhDang: "so" }],
            muc: [{ gia: 1, mau: nc.mau.phu }],
          }
        : null,
  },
  {
    ma: "ls-top",
    ten: "Long/Short top trader",
    nhom: "phai-sinh",
    khung: "rieng",
    chiTienSo: true,
    can: "phai-sinh",
    moTa: "Tỷ lệ Long/Short của 20% tài khoản ký quỹ lớn nhất: theo khối lượng vị thế (đường liền) và theo số tài khoản (đường đứt)." + PS_MO_TA,
    thamSo: [],
    tinh: (nen, _ts, nc) =>
      nc.phaiSinh
        ? {
            ve: [
              { loai: "duong", ten: "Top trader vị thế", gt: theoNen(nen, nc.phaiSinh.lsTopViThe), mau: M.cam, dinhDang: "so" },
              { loai: "duong", ten: "Top trader tài khoản", gt: theoNen(nen, nc.phaiSinh.lsTopTaiKhoan), mau: M.tim, net: "dut", rong: 1, dinhDang: "so" },
            ],
            muc: [{ gia: 1, mau: nc.mau.phu }],
          }
        : null,
  },
  {
    ma: "fl-ca-map-dam-dong",
    ten: "FL Cá mập vs Đám đông",
    nhom: "phai-sinh",
    finlo: true,
    khung: "rieng",
    chiTienSo: true,
    can: "phai-sinh",
    moTa: "So vị thế top trader với số đông tài khoản (thang log). Cột xanh: cá mập nghiêng Long mạnh hơn đám đông; cột đỏ: cá mập thận trọng hơn đám đông." + PS_MO_TA,
    thamSo: [],
    tinh: (nen, _ts, nc) => {
      if (!nc.phaiSinh) return null;
      const top = theoNen(nen, nc.phaiSinh.lsTopViThe);
      const dong = theoNen(nen, nc.phaiSinh.lsTaiKhoan);
      const gt = top.map((v, i) => {
        const d = dong[i];
        return v != null && d != null && v > 0 && d > 0 ? Math.log(v / d) * 100 : null;
      });
      return {
        ve: [{ loai: "cot", ten: "Cá mập − đám đông", gt, mau: (v) => (v >= 0 ? nc.mau.tang : nc.mau.giam), dinhDang: "so" }],
        muc: [{ gia: 0, mau: nc.mau.phu }],
      };
    },
  },
  {
    ma: "oi",
    ten: "Open Interest",
    tenNgan: (ts) => (ts.n > 0 ? `OI · MA ${ts.n}` : "OI"),
    nhom: "phai-sinh",
    khung: "rieng",
    chiTienSo: true,
    can: "phai-sinh",
    moTa: "Tổng giá trị hợp đồng đang mở (USD). OI tăng cùng giá: tiền mới vào mở vị thế; OI giảm: vị thế đang được đóng." + PS_MO_TA,
    thamSo: [{ khoa: "n", nhan: "Đường trung bình (0 = tắt)", macDinh: 20, min: 0, max: 200 }],
    tinh: (nen, ts, nc) => {
      if (!nc.phaiSinh) return null;
      const oi = theoNen(nen, nc.phaiSinh.oi);
      const ve: Ve[] = [{ loai: "duong", ten: "Open Interest", gt: oi, mau: nc.mau.nhan, dinhDang: "kl" }];
      if (ts.n > 0) ve.push({ loai: "duong", ten: `MA${ts.n} OI`, gt: smaChuoi(oi, ts.n), mau: M.xam, net: "dut", rong: 1, dinhDang: "kl" });
      return { ve };
    },
  },
  {
    ma: "oi-delta",
    ten: "OI thay đổi theo giá",
    tenNgan: ky("ΔOI", "k"),
    nhom: "phai-sinh",
    khung: "rieng",
    chiTienSo: true,
    can: "phai-sinh",
    moTa: "% thay đổi Open Interest, tô màu theo giá: xanh = OI và giá cùng tăng (Long mới vào), đỏ = OI tăng khi giá giảm (Short mới vào), xám = OI giảm (đóng vị thế)." + PS_MO_TA,
    thamSo: [{ khoa: "k", nhan: "So với bao nhiêu nến trước", macDinh: 1, min: 1, max: 50 }],
    tinh: (nen, ts, nc) => {
      if (!nc.phaiSinh) return null;
      const oi = theoNen(nen, nc.phaiSinh.oi);
      const k = ts.k;
      const gt = oi.map((v, i) => {
        const truoc = i >= k ? oi[i - k] : null;
        return v != null && truoc ? (v / truoc - 1) * 100 : null;
      });
      return {
        ve: [
          {
            loai: "cot",
            ten: "OI thay đổi",
            gt,
            mau: (v, i) => (v < 0 ? nc.mau.phu : nen[i].close >= nen[Math.max(0, i - k)].close ? nc.mau.tang : nc.mau.giam),
            dinhDang: "pt",
          },
        ],
        muc: [{ gia: 0, mau: nc.mau.phu }],
      };
    },
  },
  {
    ma: "funding",
    ten: "Funding rate",
    nhom: "phai-sinh",
    khung: "rieng",
    chiTienSo: true,
    can: "phai-sinh",
    moTa: "Phí Long trả Short mỗi kỳ (thường 8 giờ), theo %. Dương cao kéo dài: Long quá đông, dễ bị quét; âm sâu: Short quá đông, dễ bật mạnh. Có lịch sử dài hơn OI.",
    thamSo: [],
    tinh: (nen, _ts, nc) =>
      nc.phaiSinh
        ? {
            ve: [
              {
                loai: "cot",
                ten: "Funding",
                gt: theoNen(nen, nc.phaiSinh.funding),
                mau: (v) => (v >= 0 ? nc.mau.tang : nc.mau.giam),
                dinhDang: "pt4",
              },
            ],
            muc: [{ gia: 0, mau: nc.mau.phu }],
          }
        : null,
  },
  {
    ma: "premium",
    ten: "Premium hợp đồng",
    nhom: "phai-sinh",
    khung: "rieng",
    chiTienSo: true,
    can: "phai-sinh",
    moTa: "Giá hợp đồng vĩnh cửu cao hơn (dương) hay thấp hơn (âm) giá giao ngay, theo %. Premium dương lớn: phe Long đang trả giá cao để vào lệnh.",
    thamSo: [],
    tinh: (nen, _ts, nc) =>
      nc.phaiSinh
        ? {
            ve: [{ loai: "duong", ten: "Premium", gt: theoNen(nen, nc.phaiSinh.premium), mau: M.lo, dinhDang: "pt4" }],
            muc: [{ gia: 0, mau: nc.mau.phu }],
          }
        : null,
  },
  {
    ma: "taker-ls",
    ten: "Mua/bán chủ động (hợp đồng)",
    nhom: "phai-sinh",
    khung: "rieng",
    chiTienSo: true,
    can: "phai-sinh",
    moTa: "Khối lượng lệnh thị trường mua chia cho bán trên sàn phái sinh, trừ đi 1. Cột xanh: bên mua lấn át; chuỗi xanh dài thường đi cùng nhịp tăng." + PS_MO_TA,
    thamSo: [],
    tinh: (nen, _ts, nc) =>
      nc.phaiSinh
        ? {
            ve: [
              {
                loai: "cot",
                ten: "Mua/bán chủ động − 1",
                gt: theoNen(nen, nc.phaiSinh.taker).map((v) => (v == null ? null : v - 1)),
                mau: (v) => (v >= 0 ? nc.mau.tang : nc.mau.giam),
                dinhDang: "so",
              },
            ],
            muc: [{ gia: 0, mau: nc.mau.phu }],
          }
        : null,
  },
  {
    ma: "fl-don-bay",
    ten: "FL Nhiệt đòn bẩy",
    tenNgan: ky("FL Nhiệt đòn bẩy"),
    nhom: "phai-sinh",
    finlo: true,
    khung: "rieng",
    chiTienSo: true,
    can: "phai-sinh",
    moTa: "Gộp funding, tốc độ tăng Open Interest và vị thế top trader thành thang 0–100. Trên 80: đòn bẩy Long quá nóng, dễ có cú quét Long; dưới 20: Short quá đông, dễ bật mạnh." + PS_MO_TA,
    thamSo: [tsN(50, "Cửa sổ so sánh (nến)", 300)],
    tinh: (nen, ts, nc) => {
      if (!nc.phaiSinh) return null;
      const n = ts.n;
      const f = theoNen(nen, nc.phaiSinh.funding);
      const oi = theoNen(nen, nc.phaiSinh.oi);
      const k = Math.max(1, Math.round(n / 5));
      const oiPt = oi.map((v, i) => {
        const truoc = i >= k ? oi[i - k] : null;
        return v != null && truoc ? v / truoc - 1 : null;
      });
      const top = theoNen(nen, nc.phaiSinh.lsTopViThe).map((v) => (v != null && v > 0 ? Math.log(v) : null));
      const gt = nen.map((_, i) => {
        const z = [diemZ(f, i, n), diemZ(oiPt, i, n), diemZ(top, i, n)].filter((x): x is number => x != null);
        return z.length < 2 ? null : Math.max(0, Math.min(100, 50 + (20 * z.reduce((t, x) => t + x, 0)) / z.length));
      });
      return {
        ve: [{ loai: "duong", ten: "Nhiệt đòn bẩy", gt, mau: nc.mau.nhan, dinhDang: "so" }],
        muc: [
          { gia: 80, mau: nc.mau.giam },
          { gia: 50, mau: nc.mau.phu },
          { gia: 20, mau: nc.mau.tang },
        ],
      };
    },
  },

  // ---------------- Lệnh chủ động trên sàn giao ngay: chỉ tiền số ----------------
  {
    ma: "cvd",
    ten: "CVD (delta tích luỹ)",
    nhom: "khoi-luong",
    khung: "rieng",
    chiTienSo: true,
    moTa: "Cộng dồn khối lượng mua chủ động trừ bán chủ động trên sàn giao ngay. Giá tăng mà CVD đi xuống: lực mua yếu, dễ đảo chiều (phân kỳ).",
    thamSo: [],
    tinh: (nen) => {
      if (!nen.some((x) => x.muaCD != null)) return null;
      let cong = 0;
      const gt = nen.map((x) => (x.muaCD == null ? null : (cong += 2 * x.muaCD - x.volume)));
      return { ve: [{ loai: "duong", ten: "CVD", gt, mau: M.lam, dinhDang: "kl" }] };
    },
  },
  {
    ma: "delta-kl",
    ten: "Delta khối lượng",
    nhom: "khoi-luong",
    khung: "rieng",
    chiTienSo: true,
    moTa: "Khối lượng mua chủ động trừ bán chủ động trong từng nến trên sàn giao ngay: cột xanh bên mua chủ động thắng thế, cột đỏ bên bán.",
    thamSo: [],
    tinh: (nen, _ts, nc) => {
      if (!nen.some((x) => x.muaCD != null)) return null;
      return {
        ve: [
          {
            loai: "cot",
            ten: "Delta",
            gt: nen.map((x) => (x.muaCD == null ? null : 2 * x.muaCD - x.volume)),
            mau: (v) => (v >= 0 ? nc.mau.tang : nc.mau.giam),
            dinhDang: "kl",
          },
        ],
        muc: [{ gia: 0, mau: nc.mau.phu }],
      };
    },
  },
];

export const TIM_CHI_BAO = new Map(CHI_BAO.map((c) => [c.ma, c]));

export const thamSoMacDinh = (c: ChiBao) => Object.fromEntries(c.thamSo.map((t) => [t.khoa, t.macDinh]));

// Bộ chỉ báo mẫu: bật một chạm
export const BO_MAU: { ten: string; moTa: string; ds: string[] }[] = [
  { ten: "Xu hướng", moTa: "MA 20/50/200, ADX và khối lượng", ds: ["ma", "adx", "kl"] },
  { ten: "Động lượng", moTa: "EMA 9/21/50, RSI, MACD", ds: ["ema", "rsi", "macd", "kl"] },
  { ten: "Đảo chiều", moTa: "Bollinger, RSI, Stochastic", ds: ["bb", "rsi", "stoch", "kl"] },
  { ten: "Dòng tiền", moTa: "Khối lượng, OBV, MFI, CMF", ds: ["kl", "obv", "mfi", "cmf"] },
  { ten: "Theo sóng", moTa: "SuperTrend, Ichimoku, ADX", ds: ["supertrend", "ichimoku", "adx", "kl"] },
  { ten: "Bộ Finlo", moTa: "Các chỉ báo riêng của Finlo", ds: ["fl-vung-gia", "fl-ht-kc", "fl-xu-huong", "fl-dong-tien", "kl"] },
  { ten: "Định giá", moTa: "FL Giá trị, Giá vs Lợi nhuận, P/E lịch sử, nội bộ", ds: ["fl-gia-tri", "gia-vs-ln", "pe", "noi-bo", "kl"] },
  { ten: "Long/Short", moTa: "Top trader, Open Interest, funding, FL Nhiệt đòn bẩy", ds: ["ls-top", "oi-delta", "funding", "fl-don-bay"] },
  { ten: "Lực mua bán", moTa: "CVD, delta khối lượng, mua/bán chủ động trên hợp đồng", ds: ["cvd", "delta-kl", "taker-ls", "kl"] },
];
