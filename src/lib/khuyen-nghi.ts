import duLieu from "@/data/khuyen-nghi.json";

// Báo cáo khuyến nghị của các công ty chứng khoán (thu thập bởi scripts/khuyen-nghi.mjs, nguồn Vietstock)
// và kết quả chấm theo giá thực tế: vào lệnh ở giá mở cửa phiên sau ngày phát hành, kỳ hạn 12 tháng,
// đạt khi giá chạm mục tiêu, cắt lỗ khi đi ngược 15%.

export type Nhom = "mua" | "giu" | "ban";
export type TrangThai = "dat" | "cat-lo" | "het-han" | "dang";

export type KetQua = {
  nhom: Nhom;
  trangThai: TrangThai;
  upside: number | null; // % mục tiêu so với giá lúc phát hành
  ngayKet: string;
  soNgay: number;
  loiNhuan: number | null; // % theo hướng khuyến nghị (bán: giá giảm là lãi)
  vuotChiSo: number | null; // % lợi nhuận trừ VN-Index cùng kỳ
};

export type BaoCaoKN = {
  id: number;
  ma: string;
  ctck: string;
  ngay: string;
  tieuDe: string;
  khuyenNghi: string | null;
  nhom: Nhom | null;
  gia: number | null; // giá mục tiêu, đồng
  upside: number | null; // % ghi trong báo cáo (nếu có)
  giaPH?: number | null; // giá đóng cửa thật ngày phát hành, đồng
  kq?: KetQua | null;
};

type DuLieu = { capNhat: string; kyHan?: number; catLo?: number; bao: BaoCaoKN[] };
const dl = duLieu as DuLieu;

export const KY_HAN = dl.kyHan ?? 365;
export const CAT_LO = dl.catLo ?? 15;
export const CAP_NHAT = dl.capNhat;
export const BAO_CAO: BaoCaoKN[] = dl.bao;

export const nhomCua = (b: BaoCaoKN): Nhom | null => b.nhom ?? b.kq?.nhom ?? null;
export const linkGoc = (b: BaoCaoKN) => `https://finance.vietstock.vn/bao-cao-phan-tich/${b.id}/x.htm`;
export const daKet = (b: BaoCaoKN) => !!b.kq && b.kq.trangThai !== "dang";

export const TEN_NHOM: Record<Nhom, string> = { mua: "Mua", giu: "Nắm giữ", ban: "Bán" };
export const TEN_TRANG_THAI: Record<TrangThai, string> = {
  dat: "Đạt mục tiêu",
  "cat-lo": "Cắt lỗ",
  "het-han": "Hết 12 tháng",
  dang: "Đang theo dõi",
};

const tb = (ds: number[]) => (ds.length ? ds.reduce((s, x) => s + x, 0) / ds.length : null);
export const trungVi = (ds: number[]) => {
  if (!ds.length) return null;
  const s = [...ds].sort((a, b) => a - b);
  const g = Math.floor(s.length / 2);
  return s.length % 2 ? s[g] : (s[g - 1] + s[g]) / 2;
};

export type ThongKe = {
  soBao: number;
  soCoMucTieu: number; // khuyến nghị mua/bán có thể chấm
  daKet: number;
  dat: number;
  catLo: number;
  hetHan: number;
  tyLeDat: number | null; // % trên số đã kết thúc
  loiNhuanTB: number | null; // % bình quân các khuyến nghị đã kết thúc
  vuotChiSoTB: number | null;
  soNgayDatTB: number | null;
  upsideTB: number | null; // mức lạc quan bình quân
  diem: number | null; // 0–100, cần tối thiểu 10 khuyến nghị đã kết thúc
};

// Chỉ chấm khuyến nghị mua/bán (nắm giữ không có hướng để thắng thua)
export function thongKe(ds: BaoCaoKN[]): ThongKe {
  const coHuong = ds.filter((b) => b.kq && b.kq.nhom !== "giu");
  const ket = coHuong.filter(daKet);
  const dat = ket.filter((b) => b.kq!.trangThai === "dat").length;
  const catLo = ket.filter((b) => b.kq!.trangThai === "cat-lo").length;
  const so = (f: (b: BaoCaoKN) => number | null | undefined, tu = ket) =>
    tu.map(f).filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  const tyLeDat = ket.length ? (dat / ket.length) * 100 : null;
  const vuot = tb(so((b) => b.kq!.vuotChiSo));
  // Điểm: 60% tỷ lệ đạt mục tiêu + 40% mức vượt VN-Index (−20% → 0, +20% → trọn điểm)
  const diem =
    ket.length >= 10 && tyLeDat != null
      ? Math.round(60 * (tyLeDat / 100) + 40 * Math.min(1, Math.max(0, ((vuot ?? 0) + 20) / 40)))
      : null;
  return {
    soBao: ds.length,
    soCoMucTieu: coHuong.length,
    daKet: ket.length,
    dat,
    catLo,
    hetHan: ket.length - dat - catLo,
    tyLeDat,
    loiNhuanTB: tb(so((b) => b.kq!.loiNhuan)),
    vuotChiSoTB: vuot,
    soNgayDatTB: tb(so((b) => b.kq!.soNgay, ket.filter((b) => b.kq!.trangThai === "dat"))),
    upsideTB: tb(so((b) => b.kq!.upside, coHuong)),
    diem,
  };
}

export function theoCtck() {
  const nhom = new Map<string, BaoCaoKN[]>();
  for (const b of BAO_CAO) nhom.set(b.ctck, [...(nhom.get(b.ctck) ?? []), b]);
  return [...nhom.entries()]
    .map(([ctck, ds]) => ({ ctck, ...thongKe(ds) }))
    .sort((a, b) => (b.diem ?? -1) - (a.diem ?? -1) || b.soBao - a.soBao);
}

// Đồng thuận gần đây cho một mã: các báo cáo có giá mục tiêu trong N ngày, mỗi CTCK lấy báo cáo mới nhất
export function dongThuan(ma: string, soNgay = 180) {
  const moc = new Date(Date.now() - soNgay * 86400_000).toISOString().slice(0, 10);
  const daCo = new Set<string>();
  const ds = BAO_CAO.filter((b) => b.ma === ma && b.ngay >= moc && b.gia).filter((b) => {
    if (daCo.has(b.ctck)) return false;
    daCo.add(b.ctck);
    return true;
  });
  const dem = { mua: 0, giu: 0, ban: 0 };
  for (const b of ds) {
    const n = nhomCua(b);
    if (n) dem[n]++;
  }
  return { ds, dem, giaTV: trungVi(ds.map((b) => b.gia!)), giaCao: ds.length ? Math.max(...ds.map((b) => b.gia!)) : null, giaThap: ds.length ? Math.min(...ds.map((b) => b.gia!)) : null };
}

// Mã được nhiều CTCK khuyến nghị nhất gần đây
export function maNoiBat(soNgay = 90, so = 12) {
  const moc = new Date(Date.now() - soNgay * 86400_000).toISOString().slice(0, 10);
  const dem = new Map<string, Set<string>>();
  for (const b of BAO_CAO) if (b.ngay >= moc && b.gia) dem.set(b.ma, (dem.get(b.ma) ?? new Set()).add(b.ctck));
  return [...dem.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, so)
    .map(([ma]) => ({ ma, ...dongThuan(ma, soNgay) }));
}
