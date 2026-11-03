// Chỉ số thế giới, hàng hoá và tỷ giá từ dữ liệu biểu đồ công khai của Yahoo Finance.
// Đây là giao diện không chính thức: mã nào lỗi thì bỏ qua mã đó, trang vẫn chạy.

import { cacheLife } from "next/cache";

export type GiaTheGioi = { ma: string; ten: string; phu: string; gia: number; phanTram: number | null };

const CHI_SO = [
  ["^DJI", "Dow Jones", "Mỹ"],
  ["^GSPC", "S&P 500", "Mỹ"],
  ["^IXIC", "Nasdaq", "Mỹ"],
  ["^N225", "Nikkei 225", "Nhật Bản"],
  ["^HSI", "Hang Seng", "Hồng Kông"],
  ["000001.SS", "Shanghai", "Trung Quốc"],
  ["^KS11", "KOSPI", "Hàn Quốc"],
  ["^GDAXI", "DAX", "Đức"],
  ["^FTSE", "FTSE 100", "Anh"],
] as const;

const HANG_HOA = [
  ["GC=F", "Vàng", "USD/ounce"],
  ["SI=F", "Bạc", "USD/ounce"],
  ["CL=F", "Dầu WTI", "USD/thùng"],
  ["BZ=F", "Dầu Brent", "USD/thùng"],
  ["HG=F", "Đồng", "USD/pound"],
  ["VND=X", "USD/VND", "Tỷ giá"],
  ["DX-Y.NYB", "Chỉ số USD", "DXY"],
] as const;

type Tho = {
  chart: {
    result: {
      meta: { regularMarketPrice: number; regularMarketTime: number; gmtoffset: number };
      timestamp: number[];
      indicators: { quote: { close: (number | null)[] }[] };
    }[];
  };
};

async function mot([ma, ten, phu]: readonly [string, string, string]): Promise<GiaTheGioi | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ma)}?range=5d&interval=1d`, {
      headers: { "User-Agent": "FinloBot/1.0 (+https://www.finlo.id.vn)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const r = ((await res.json()) as Tho).chart.result[0];
    const { regularMarketPrice: gia, regularMarketTime: luc, gmtoffset } = r.meta;
    const ngay = (t: number) => Math.floor((t + gmtoffset) / 86400);
    // Giá đóng cửa của phiên liền trước phiên có giá mới nhất
    const truoc = r.timestamp
      .map((t, i) => ({ t, c: r.indicators.quote[0].close[i] }))
      .filter((x) => x.c != null && ngay(x.t) < ngay(luc))
      .at(-1)?.c;
    return { ma, ten, phu, gia, phanTram: truoc ? (gia / truoc - 1) * 100 : null };
  } catch {
    return null;
  }
}

export async function layTheGioi() {
  "use cache";
  cacheLife("minutes");
  const [chiSo, hangHoa] = await Promise.all([Promise.all(CHI_SO.map(mot)), Promise.all(HANG_HOA.map(mot))]);
  return { chiSo: chiSo.filter((x) => x != null), hangHoa: hangHoa.filter((x) => x != null) };
}
