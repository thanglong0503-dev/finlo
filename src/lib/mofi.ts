// Lấy dữ liệu thị trường từ kho JSON của Mofi (data.mofi.vn).
// Chỉ chạy phía server: trình duyệt không gọi thẳng được vì data.mofi.vn chưa mở CORS.
// Mỗi hàm public được cache bằng "use cache" + cacheLife("minutes"): làm mới khoảng mỗi phút.

import { cacheLife } from "next/cache";

const BASE = "https://data.mofi.vn";

async function layJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Mofi ${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
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

export type TienSo = { ma: string; ten: string; gia: number; phanTram: number };

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
      return { ma, ten, gia: d.c[n - 1], phanTram: ((d.c[n - 1] - d.c[n - 2]) / d.c[n - 2]) * 100 };
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
