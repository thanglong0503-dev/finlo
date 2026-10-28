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
  indices: Record<string, NenTho & { name: string }>;
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
};

export type BangGia = { capNhat: string; coPhieu: CoPhieu[] };

export type ChiSo = {
  ma: string;
  ten: string;
  diem: number;
  thayDoi: number;
  phanTram: number;
  lichSu: number[]; // điểm đóng cửa ~3 tháng gần nhất, để vẽ đường nhỏ
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

export async function layBangGia(): Promise<BangGia> {
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
    };
  });
  coPhieu.sort((a, b) => b.giaTri - a.giaTri);

  return { capNhat: gia.meta.asOf, coPhieu };
}

// Điểm chỉ số được Mofi lưu nhân 1000 (1761870 = 1.761,87 điểm).
export async function layChiSo(): Promise<ChiSo[]> {
  "use cache";
  cacheLife("minutes");
  const data = await layJson<ChiSoTho>("tong-hop/chi-so.json");
  return Object.entries(data.indices).map(([ma, cs]) => {
    const n = cs.c.length;
    const diem = cs.c[n - 1] / 1000;
    const truoc = cs.c[n - 2] / 1000;
    return {
      ma,
      ten: cs.name,
      diem,
      thayDoi: diem - truoc,
      phanTram: ((diem - truoc) / truoc) * 100,
      lichSu: cs.c.slice(-60).map((c) => c / 1000),
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
  nam: string[]; // ví dụ "2025"
  muc: MucBaoCao[];
};

type BaoCaoTho = {
  loai: string;
  quy: { nam: number; q: number }[];
  nam: { nam: number }[];
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
    nam: tho.nam.map((k) => String(k.nam)),
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
