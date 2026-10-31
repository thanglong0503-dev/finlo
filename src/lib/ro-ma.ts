import { cacheLife } from "next/cache";
import { layNganh } from "@/lib/mofi";

// Danh sách mã theo rổ chỉ số, ETF, chứng quyền và hợp đồng tương lai cho bộ lọc danh sách mã.
// Rổ (VN30, VN100…) và danh mục ETF/chứng quyền: tệp danh sách hằng ngày của Mofi.
// Giá ETF, chứng quyền: bảng giá công khai của VPS (Mofi không lưu). Phái sinh: nến ngày của Mofi.

const MOFI = "https://data.mofi.vn";
const VPS = "https://bgapidatafeed.vps.com.vn";
const LICH_SU_VPS = "https://histdatafeed.vps.com.vn/tradingview/history";
const UA = { "User-Agent": "FinloBot/1.0 (+https://www.finlo.id.vn)" };

export const TEN_RO: Record<string, string> = {
  VN30: "VN30",
  VN100: "VN100",
  HNX30: "HNX30",
  VNDIAMOND: "VNDIAMOND",
  VNFINLEAD: "VNFINLEAD",
  VNFINSELECT: "VNFINSELECT",
};

export const HOP_DONG_TUONG_LAI = [
  { ma: "VN30F1M", ten: "VN30 tháng gần nhất" },
  { ma: "VN30F2M", ten: "VN30 tháng kế tiếp" },
  { ma: "VN30F1Q", ten: "VN30 quý gần nhất" },
  { ma: "VN30F2Q", ten: "VN30 quý kế tiếp" },
  { ma: "V100F1M", ten: "VN100 tháng gần nhất" },
  { ma: "V100F2M", ten: "VN100 tháng kế tiếp" },
];
export const laPhaiSinh = (ma: string) => /^(VN30|V100)F[12][MQ]$/.test(ma);

export type MaKhac = { ma: string; ten: string; gia: number; phanTram: number | null };
export type DanhSachKhac = {
  ro: Record<string, string[]>;
  nganh: { ten: Record<string, string>; maNganh: Record<string, string> };
  etf: MaKhac[];
  chungQuyen: MaKhac[];
  phaiSinh: MaKhac[];
};

async function json<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

// Tệp danh sách theo ngày: lùi tối đa 10 ngày (cuối tuần, nghỉ lễ không có tệp)
async function layDanhSachNgay() {
  const homNay = new Date(Date.now() + 7 * 3600_000);
  for (let lui = 0; lui < 10; lui++) {
    const d = new Date(homNay.getTime() - lui * 86400_000).toISOString().slice(0, 10);
    const ds = await json<{ ds: Record<string, string[]> }>(`${MOFI}/realtime/ds/${d}.json`);
    if (ds?.ds) return ds.ds;
  }
  return {};
}

type GiaVps = {
  sym: string;
  lastPrice: number;
  r: number;
  CWUnderlying?: string;
  CWIssuerName?: string;
  CWMaturityDate?: string;
  CWExcersisePrice?: string;
};

async function giaVps(ma: string[]): Promise<GiaVps[]> {
  if (!ma.length) return [];
  const ket: GiaVps[] = [];
  // Chia nhỏ để đường dẫn không quá dài
  for (let i = 0; i < ma.length; i += 120) {
    const d = await json<GiaVps[]>(`${VPS}/getliststockdata/${ma.slice(i, i + 120).join(",")}`);
    if (Array.isArray(d)) ket.push(...d);
  }
  return ket;
}

const doiVps = (x: GiaVps, ten: string): MaKhac => {
  // VPS báo giá theo nghìn đồng; Finlo lưu giá theo đồng như cổ phiếu
  const gia = (x.lastPrice || x.r) * 1000;
  return { ma: x.sym, ten, gia, phanTram: x.lastPrice && x.r ? (x.lastPrice / x.r - 1) * 100 : null };
};

export async function layDanhSachKhac(): Promise<DanhSachKhac> {
  "use cache";
  cacheLife("minutes");
  const [ds, nganh] = await Promise.all([layDanhSachNgay(), layNganh().catch(() => null)]);
  const etfMa = ds.hsx_e ?? [];
  const cqMa = ds.hsx_w ?? [];
  const [gia, phaiSinh] = await Promise.all([
    giaVps([...etfMa, ...cqMa]),
    Promise.all(
      HOP_DONG_TUONG_LAI.map(async (h): Promise<MaKhac | null> => {
        const d = await json<{ c: number[] }>(`${MOFI}/derivative/d/${h.ma}.json`);
        const n = d?.c.length ?? 0;
        if (!d || n < 2) return null;
        // Mofi lưu điểm nhân 1000, cùng thang với giá cổ phiếu theo đồng nên hiển thị chung được
        return { ma: h.ma, ten: h.ten, gia: d.c[n - 1], phanTram: (d.c[n - 1] / d.c[n - 2] - 1) * 100 };
      }),
    ),
  ]);
  const theoMa = new Map(gia.map((x) => [x.sym, x]));
  const etf = etfMa.flatMap((m) => {
    const x = theoMa.get(m);
    return x ? [doiVps(x, "Quỹ ETF")] : [];
  });
  const chungQuyen = cqMa.flatMap((m) => {
    const x = theoMa.get(m);
    if (!x) return [];
    // Mã chứng quyền dạng C + mã cơ sở + năm + số thứ tự (CACB2515 -> ACB); VPS thường để trống tên cơ sở
    const coSo = x.CWUnderlying || /^C([A-Z0-9]{3})\d{4}$/.exec(x.sym)?.[1];
    const dh = x.CWMaturityDate && /^(\d{4})(\d{2})(\d{2})$/.exec(x.CWMaturityDate);
    const ten = [coSo && `CQ ${coSo}`, x.CWIssuerName, dh && `đáo hạn ${dh[3]}/${dh[2]}/${dh[1]}`, x.CWExcersisePrice && `giá TH ${x.CWExcersisePrice}`]
      .filter(Boolean)
      .join(" · ");
    return [doiVps(x, ten || "Chứng quyền")];
  });
  const ro: Record<string, string[]> = {};
  for (const k of Object.keys(TEN_RO)) if (ds[k]?.length) ro[k] = ds[k];
  return {
    ro,
    nganh: { ten: nganh?.ten ?? {}, maNganh: nganh?.maNganh ?? {} },
    etf,
    chungQuyen,
    phaiSinh: phaiSinh.filter((x): x is MaKhac => x != null),
  };
}

// Nến ngày cho mã không có trong dữ liệu cổ phiếu của Mofi: hợp đồng tương lai (Mofi) và ETF, chứng quyền (VPS)
export async function layNenKhac(ma: string) {
  "use cache";
  cacheLife("minutes");
  if (laPhaiSinh(ma)) {
    const d = await json<{ t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v: number[] }>(
      `${MOFI}/derivative/d/${ma}.json`,
    );
    if (!d?.t?.length) return null;
    // Giữ điểm nhân 1000 (biểu đồ chia 1000 như giá cổ phiếu); mốc giờ đưa về 0h giờ Việt Nam
    return d.t.map((t, i) => ({
      time: t - (t % 86400) - 7 * 3600,
      open: d.o[i],
      high: d.h[i],
      low: d.l[i],
      close: d.c[i],
      volume: d.v[i],
    }));
  }
  if (!/^[A-Z0-9]{3,12}$/.test(ma)) return null;
  const den = Math.floor(Date.now() / 1000);
  const d = await json<{ s: string; t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v: number[] }>(
    `${LICH_SU_VPS}?symbol=${ma}&resolution=D&from=${den - 86400 * 365 * 12}&to=${den}`,
  );
  if (d?.s !== "ok" || !d.t?.length) return null;
  // Mốc 0h giờ Việt Nam như nến cổ phiếu; giá nghìn đồng -> đồng
  return d.t.map((t, i) => ({
    time: t - (t % 86400) - 7 * 3600,
    open: d.o[i] * 1000,
    high: d.h[i] * 1000,
    low: d.l[i] * 1000,
    close: d.c[i] * 1000,
    volume: d.v[i],
  }));
}
