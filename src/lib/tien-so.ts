// Tổng quan thị trường tiền số: vốn hoá, tỷ trọng (CoinGecko), chỉ số Sợ hãi & Tham lam (alternative.me),
// chỉ số Mùa altcoin tự tính từ nến ngày Binance. Chỉ chạy phía máy chủ, có lưu đệm.

import { cacheLife } from "next/cache";

const DAU = { "user-agent": "FinloBot/1.0 (+https://www.finlo.id.vn)", accept: "application/json" };

async function layJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: DAU, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

// Đồng ổn định giá và token bọc/đặt cọc: không tính vào bản đồ nhiệt, top tăng giảm, mùa altcoin
const BO_QUA = new Set([
  "usdt", "usdc", "dai", "fdusd", "tusd", "usde", "usds", "pyusd", "usdd", "busd", "frax", "usd1", "rlusd", "usdtb", "gusd",
  "usdp", "lusd", "usdx", "susde", "bsc-usd", "usdf", "usdg", "eurc", "xaut", "paxg", "wbtc", "weth", "steth", "wsteth",
  "weeth", "cbbtc", "wbeth", "reth", "meth", "ezeth", "rseth", "lbtc", "solvbtc", "jitosol", "msol", "bnsol", "bfusd", "syrupusdc",
]);
const laTienThat = (ma: string, ten: string) => !BO_QUA.has(ma.toLowerCase()) && !/wrapped|staked|bridged|\busd\b/i.test(ten);

export type CoinThiTruong = {
  id: string;
  ma: string;
  ten: string;
  anh: string;
  hang: number;
  gia: number;
  vonHoa: number;
  khoiLuong: number;
  p24: number | null;
  p7: number | null;
  p30: number | null;
  cachDinh: number | null; // % so với đỉnh lịch sử
};

export type ThiTruongTienSo = {
  tongVonHoa: number;
  tongKhoiLuong: number;
  thayDoiVonHoa24h: number;
  tyTrong: { btc: number; eth: number; onDinh: number };
  soCoin: number;
  coin: CoinThiTruong[];
};

type CoinGeckoThiTruong = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number;
  current_price: number;
  market_cap: number;
  total_volume: number;
  ath_change_percentage: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
};

export async function layThiTruongTienSo(): Promise<ThiTruongTienSo | null> {
  "use cache";
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });
  try {
    const [toanCau, dsTho] = await Promise.all([
      layJson<{
        data: {
          total_market_cap: { usd: number };
          total_volume: { usd: number };
          market_cap_percentage: Record<string, number>;
          market_cap_change_percentage_24h_usd: number;
          active_cryptocurrencies: number;
        };
      }>("https://api.coingecko.com/api/v3/global"),
      layJson<CoinGeckoThiTruong[]>(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&price_change_percentage=24h,7d,30d",
      ),
    ]);
    const d = toanCau.data;
    const onDinh = ["usdt", "usdc", "dai", "usde", "usds", "fdusd"].reduce((s, k) => s + (d.market_cap_percentage[k] ?? 0), 0);
    return {
      tongVonHoa: d.total_market_cap.usd,
      tongKhoiLuong: d.total_volume.usd,
      thayDoiVonHoa24h: d.market_cap_change_percentage_24h_usd,
      tyTrong: { btc: d.market_cap_percentage.btc ?? 0, eth: d.market_cap_percentage.eth ?? 0, onDinh },
      soCoin: d.active_cryptocurrencies,
      coin: dsTho
        .filter((c) => c.market_cap > 0 && laTienThat(c.symbol, c.name))
        .map((c) => ({
          id: c.id,
          ma: c.symbol.toUpperCase(),
          ten: c.name,
          anh: c.image,
          hang: c.market_cap_rank,
          gia: c.current_price,
          vonHoa: c.market_cap,
          khoiLuong: c.total_volume,
          p24: c.price_change_percentage_24h_in_currency,
          p7: c.price_change_percentage_7d_in_currency,
          p30: c.price_change_percentage_30d_in_currency,
          cachDinh: c.ath_change_percentage,
        })),
    };
  } catch {
    return null;
  }
}

export type TamLy = { hienTai: number; phanLoai: string; lichSu: { time: number; value: number }[] };

const PHAN_LOAI: Record<string, string> = {
  "Extreme Fear": "Cực kỳ sợ hãi",
  Fear: "Sợ hãi",
  Neutral: "Trung lập",
  Greed: "Tham lam",
  "Extreme Greed": "Cực kỳ tham lam",
};

// Chỉ số Sợ hãi & Tham lam 0–100 (alternative.me), cập nhật mỗi ngày
export async function layTamLy(): Promise<TamLy | null> {
  "use cache";
  cacheLife("hours");
  try {
    const j = await layJson<{ data: { value: string; value_classification: string; timestamp: string }[] }>(
      "https://api.alternative.me/fng/?limit=90",
    );
    const ds = j.data.map((x) => ({ time: Number(x.timestamp), value: Number(x.value), loai: x.value_classification })).reverse();
    const cuoi = ds[ds.length - 1];
    return { hienTai: cuoi.value, phanLoai: PHAN_LOAI[cuoi.loai] ?? cuoi.loai, lichSu: ds.map(({ time, value }) => ({ time, value })) };
  } catch {
    return null;
  }
}

export type MuaAltcoin = { diem: number; soVuot: number; soXet: number; btc90: number; vuot: { ma: string; p90: number }[] };

// Chỉ số Mùa altcoin: % trong top 50 altcoin (bỏ đồng ổn định, token bọc) có giá 90 ngày tăng hơn Bitcoin.
// Trên 75 là mùa altcoin, dưới 25 là mùa Bitcoin.
export async function layMuaAltcoin(dsMa: string[]): Promise<MuaAltcoin | null> {
  "use cache";
  cacheLife("hours");
  const loi90 = async (ma: string) => {
    try {
      const k = await layJson<[number, string, string, string, string][]>(
        `https://data-api.binance.vision/api/v3/klines?symbol=${ma}USDT&interval=1d&limit=91`,
      );
      if (k.length < 85) return null;
      return (Number(k[k.length - 1][4]) / Number(k[0][4]) - 1) * 100;
    } catch {
      return null;
    }
  };
  const btc = await loi90("BTC");
  if (btc == null) return null;
  // Nhiều đồng không niêm yết trên Binance: xét rộng tới 110 đồng để đủ 50 altcoin có dữ liệu
  const ung = dsMa.filter((m) => m !== "BTC").slice(0, 110);
  const kq = (await Promise.all(ung.map(async (ma) => ({ ma, p90: await loi90(ma) })))).filter(
    (x): x is { ma: string; p90: number } => x.p90 != null,
  );
  const top = kq.slice(0, 50);
  if (top.length < 20) return null;
  const vuot = top.filter((x) => x.p90 > btc).sort((a, b) => b.p90 - a.p90);
  return { diem: Math.round((vuot.length / top.length) * 100), soVuot: vuot.length, soXet: top.length, btc90: btc, vuot: vuot.slice(0, 8) };
}

// Độ cao khối Bitcoin hiện tại (mempool.space) để đếm ngược halving; khối mới ~10 phút nên lưu đệm theo giờ là đủ
export async function layKhoiBitcoin(): Promise<{ khoi: number; luc: number } | null> {
  "use cache";
  cacheLife("hours");
  try {
    const r = await fetch("https://mempool.space/api/blocks/tip/height", {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "FinloBot/1.0 (+https://www.finlo.id.vn)" },
    });
    const khoi = Number(await r.text());
    return r.ok && khoi > 0 ? { khoi, luc: Date.now() } : null;
  } catch {
    return null;
  }
}
