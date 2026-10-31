// Dữ liệu phái sinh của một đồng tiền số cho các chỉ báo Long/Short trên biểu đồ (Binance Futures, trình duyệt gọi thẳng).
// Binance chỉ giữ Open Interest và tỷ lệ Long/Short khoảng 30 ngày gần nhất; funding và premium có lịch sử dài hơn.

export type Diem = { t: number; v: number }; // t: giây

export type DuLieuPhaiSinh = {
  oi: Diem[]; // giá trị hợp đồng đang mở (USD)
  lsTaiKhoan: Diem[]; // tỷ lệ số tài khoản Long/Short
  lsTopTaiKhoan: Diem[]; // top trader: tỷ lệ theo tài khoản
  lsTopViThe: Diem[]; // top trader: tỷ lệ theo khối lượng vị thế
  taker: Diem[]; // tỷ lệ khối lượng mua chủ động / bán chủ động
  funding: Diem[]; // % mỗi kỳ
  premium: Diem[]; // chênh giá hợp đồng so với giá giao ngay (%)
};

const API = "https://fapi.binance.com";
// Khung biểu đồ -> chu kỳ dữ liệu Binance hỗ trợ (nhỏ nhất 5 phút)
const CHU_KY: Record<string, string> = { "1m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d" };

type Hang = Record<string, string | number>;
const nap = (duong: string) =>
  fetch(API + duong)
    .then((r) => (r.ok ? (r.json() as Promise<Hang[]>) : []))
    .catch(() => [] as Hang[]);
const giay = (x: string | number) => Math.floor(Number(x) / 1000);
const doi = (ds: Hang[], tg: string, gt: string, he = 1): Diem[] =>
  ds.map((x) => ({ t: giay(x[tg]), v: Number(x[gt]) * he })).filter((x) => Number.isFinite(x.v)).sort((a, b) => a.t - b.t);

const dem = new Map<string, Promise<DuLieuPhaiSinh | null>>();

function taiCap(s: string, khung: string): Promise<DuLieuPhaiSinh | null> {
  const p = CHU_KY[khung] ?? "1h";
  return Promise.all([
    nap(`/futures/data/openInterestHist?symbol=${s}&period=${p}&limit=500`),
    nap(`/futures/data/globalLongShortAccountRatio?symbol=${s}&period=${p}&limit=500`),
    nap(`/futures/data/topLongShortAccountRatio?symbol=${s}&period=${p}&limit=500`),
    nap(`/futures/data/topLongShortPositionRatio?symbol=${s}&period=${p}&limit=500`),
    nap(`/futures/data/takerlongshortRatio?symbol=${s}&period=${p}&limit=500`),
    nap(`/fapi/v1/fundingRate?symbol=${s}&limit=1000`),
    fetch(`${API}/fapi/v1/premiumIndexKlines?symbol=${s}&interval=${khung}&limit=1000`)
      .then((r) => (r.ok ? (r.json() as Promise<(string | number)[][]>) : []))
      .catch(() => [] as (string | number)[][]),
  ]).then(([oi, ls, topTk, topVt, tk, fr, pr]) => {
    // Đồng không có hợp đồng vĩnh cửu trên Binance thì mọi danh sách đều rỗng
    if (!oi.length && !fr.length) return null;
    return {
      oi: doi(oi, "timestamp", "sumOpenInterestValue"),
      lsTaiKhoan: doi(ls, "timestamp", "longShortRatio"),
      lsTopTaiKhoan: doi(topTk, "timestamp", "longShortRatio"),
      lsTopViThe: doi(topVt, "timestamp", "longShortRatio"),
      taker: doi(tk, "timestamp", "buySellRatio"),
      funding: doi(fr, "fundingTime", "fundingRate", 100),
      premium: pr.map((x) => ({ t: giay(x[0]), v: Number(x[4]) * 100 })).filter((x) => Number.isFinite(x.v)),
    };
  });
}

export function taiPhaiSinh(ma: string, khung: string): Promise<DuLieuPhaiSinh | null> {
  const khoa = `${ma}:${khung}`;
  const c = dem.get(khoa);
  if (c) return c;
  // Đồng giá rất nhỏ (PEPE, SHIB…) có hợp đồng theo lô 1000 đơn vị: 1000PEPEUSDT
  const gt = taiCap(`${ma}USDT`, khung).then((d) => d ?? taiCap(`1000${ma}USDT`, khung));
  dem.set(khoa, gt);
  // Làm mới sau 5 phút: lần mở sau sẽ tải lại
  setTimeout(() => dem.delete(khoa), 300_000);
  return gt;
}
