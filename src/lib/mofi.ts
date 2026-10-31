// Lấy dữ liệu thị trường từ kho JSON của Mofi (data.mofi.vn).
// Chỉ chạy phía server: trình duyệt không gọi thẳng được vì data.mofi.vn chưa mở CORS.
// Mỗi hàm public được cache bằng "use cache" + cacheLife("minutes"): làm mới khoảng mỗi phút.

import { cacheLife } from "next/cache";

const BASE = "https://data.mofi.vn";

async function layJson<T>(path: string): Promise<T> {
  // Thử lại 1 lần khi lỗi mạng (kết nối tới Mofi đôi khi bị rớt)
  for (let lan = 1; ; lan++) {
    try {
      const res = await fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`Mofi ${path}: HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      if (lan >= 2) throw e;
    }
  }
}

// ---- Kiểu dữ liệu thô từ Mofi ----

type NenTho = {
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
};

type GiaMoiNhatTho = {
  meta: { asOf: string };
  latest: Record<
    string,
    { close: number; change: number; changePct: number; volume: number; value: number; tradeDate: string }
  >;
};

type CongTyTho = {
  companies: {
    sym: string;
    exch: string;
    name: string;
    sectorVi: string | null;
    address: string | null;
    web: string | null;
    director: string | null;
    charterCapital: number | null;
    outstandingShares: number | null;
    firstTradeDate: string | null;
  }[];
};

type ChiSoTho = {
  meta: { asOf: string };
  indices: Record<string, NenTho & { name: string; chuaChot?: string }>;
};

// ---- Kiểu dữ liệu Finlo dùng ----

export type CoPhieu = {
  ma: string;
  ten: string;
  san: string;
  nganh: string | null;
  gia: number;
  thayDoi: number;
  phanTram: number;
  khoiLuong: number;
  giaTri: number;
  vonHoa: number | null;
  // Từ ảnh chụp bảng giá trong phiên (null khi chưa có ảnh chụp cho mã)
  thamChieu: number | null;
  tran: number | null;
  giaSan: number | null;
  giaTB: number | null;
  nnMua: number | null; // giá trị nước ngoài mua, triệu đồng
  nnBan: number | null;
  muaCD: number | null; // khối lượng mua chủ động
  banCD: number | null;
};

// Đợt giao dịch theo ảnh chụp: ATO, LO (liên tục), Break (nghỉ trưa), ATC, PT (thoả thuận), C (đóng cửa)
export type Phien = { ngay: string; gio: string; dot: string; luc: number };

export type BangGia = { capNhat: string; phien: Phien | null; coPhieu: CoPhieu[] };

export type ChiSo = {
  ma: string;
  ten: string;
  diem: number;
  thayDoi: number;
  phanTram: number;
  lichSu: number[]; // điểm đóng cửa ~3 tháng gần nhất, để vẽ đường nhỏ
  tangGiam: { tang: number; giam: number; dung: number } | null; // số mã trong rổ, theo ảnh chụp phiên
};

export type HoSo = {
  diaChi: string | null;
  website: string | null;
  lanhDao: string | null;
  vonDieuLe: number | null;
  soCoPhieu: number | null;
  ngayGiaoDichDau: string | null;
};

export type Diem = { time: number; value: number };

export type TienSo = { ma: string; ten: string; gia: number; phanTram: number; lichSu: Diem[] };

export type TienSoTop = { hang: number; ma: string; ten: string; gia: number; vonHoa: number; thiPhan: number };

export type BangTienSo = { capNhat: string; tongVonHoa: number; ds: TienSoTop[] };

export type GiaVang = { mua: number | null; ban: number };

export type ThuongHieuVang = {
  ma: string;
  ten: string;
  tenDayDu: string;
  nguon: string;
  capNhat: string | null;
  gia: Record<string, GiaVang>;
  ghiChu: string | null;
};

export type BangVang = {
  capNhat: string;
  sanPham: { ma: string; ten: string; tuoi: string }[];
  thuongHieu: ThuongHieuVang[];
  theGioi: { usdOz: number; tyGia: number; vndLuong: number; capNhat: string };
  // Giá bán vàng miếng 1 lượng theo ngày, mỗi đường là một thương hiệu
  lichSu: { ma: string; ten: string; diem: { time: string; value: number }[] }[];
};

export type Nen = { time: number; open: number; high: number; low: number; close: number; volume: number };

// ---- Hàm lấy dữ liệu ----

// Cache ngắn cho dữ liệu trong phiên: ảnh chụp đổi mỗi phút
const MOT_PHUT = { stale: 30, revalidate: 30, expire: 600 };

// Bảng giá: giá cuối ngày làm nền, phủ lên bằng ảnh chụp mới nhất trong phiên (mỗi phút)
export async function layBangGia(): Promise<BangGia> {
  "use cache";
  cacheLife(MOT_PHUT);
  const [{ ngayGiaoDich, ...goc }, anh] = await Promise.all([layBangGiaGoc(), layAnhChupPhien().catch(() => null)]);
  // Ảnh chụp cũ hơn dữ liệu cuối ngày (mofi thiếu file hôm nay) thì bỏ qua
  if (!anh || anh.phien.ngay < ngayGiaoDich) return { ...goc, phien: null };

  const coPhieu = goc.coPhieu.map((cp) => {
    const x = anh.theoMa.get(cp.ma);
    if (!x) return cp;
    // Đầu phiên ATO chưa khớp thì giá = 0: giữ giá tham chiếu
    const gia = x.gia > 0 ? x.gia : x.tc;
    return {
      ...cp,
      gia,
      thayDoi: gia - x.tc,
      phanTram: x.tc ? (gia / x.tc - 1) * 100 : 0,
      khoiLuong: x.kl,
      giaTri: x.gt,
      vonHoa: cp.vonHoa != null && cp.gia ? (cp.vonHoa / cp.gia) * gia : null,
      thamChieu: x.tc,
      tran: x.tran,
      giaSan: x.san,
      giaTB: x.tb || null,
      nnMua: x.nnM,
      nnBan: x.nnB,
      muaCD: x.buV,
      banCD: x.sdV,
    };
  });
  coPhieu.sort((a, b) => b.giaTri - a.giaTri);
  return { capNhat: new Date(anh.phien.luc).toISOString(), phien: anh.phien, coPhieu };
}

type AnhChupTho = {
  ngay: string;
  hhmm: string;
  dot: string;
  ts: number;
  ma: string[];
  gia: number[];
  tc: number[];
  tran: number[];
  gsan: number[];
  kl: number[];
  gt: number[];
  nnM: number[];
  nnB: number[];
  buV: number[];
  sdV: number[];
  tb: number[];
};

// Giờ Việt Nam hiện tại: ngày (YYYY-MM-DD), thứ trong tuần (0 = CN), số phút từ 0h
function gioVietNam(luc = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    })
      .formatToParts(luc)
      .map((x) => [x.type, x.value]),
  );
  const thu = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { ngay: `${p.year}-${p.month}-${p.day}`, thu, phut: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}

const PHIEN_SANG = [540, 690]; // 09:00 – 11:30
const PHIEN_CHIEU = [780, 930]; // 13:00 – 15:30 (gồm ATC, thoả thuận, sau giờ)

// Ảnh chụp mới nhất: mofi lưu mỗi phút một file realtime/<thư mục>/<ngày>/<HHMM>.json trong giờ giao dịch.
// Dò từ phút gần nhất lùi về; ngoài giờ thì lấy 15:30 của ngày giao dịch gần nhất.
async function timAnhChup<T>(thuMuc: "bang" | "chi-so"): Promise<T | null> {
  const thu = async (ngay: string, phut: number) => {
    const hhmm = `${String(Math.floor(phut / 60)).padStart(2, "0")}${String(phut % 60).padStart(2, "0")}`;
    const res = await fetch(`${BASE}/realtime/${thuMuc}/${ngay}/${hhmm}.json`, { signal: AbortSignal.timeout(8000) });
    return res.ok ? ((await res.json()) as T) : null;
  };

  const bay = gioVietNam();
  let ngay = bay.ngay;
  let t = bay.phut - 1; // file của phút hiện tại có thể chưa ghi xong
  let tho: T | null = null;

  for (let lui = 0; lui < 8 && !tho; lui++) {
    const nghiCuoiTuan = new Date(`${ngay}T00:00:00Z`).getUTCDay() % 6 === 0;
    if (!nghiCuoiTuan && t >= PHIEN_SANG[0]) {
      const moc = t > PHIEN_CHIEU[1] ? PHIEN_CHIEU[1] : t > PHIEN_SANG[1] && t < PHIEN_CHIEU[0] ? PHIEN_SANG[1] : t;
      // Thử vài phút gần nhất (file có thể ghi trễ)
      for (let i = 0; i < 4 && !tho; i++) tho = await thu(ngay, moc - i);
    }
    if (!tho) {
      // Lùi về 15:30 của ngày trước
      const truoc = new Date(`${ngay}T00:00:00Z`);
      truoc.setUTCDate(truoc.getUTCDate() - 1);
      ngay = truoc.toISOString().slice(0, 10);
      t = PHIEN_CHIEU[1];
    }
  }
  return tho;
}

export async function layAnhChupPhien() {
  "use cache";
  cacheLife(MOT_PHUT);
  const tho = await timAnhChup<AnhChupTho>("bang");
  if (!tho) return null;

  const theoMa = new Map(
    tho.ma.map((ma, i) => [
      ma,
      {
        gia: tho.gia[i],
        tc: tho.tc[i],
        tran: tho.tran[i],
        san: tho.gsan[i],
        kl: tho.kl[i],
        gt: tho.gt[i],
        nnM: tho.nnM[i],
        nnB: tho.nnB[i],
        buV: tho.buV[i],
        sdV: tho.sdV[i],
        tb: tho.tb?.[i] ?? 0,
      },
    ]),
  );
  const phien: Phien = {
    ngay: tho.ngay,
    gio: `${tho.hhmm.slice(0, 2)}:${tho.hhmm.slice(2)}`,
    dot: tho.dot,
    luc: tho.ts,
  };
  return { phien, theoMa };
}

// Giá cuối ngày (tổng hợp) cùng hồ sơ công ty
async function layBangGiaGoc(): Promise<Omit<BangGia, "phien"> & { ngayGiaoDich: string }> {
  "use cache";
  cacheLife("minutes");
  const [gia, congTy] = await Promise.all([
    layJson<GiaMoiNhatTho>("tong-hop/gia-moi-nhat.json"),
    layJson<CongTyTho>("tong-hop/cong-ty.json"),
  ]);
  const hoSo = new Map(congTy.companies.map((c) => [c.sym, c]));

  const coPhieu = Object.entries(gia.latest).map(([ma, g]) => {
    const ct = hoSo.get(ma);
    return {
      ma,
      ten: ct?.name ?? ma,
      san: ct?.exch ?? "",
      nganh: ct?.sectorVi ?? null,
      gia: g.close,
      thayDoi: g.change,
      phanTram: g.changePct,
      khoiLuong: g.volume,
      giaTri: g.value,
      vonHoa: ct?.outstandingShares ? ct.outstandingShares * g.close : null,
      thamChieu: null,
      tran: null,
      giaSan: null,
      giaTB: null,
      nnMua: null,
      nnBan: null,
      muaCD: null,
      banCD: null,
    };
  });
  coPhieu.sort((a, b) => b.giaTri - a.giaTri);
  // Ngày giao dịch mới nhất có trong dữ liệu cuối ngày
  const ngayGiaoDich = Object.values(gia.latest).reduce((m, g) => (g.tradeDate > m ? g.tradeDate : m), "");

  return { capNhat: gia.meta.asOf, coPhieu, ngayGiaoDich };
}

type AnhChupChiSoTho = {
  ngay: string;
  ds: { ma: string; gia: number; tc: number; tang: number; giam: number; dung: number }[];
};

// Tên chỉ số trong ảnh chụp khác khoá trong chi-so.json
const MA_CHI_SO_ANH: Record<string, string> = { HNXIndex: "HNX", UpcomIndex: "UPCOM", UPCOMINDEX: "UPCOM" };

// Điểm chỉ số được Mofi lưu nhân 1000 (1761870 = 1.761,87 điểm).
// Trong phiên, điểm hiện tại lấy từ ảnh chụp mỗi phút (kèm số mã tăng/giảm/đứng của rổ).
export async function layChiSo(): Promise<ChiSo[]> {
  "use cache";
  cacheLife(MOT_PHUT);
  const [data, anh] = await Promise.all([
    layJson<ChiSoTho>("tong-hop/chi-so.json"),
    timAnhChup<AnhChupChiSoTho>("chi-so").catch(() => null),
  ]);
  const theoMa = new Map((anh?.ds ?? []).map((x) => [MA_CHI_SO_ANH[x.ma] ?? x.ma.toUpperCase(), x]));
  return Object.entries(data.indices).map(([ma, cs]) => {
    const n = cs.c.length;
    let diem = cs.c[n - 1] / 1000;
    let truoc = cs.c[n - 2] / 1000;
    const x = theoMa.get(ma);
    const coAnh = anh && x && x.gia > 0 && anh.ngay >= (cs.chuaChot ?? "");
    if (coAnh) {
      diem = x.gia;
      truoc = x.tc;
    }
    const lichSu = cs.c.slice(-60).map((c) => c / 1000);
    if (coAnh) lichSu[lichSu.length - 1] = diem;
    return {
      ma,
      ten: cs.name,
      diem,
      thayDoi: diem - truoc,
      phanTram: ((diem - truoc) / truoc) * 100,
      lichSu,
      tangGiam: coAnh ? { tang: x.tang, giam: x.giam, dung: x.dung } : null,
    };
  });
}

export async function layHoSo(ma: string): Promise<HoSo | null> {
  "use cache";
  cacheLife("days");
  const { companies } = await layJson<CongTyTho>("tong-hop/cong-ty.json");
  const ct = companies.find((c) => c.sym === ma);
  if (!ct) return null;
  return {
    diaChi: ct.address,
    website: ct.web,
    lanhDao: ct.director,
    vonDieuLe: ct.charterCapital,
    soCoPhieu: ct.outstandingShares,
    ngayGiaoDichDau: ct.firstTradeDate,
  };
}

const TIEN_SO = [
  { ma: "BTC", ten: "Bitcoin" },
  { ma: "ETH", ten: "Ethereum" },
];

export async function layTienSo(): Promise<TienSo[]> {
  "use cache";
  cacheLife("minutes");
  return Promise.all(
    TIEN_SO.map(async ({ ma, ten }) => {
      const d = await layJson<NenTho>(`crypto/d/${ma}-usd.json`);
      const n = d.c.length;
      return {
        ma,
        ten,
        gia: d.c[n - 1],
        phanTram: ((d.c[n - 1] - d.c[n - 2]) / d.c[n - 2]) * 100,
        lichSu: d.t.map((time, i) => ({ time, value: d.c[i] })),
      };
    }),
  );
}

export async function layNen(ma: string): Promise<Nen[]> {
  "use cache";
  cacheLife("minutes");
  const d = await layJson<NenTho>(`spot/d/${encodeURIComponent(ma)}.json`);
  return d.t.map((time, i) => ({
    time,
    open: d.o[i],
    high: d.h[i],
    low: d.l[i],
    close: d.c[i],
    volume: d.v[i],
  }));
}

// ---- Tài sản số: xếp hạng theo vốn hoá (nguồn CoinGecko qua Mofi) ----

type VonHoaTho = {
  keoLuc: string;
  ma: Record<string, { id: string; gia: number; vonHoa: number; hang: number | null }[]>;
};

// "binancecoin" -> "Binancecoin", "usd-coin" -> "Usd Coin"
const tenTuId = (id: string) => id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export async function layBangTienSo(soLuong = 30): Promise<BangTienSo> {
  "use cache";
  cacheLife("minutes");
  const data = await layJson<VonHoaTho>("crypto/von-hoa/moi-nhat.json");
  // Mỗi ký hiệu có thể trùng nhiều đồng; lấy đồng đầu tiên có thứ hạng
  const coHang = Object.entries(data.ma)
    .map(([ma, ds]) => ({ ma, ...ds[0] }))
    .filter((x): x is typeof x & { hang: number } => x.hang != null)
    .sort((a, b) => a.hang - b.hang);
  const tongVonHoa = coHang.reduce((s, x) => s + x.vonHoa, 0);
  return {
    capNhat: data.keoLuc,
    tongVonHoa,
    ds: coHang.slice(0, soLuong).map((x) => ({
      hang: x.hang,
      ma: x.ma,
      ten: tenTuId(x.id),
      gia: x.gia,
      vonHoa: x.vonHoa,
      thiPhan: (x.vonHoa / tongVonHoa) * 100,
    })),
  };
}

// ---- Kim loại quý ----

type VangMoiNhatTho = {
  keoLuc: string;
  sanPham: { ma: string; ten: string; tuoi: string }[];
  thuongHieu: {
    ma: string;
    ten: string;
    tenDayDu: string;
    nguon: { ten: string; url: string; capNhat: string | null };
    gia: Record<string, { mua: number | null; ban: number }>;
    ghiChu: string | null;
  }[];
  theGioi: { usdOz: number; tyGia: number; vndLuong: number; capNhat: string };
};

type VangLichSuTho = { ngay: string[]; gia: Record<string, Record<string, (number | null)[]>> };

export async function layBangVang(): Promise<BangVang> {
  "use cache";
  cacheLife("minutes");
  const [moi, lichSu] = await Promise.all([
    layJson<VangMoiNhatTho>("vang/moi-nhat.json"),
    layJson<VangLichSuTho>("vang/lich-su.json"),
  ]);

  // Bỏ thương hiệu không đọc được giá lượt này (gia rỗng)
  const thuongHieu = moi.thuongHieu
    .filter((th) => Object.keys(th.gia).length > 0)
    .map((th) => ({
      ma: th.ma,
      ten: th.ten,
      tenDayDu: th.tenDayDu,
      nguon: th.nguon.url,
      capNhat: th.nguon.capNhat,
      gia: th.gia,
      ghiChu: th.ghiChu,
    }));

  const tenTheoMa = new Map(moi.thuongHieu.map((th) => [th.ma, th.ten]));
  const duong = Object.entries(lichSu.gia)
    .filter(([, sp]) => sp["mieng-luong"])
    .map(([ma, sp]) => ({
      ma,
      ten: ma === "the-gioi" ? "Thế giới (quy đổi)" : (tenTheoMa.get(ma) ?? ma),
      diem: sp["mieng-luong"].flatMap((v, i) => (v == null ? [] : [{ time: lichSu.ngay[i], value: v }])),
    }));

  return {
    capNhat: moi.keoLuc,
    sanPham: moi.sanPham,
    thuongHieu,
    theGioi: moi.theGioi,
    lichSu: duong,
  };
}

// ---- Báo cáo tài chính (nguồn VNDirect qua Mofi), đơn vị triệu đồng ----

export type NhomBaoCao = "kqkd" | "can_doi" | "lctt";

export type MucBaoCao = {
  ten: string;
  nhom: NhomBaoCao;
  cap: number; // 0: tổng, 1: mục chính, 2+: mục con
  q: (number | null)[]; // theo thứ tự kỳ trong BaoCao.quy (cũ -> mới)
  n: (number | null)[]; // theo thứ tự kỳ trong BaoCao.nam
};

export type BaoCao = {
  loai: string; // "thuong" | "ngan_hang" | "chung_khoan" | ...
  quy: string[]; // nhãn kỳ, ví dụ "Q2/2026"
  quyCongBo: string[]; // ngày công bố báo cáo từng quý (YYYY-MM-DD), dùng để không vẽ số tương lai vào quá khứ
  nam: string[]; // ví dụ "2025"
  namCongBo: string[]; // ngày coi như đã công bố báo cáo năm (YYYY-MM-DD)
  muc: MucBaoCao[];
};

type BaoCaoTho = {
  loai: string;
  quy: { nam: number; q: number; ky: string; congBo?: string | null }[];
  nam: { nam: number; ky: string; congBo?: string | null; cbThat?: number }[];
  muc: { ten: string; nhom: NhomBaoCao; cap: number; q?: (number | null)[]; n?: (number | null)[] }[];
};

// Báo cáo chỉ đổi mỗi quý nên cache theo giờ; mã không có báo cáo (ETF, chứng quyền…) trả null
export async function layBaoCao(ma: string): Promise<BaoCao | null> {
  "use cache";
  cacheLife("hours");
  let tho: BaoCaoTho;
  try {
    tho = await layJson<BaoCaoTho>(`financial/bao-cao/${encodeURIComponent(ma)}.json`);
  } catch {
    return null;
  }
  const soQuy = tho.quy.length;
  const soNam = tho.nam.length;
  const chuan = (a: (number | null)[] | undefined, dai: number) =>
    Array.from({ length: dai }, (_, i) => (typeof a?.[i] === "number" ? a[i] : null));
  return {
    loai: tho.loai,
    quy: tho.quy.map((k) => `Q${k.q}/${k.nam}`),
    // Thiếu ngày công bố thì coi như công bố 45 ngày sau khi hết quý (hạn nộp báo cáo quý)
    quyCongBo: tho.quy.map((k) => {
      if (k.congBo) return k.congBo;
      const d = new Date(`${k.ky}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 45);
      return d.toISOString().slice(0, 10);
    }),
    nam: tho.nam.map((k) => String(k.nam)),
    // Năm cũ chỉ có ngày nhập liệu (không phải ngày công bố thật): coi như công bố 90 ngày sau khi hết năm (hạn nộp báo cáo kiểm toán)
    namCongBo: tho.nam.map((k) => {
      if (k.congBo && k.cbThat) return k.congBo;
      const d = new Date(`${k.ky}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 90);
      return d.toISOString().slice(0, 10);
    }),
    muc: tho.muc.map((m) => ({
      ten: m.ten.replace(/\s+/g, " ").trim(),
      nhom: m.nhom,
      cap: m.cap,
      q: chuan(m.q, soQuy),
      n: chuan(m.n, soNam),
    })),
  };
}

// ---- Lãi suất tiết kiệm các ngân hàng ----

export type BangLaiSuat = {
  capNhat: string;
  coSo: string;
  kyHan: { ma: string; ngan: string }[];
  nganHang: {
    ma: string;
    ten: string;
    khoi: string;
    maCk: string | null;
    ls: Record<string, number>;
    nguon: string;
    ngayDoi: string | null;
  }[];
};

type LaiSuatTho = {
  keoLuc: string;
  coSo: string;
  kyHan: { ma: string; ngan: string }[];
  nganHang: {
    ma: string;
    ten: string;
    khoi: string;
    maCk: string | null;
    ls: Record<string, number>;
    nguon: { url: string };
    ngayDoi: string | null;
  }[];
};

export async function layLaiSuat(): Promise<BangLaiSuat> {
  "use cache";
  cacheLife("hours");
  const tho = await layJson<LaiSuatTho>("lai-suat/moi-nhat.json");
  return {
    capNhat: tho.keoLuc,
    coSo: tho.coSo,
    kyHan: tho.kyHan.map((k) => ({ ma: k.ma, ngan: k.ngan })),
    nganHang: tho.nganHang.map((b) => ({
      ma: b.ma,
      ten: b.ten,
      khoi: b.khoi,
      maCk: b.maCk,
      ls: b.ls,
      nguon: b.nguon.url,
      ngayDoi: b.ngayDoi,
    })),
  };
}

// ---- Chuỗi vĩ mô (World Bank, IMF, Cục Thống kê, NHNN… qua Mofi) ----

export type ChuoiViMo = {
  ma: string;
  ten: string;
  donVi: string;
  tanSuat: "nam" | "quy" | "thang" | "ngay";
  nguon: string;
  ky: string[];
  gt: (number | null)[];
};

type ChuoiViMoTho = Omit<ChuoiViMo, "nguon"> & { nguon: { ten: string } };

export async function layViMo(ma: string): Promise<ChuoiViMo | null> {
  "use cache";
  cacheLife("hours");
  try {
    const tho = await layJson<ChuoiViMoTho>(`vi-mo/${encodeURIComponent(ma)}.json`);
    return { ...tho, nguon: tho.nguon?.ten ?? "" };
  } catch {
    return null;
  }
}

// ---- Chỉ số: nến ngày của một chỉ số và P/E toàn thị trường ----

export async function layNenChiSo(ma: string): Promise<{ ten: string; nen: Nen[] } | null> {
  "use cache";
  cacheLife("minutes");
  const data = await layJson<ChiSoTho>("tong-hop/chi-so.json");
  const cs = data.indices[ma];
  if (!cs) return null;
  // Điểm lưu nhân 1000, giữ nguyên để dùng chung biểu đồ nến với cổ phiếu (biểu đồ chia 1000 khi hiển thị)
  return {
    ten: cs.name,
    nen: cs.t.map((time, i) => ({ time, open: cs.o[i], high: cs.h[i], low: cs.l[i], close: cs.c[i], volume: cs.v[i] })),
  };
}

export type PeThiTruong = { ngay: string[]; pe: number[]; vnindex: number[]; trungVi: number | null };

export async function layPeThiTruong(): Promise<PeThiTruong> {
  "use cache";
  cacheLife("hours");
  const tho = await layJson<{ meta: { trungViCaChuoi?: number }; ngay: string[]; pe: number[]; vnindex: number[] }>(
    "tong-hop/pe-thi-truong.json",
  );
  return { ngay: tho.ngay, pe: tho.pe, vnindex: tho.vnindex, trungVi: tho.meta.trungViCaChuoi ?? null };
}

// ---- Ngành theo phân loại của Mofi (rổ ngành định giá cùng một thước) ----

export type DuLieuNganh = {
  ten: Record<string, string>; // khoá ngành -> tên
  maNganh: Record<string, string>; // mã cổ phiếu -> khoá ngành
  pe: Record<string, number>; // khoá ngành -> P/E trung vị
};

export async function layNganh(): Promise<DuLieuNganh> {
  "use cache";
  cacheLife("hours");
  const [n, pe] = await Promise.all([
    layJson<{ meta: { tenRo: Record<string, string> }; ma: Record<string, { nganh: string | null }> }>(
      "tong-hop/nganh-mofi.json",
    ),
    layJson<{ ma: Record<string, { ro: string; tv: number }> }>("tong-hop/pe-nganh.json"),
  ]);
  const maNganh: Record<string, string> = {};
  for (const [ma, v] of Object.entries(n.ma)) if (v.nganh && n.meta.tenRo[v.nganh]) maNganh[ma] = v.nganh;
  const peNganh: Record<string, number> = {};
  for (const v of Object.values(pe.ma)) if (v.ro && peNganh[v.ro] == null) peNganh[v.ro] = v.tv;
  return { ten: n.meta.tenRo, maNganh, pe: peNganh };
}

// ---- Số liệu tài chính 4 quý gần nhất của toàn thị trường (cho bộ lọc), triệu đồng ----

export type TaiChinhMa = {
  loai: string;
  ky: string;
  lnst: number | null; // lợi nhuận sau thuế công ty mẹ, 4 quý
  lnstTruoc: number | null; // cùng kỳ năm trước
  doanhThu: number | null; // ngân hàng: tổng thu nhập hoạt động
  doanhThuTruoc: number | null;
  lnGop: number | null;
  coTuc: number | null; // cổ tức tiền mặt đã trả 4 quý (số dương)
  vonChu: number | null;
  tongTaiSan: number | null;
  noPhaiTra: number | null;
};

type TaiChinhTho = {
  ma: Record<
    string,
    {
      loai: string;
      ky: string;
      ttm?: Record<string, number>;
      ttmTruoc?: Record<string, number>;
      diem?: Record<string, number>;
    }
  >;
};

export async function layTaiChinhToanThiTruong(): Promise<Record<string, TaiChinhMa>> {
  "use cache";
  cacheLife("hours");
  const tho = await layJson<TaiChinhTho>("financial/danh-gia/_toan-thi-truong.json");
  const so = (x: number | undefined) => (typeof x === "number" && Number.isFinite(x) ? x : null);
  const kq: Record<string, TaiChinhMa> = {};
  for (const [ma, x] of Object.entries(tho.ma)) {
    const t = x.ttm ?? {};
    const tt = x.ttmTruoc ?? {};
    const d = x.diem ?? {};
    const doanhThu = (o: Record<string, number>) => so(o.doanhThu ?? o.tongThuNhapHD);
    const vonChu = so(d.vonChu);
    const tongTaiSan = so(d.tongTaiSan);
    kq[ma] = {
      loai: x.loai,
      ky: x.ky,
      lnst: so(t.lnstMe ?? t.lnst),
      lnstTruoc: so(tt.lnstMe ?? tt.lnst),
      doanhThu: doanhThu(t),
      doanhThuTruoc: doanhThu(tt),
      lnGop: so(t.lnGop),
      coTuc: t.coTucDaTra != null ? Math.abs(t.coTucDaTra) : null,
      vonChu,
      tongTaiSan,
      // Ngân hàng không có dòng "nợ phải trả" trong số liệu gộp: lấy tổng tài sản trừ vốn chủ
      noPhaiTra: so(d.noPhaiTra) ?? (tongTaiSan != null && vonChu != null ? tongTaiSan - vonChu : null),
    };
  }
  return kq;
}

// ---- Tin công bố của doanh nghiệp (HOSE/HNX qua Mofi) ----

export type TinDoanhNghiep = { ma: string; tieuDe: string; ngay: string; loai: string; mucDo: "cao" | "vua" | "thap" };

export async function layTin(): Promise<{ capNhat: string; tin: TinDoanhNghiep[] }> {
  "use cache";
  cacheLife("hours");
  const tho = await layJson<{
    meta: { asOf: string };
    news: Record<string, { title: string; at: string; tag?: { level?: string; kind?: string } }[]>;
  }>("tong-hop/tin.json");
  const tin = Object.entries(tho.news).flatMap(([ma, ds]) =>
    ds.map((x) => ({
      ma,
      tieuDe: x.title,
      ngay: x.at,
      loai: x.tag?.kind ?? "Khác",
      mucDo: (x.tag?.level === "cao" || x.tag?.level === "thap" ? x.tag.level : "vua") as TinDoanhNghiep["mucDo"],
    })),
  );
  tin.sort((a, b) => b.ngay.localeCompare(a.ngay) || a.ma.localeCompare(b.ma));
  return { capNhat: tho.meta.asOf, tin };
}

// ---- Hồ sơ doanh nghiệp: kết quả kinh doanh, vốn điều lệ, cổ tức theo năm (đồng) ----

export type ChiTieuNam = { khoa: string; nhan: string; gt: number };

export type HoSoDoanhNghiep = {
  loai: string;
  nguon: string | null;
  kinhDoanh: { nam: number; chiTieu: ChiTieuNam[] }[];
  coCauDoanhThu: { nam: number; phan: { nhan: string; gt: number }[] }[];
  vonDieuLe: { nam: number; gt: number }[];
  coTuc: { nam: number; gt: number }[];
};

export async function layHoSoDoanhNghiep(ma: string): Promise<HoSoDoanhNghiep | null> {
  "use cache";
  cacheLife("hours");
  const tho = await layJson<{
    loai: string;
    nguon?: string;
    doanhThu?: { nam: number; phan: { nhan: string; gt: number }[] }[];
    mach?: { nam: number; so: Record<string, { gt: number; nhan: string }> }[];
    von?: { nam: number; gt: number }[];
    coTuc?: { nam: number; gt: number }[];
  }>(`financial/ho-so/${encodeURIComponent(ma)}.json`).catch(() => null);
  if (!tho) return null;
  return {
    loai: tho.loai,
    nguon: tho.nguon ?? null,
    kinhDoanh: (tho.mach ?? []).map((x) => ({
      nam: x.nam,
      chiTieu: Object.entries(x.so)
        .filter(([, v]) => typeof v?.gt === "number")
        .map(([khoa, v]) => ({ khoa, nhan: v.nhan, gt: v.gt })),
    })),
    coCauDoanhThu: tho.doanhThu ?? [],
    vonDieuLe: tho.von ?? [],
    coTuc: tho.coTuc ?? [],
  };
}

// ---- Giao dịch của người nội bộ và cổ đông lớn ----

export type GiaoDichNoiBo = {
  ngay: string;
  congBo: string | null;
  ten: string;
  chucVu: string | null;
  toChuc: boolean;
  mua: boolean;
  soCp: number;
  daXong: boolean;
  trangThai: string;
  cpTruoc: number | null;
  cpSau: number | null;
  tyLeSau: number | null; // phần của 1
  giaTri: number | null; // đồng, ước tính theo giá đóng cửa
};

export async function layNoiBo(ma: string): Promise<{ capNhat: string; ghiChu: string | null; dong: GiaoDichNoiBo[] } | null> {
  "use cache";
  cacheLife("hours");
  const tho = await layJson<{ capNhat: string; ghiChu?: string; dong: GiaoDichNoiBo[] }>(
    `noi-bo/${encodeURIComponent(ma)}.json`,
  ).catch(() => null);
  if (!tho) return null;
  const dong = tho.dong.map((d) => ({
    ngay: d.ngay,
    congBo: d.congBo ?? null,
    ten: d.ten,
    chucVu: d.chucVu ?? null,
    toChuc: !!d.toChuc,
    mua: !!d.mua,
    soCp: d.soCp,
    daXong: !!d.daXong,
    trangThai: d.trangThai,
    cpTruoc: d.cpTruoc ?? null,
    cpSau: d.cpSau ?? null,
    tyLeSau: d.tyLeSau ?? null,
    giaTri: d.giaTri ?? null,
  }));
  // Mới nhất trước; cùng ngày thì giao dịch đã thực hiện đứng trước lệnh đăng ký
  dong.sort((a, b) => b.ngay.localeCompare(a.ngay) || Number(b.daXong) - Number(a.daXong));
  return { capNhat: tho.capNhat, ghiChu: tho.ghiChu ?? null, dong };
}

// ---- Logo doanh nghiệp (ảnh nằm trên mofi.vn, trình duyệt tải thẳng, lazy-load) ----

export async function layLogo(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("days");
  const tho = await layJson<Record<string, { d: string; v: string }>>("tong-hop/logo.json").catch(() => ({}));
  return Object.fromEntries(Object.entries(tho).map(([ma, x]) => [ma, `https://mofi.vn/logo/${ma}.${x.d}?v=${x.v}`]));
}

// ---- Tổng quan ngành ngân hàng / chứng khoán (Mofi tổng hợp từ báo cáo tài chính, triệu đồng) ----

type SoTaiChinh = Record<string, number>;
export type TongQuanNganhTC = {
  dungLuc: string;
  // Số liệu cộng gộp toàn ngành theo quý (số dư cuối kỳ hoặc phát sinh trong quý)
  quy: { ky: string; nam: number; q: number; so: SoTaiChinh }[];
  // Từng thành viên: cuối kỳ gần nhất, cuối năm trước, 4 quý gần nhất, 4 quý cùng kỳ
  thanhVien: Record<string, { cuoi?: SoTaiChinh | null; cuoiNamTruoc?: SoTaiChinh | null; ttm?: SoTaiChinh | null; ttmNamTruoc?: SoTaiChinh | null }>;
};

export async function layTongQuanNganhTC(ro: "ngan-hang" | "chung-khoan"): Promise<TongQuanNganhTC | null> {
  "use cache";
  cacheLife("hours");
  try {
    const r = await fetch(`https://mofi.vn/du-lieu/tong-quan-nganh-${ro}.json`, {
      signal: AbortSignal.timeout(10000),
      headers: { "user-agent": "FinloBot/1.0 (+https://www.finlo.id.vn)" },
    });
    if (!r.ok) return null;
    const j = (await r.json()) as TongQuanNganhTC;
    return { dungLuc: j.dungLuc, quy: j.quy, thanhVien: j.thanhVien };
  } catch {
    return null;
  }
}

// Dư nợ cho vay theo nhóm nợ 1–5 của từng ngân hàng theo quý (thuyết minh báo cáo tài chính)
export type NoNhom = { nhom1: number; nhom2: number; nhom3: number; nhom4: number; nhom5: number; tong: number; noXau: number };

export async function layNoNhom(): Promise<Record<string, Record<string, NoNhom>>> {
  "use cache";
  cacheLife("hours");
  const tho = await layJson<{ nganHang: Record<string, Record<string, NoNhom>> }>("tong-hop/no-nhom.json").catch(() => null);
  return tho?.nganHang ?? {};
}
