"use client";

import { ColorType, createChart, HistogramSeries, LineSeries, type Time } from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGiaoDien } from "@/lib/giao-dien";
import { useLamMoi } from "@/lib/lam-moi";

// Phái sinh tiền số: trình duyệt gọi thẳng Binance Futures (có CORS), không đi qua máy chủ Finlo nên không tốn Vercel
const API = "https://fapi.binance.com";
const COIN = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE"];
const KHUNG = [
  { ma: "1h", ten: "1 giờ", soDiem: 168, moTa: "7 ngày" },
  { ma: "4h", ten: "4 giờ", soDiem: 180, moTa: "30 ngày" },
  { ma: "1d", ten: "1 ngày", soDiem: 30, moTa: "30 ngày" },
] as const;
type Khung = (typeof KHUNG)[number]["ma"];
const LECH_GIO = 7 * 3600; // biểu đồ hiện giờ Việt Nam

const so = (x: number, chuSo = 2) => x.toLocaleString("vi-VN", { maximumFractionDigits: chuSo, minimumFractionDigits: chuSo });
const usdGon = (x: number): string =>
  x < 0
    ? `−${usdGon(-x)}`
    : x >= 1e9 ? `$${so(x / 1e9)} tỷ` : x >= 1e6 ? `$${so(x / 1e6, 1)} triệu` : x >= 1e3 ? `$${so(x / 1e3, 1)} nghìn` : `$${so(x, 0)}`;
const gia = (x: number) => `$${x.toLocaleString("vi-VN", { maximumFractionDigits: x >= 1000 ? 1 : x >= 1 ? 3 : 6 })}`;
const pt = (x: number, chuSo = 2) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${so(Math.abs(x), chuSo)}%`;
const mau = (x: number) => (x > 0 ? "text-tang" : x < 0 ? "text-giam" : "text-dung");
const bien = (ten: string) => getComputedStyle(document.documentElement).getPropertyValue(ten).trim();

async function nap<T>(duong: string): Promise<T> {
  const r = await fetch(API + duong);
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<T>;
}

type DuLieuMa = {
  markGia: number;
  funding: number;
  fundingKe: number;
  oi: { t: number; usd: number }[];
  giaNen: { t: number; dong: number }[];
  lsTaiKhoan: { t: number; long: number }[];
  lsTop: { t: number; long: number }[];
  taker: { t: number; mua: number; ban: number }[];
  lichSuFunding: { t: number; gt: number }[];
};

async function taiMa(ma: string, khung: Khung): Promise<DuLieuMa> {
  const s = `${ma}USDT`;
  const n = KHUNG.find((k) => k.ma === khung)!.soDiem;
  type Hang = Record<string, string | number>;
  const [pi, oi, nen, lsTk, lsTop, tk, fr] = await Promise.all([
    nap<Hang>(`/fapi/v1/premiumIndex?symbol=${s}`),
    nap<Hang[]>(`/futures/data/openInterestHist?symbol=${s}&period=${khung}&limit=${n}`),
    nap<(string | number)[][]>(`/fapi/v1/klines?symbol=${s}&interval=${khung}&limit=${n}`),
    nap<Hang[]>(`/futures/data/globalLongShortAccountRatio?symbol=${s}&period=${khung}&limit=${n}`),
    nap<Hang[]>(`/futures/data/topLongShortPositionRatio?symbol=${s}&period=${khung}&limit=${n}`),
    nap<Hang[]>(`/futures/data/takerlongshortRatio?symbol=${s}&period=${khung}&limit=${n}`),
    nap<Hang[]>(`/fapi/v1/fundingRate?symbol=${s}&limit=90`),
  ]);
  const giay = (x: string | number) => Math.floor(Number(x) / 1000);
  return {
    markGia: Number(pi.markPrice),
    funding: Number(pi.lastFundingRate) * 100,
    fundingKe: Number(pi.nextFundingTime),
    oi: oi.map((x) => ({ t: giay(x.timestamp), usd: Number(x.sumOpenInterestValue) })),
    giaNen: nen.map((x) => ({ t: giay(x[0]), dong: Number(x[4]) })),
    lsTaiKhoan: lsTk.map((x) => ({ t: giay(x.timestamp), long: Number(x.longAccount) * 100 })),
    lsTop: lsTop.map((x) => ({ t: giay(x.timestamp), long: Number(x.longAccount) * 100 })),
    taker: tk.map((x) => ({ t: giay(x.timestamp), mua: Number(x.buyVol), ban: Number(x.sellVol) })),
    lichSuFunding: fr.map((x) => ({ t: giay(x.fundingTime), gt: Number(x.fundingRate) * 100 })),
  };
}

type DongThiTruong = { ma: string; gia: number; pt24: number; kl: number; funding: number };

// Binance có cả hợp đồng cổ phiếu, vàng, dầu (TradFi); chỉ giữ hợp đồng vĩnh cửu của tiền số. Danh sách ít đổi nên tải một lần.
let capTienSo: Promise<Set<string>> | null = null;
const layCapTienSo = () =>
  (capTienSo ??= nap<{ symbols: { symbol: string; underlyingType: string; contractType: string }[] }>("/fapi/v1/exchangeInfo")
    .then((d) => new Set(d.symbols.filter((x) => x.underlyingType === "COIN" && x.contractType === "PERPETUAL").map((x) => x.symbol)))
    .catch((e) => {
      capTienSo = null;
      throw e;
    }));

async function taiThiTruong(): Promise<DongThiTruong[]> {
  type Hang = Record<string, string>;
  const [pi, tk, coin] = await Promise.all([nap<Hang[]>("/fapi/v1/premiumIndex"), nap<Hang[]>("/fapi/v1/ticker/24hr"), layCapTienSo()]);
  const fund = new Map(pi.map((x) => [x.symbol, Number(x.lastFundingRate) * 100]));
  return tk
    .filter((x) => x.symbol.endsWith("USDT") && coin.has(x.symbol) && fund.has(x.symbol) && Number(x.quoteVolume) > 0)
    .map((x) => ({
      ma: x.symbol.replace(/USDT$/, ""),
      gia: Number(x.lastPrice),
      pt24: Number(x.priceChangePercent),
      kl: Number(x.quoteVolume),
      funding: fund.get(x.symbol)!,
    }))
    .sort((a, b) => b.kl - a.kl);
}

// ---------------- Biểu đồ nhỏ: đường hoặc cột, có thể thêm đường giá ở trục trái ----------------
type Chuoi = { ten: string; kieu: "duong" | "cot"; mauBien: string; diem: { t: number; v: number; mauBien?: string }[]; trai?: boolean };

function BieuDo({ chuoi, dinhDang, cao = 220 }: { chuoi: Chuoi[]; dinhDang: (x: number) => string; cao?: number }) {
  const khung = useRef<HTMLDivElement>(null);
  const giaoDien = useGiaoDien();
  useEffect(() => {
    if (!khung.current) return;
    const coTrai = chuoi.some((c) => c.trai);
    const chart = createChart(khung.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: bien("--chu-phu"), fontFamily: "inherit", attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: bien("--vien") } },
      rightPriceScale: { borderColor: bien("--vien") },
      leftPriceScale: { visible: coTrai, borderColor: bien("--vien") },
      timeScale: { borderColor: bien("--vien"), timeVisible: true, secondsVisible: false },
      localization: { locale: "vi-VN", priceFormatter: dinhDang },
      handleScroll: false,
      handleScale: false,
    });
    for (const c of chuoi) {
      const du = c.diem.map((d) => ({ time: (d.t + LECH_GIO) as Time, value: d.v, ...(d.mauBien ? { color: bien(d.mauBien) } : {}) }));
      if (c.kieu === "cot") {
        chart.addSeries(HistogramSeries, { color: bien(c.mauBien), priceLineVisible: false, lastValueVisible: false }).setData(du);
      } else {
        chart
          .addSeries(LineSeries, {
            color: bien(c.mauBien),
            lineWidth: c.trai ? 1 : 2,
            priceLineVisible: false,
            priceScaleId: c.trai ? "left" : "right",
            ...(c.trai ? { priceFormat: { type: "custom" as const, formatter: gia } } : {}),
          })
          .setData(du);
      }
    }
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [chuoi, dinhDang, giaoDien]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-chu-phu">
        {chuoi.map((c) => (
          <span key={c.ten} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: `var(${c.mauBien})` }} />
            {c.ten}
          </span>
        ))}
      </div>
      <div ref={khung} style={{ height: cao }} className="w-full" />
    </div>
  );
}

// Đếm ngược tới kỳ funding kế tiếp; tự cập nhật mỗi giây
function DemNguoc({ den }: { den: number }) {
  const [con, setCon] = useState<number | null>(null);
  useEffect(() => {
    const chay = () => setCon(Math.max(0, den - Date.now()));
    const id = setInterval(chay, 1000);
    const dau = setTimeout(chay, 0);
    return () => {
      clearInterval(id);
      clearTimeout(dau);
    };
  }, [den]);
  if (con == null) return <span>—</span>;
  const g = Math.floor(con / 3600000);
  const p = Math.floor((con % 3600000) / 60000);
  const s = Math.floor((con % 60000) / 1000);
  return <span className="so">{[g, p, s].map((x) => String(x).padStart(2, "0")).join(":")}</span>;
}

function The({ nhan, chinh, phu, mauChinh = "" }: { nhan: string; chinh: React.ReactNode; phu?: React.ReactNode; mauChinh?: string }) {
  return (
    <div className="rounded-2xl bg-nen-phu p-4">
      <p className="text-[13px] text-chu-phu">{nhan}</p>
      <p className={`so mt-1 text-[22px] leading-tight font-bold tracking-[-0.02em] ${mauChinh}`}>{chinh}</p>
      {phu && <p className="mt-1 text-[12px] text-chu-phu">{phu}</p>}
    </div>
  );
}

function Khoi({ tieuDe, moTa, children }: { tieuDe: string; moTa: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-nen-phu p-4 sm:p-5">
      <h3 className="text-[16px] font-semibold">{tieuDe}</h3>
      <p className="mt-0.5 mb-3 text-[13px] text-chu-phu">{moTa}</p>
      {children}
    </section>
  );
}

const dinhDangUsd = (x: number) => usdGon(x);
const dinhDangPt = (x: number) => `${so(x, 3)}%`;
const dinhDangPt1 = (x: number) => `${so(x, 1)}%`;

// ---------------- Thanh lý trực tiếp ----------------
type ThanhLy = { id: number; luc: number; ma: string; long: boolean; usd: number; gia: number };

function ThanhLyTrucTiep() {
  const [ds, setDs] = useState<ThanhLy[]>([]);
  const [tong, setTong] = useState({ long: 0, short: 0, tu: 0 });
  const [ketNoi, setKetNoi] = useState(false);
  const dem = useRef(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let hen: ReturnType<typeof setTimeout> | undefined;
    let dong = false;
    const mo = () => {
      ws = new WebSocket("wss://fstream.binance.com/ws/!forceOrder@arr");
      ws.onopen = () => {
        setKetNoi(true);
        setTong((t) => (t.tu ? t : { ...t, tu: Date.now() }));
      };
      ws.onmessage = (e) => {
        const o = (JSON.parse(e.data) as { o: { s: string; S: string; ap: string; z: string; T: number } }).o;
        // Lệnh SELL bị cưỡng bức nghĩa là vị thế Long bị thanh lý, BUY là Short bị thanh lý
        const long = o.S === "SELL";
        const usd = Number(o.ap) * Number(o.z);
        if (!usd) return;
        dem.current += 1;
        const muc = { id: dem.current, luc: o.T, ma: o.s.replace(/USDT$|USDC$/, ""), long, usd, gia: Number(o.ap) };
        setDs((x) => [muc, ...x].slice(0, 40));
        setTong((t) => (long ? { ...t, long: t.long + usd } : { ...t, short: t.short + usd }));
      };
      ws.onclose = () => {
        setKetNoi(false);
        if (!dong) hen = setTimeout(mo, 3000);
      };
    };
    mo();
    return () => {
      dong = true;
      clearTimeout(hen);
      ws?.close();
    };
  }, []);

  const tongCong = tong.long + tong.short;
  return (
    <Khoi tieuDe="Thanh lý trực tiếp" moTa="Vị thế bị sàn đóng cưỡng bức vì hết ký quỹ, toàn bộ cặp USDT trên Binance Futures.">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        <span className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${ketNoi ? "bg-tang" : "bg-chu-phu"}`} />
          {ketNoi ? "Đang nhận dữ liệu" : "Đang kết nối…"}
        </span>
        <span className="text-chu-phu">
          Long bị thanh lý <b className="so text-giam">{usdGon(tong.long)}</b>
        </span>
        <span className="text-chu-phu">
          Short bị thanh lý <b className="so text-tang">{usdGon(tong.short)}</b>
        </span>
      </div>
      {tongCong > 0 && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-nen-noi">
          <div className="bg-giam" style={{ width: `${(tong.long / tongCong) * 100}%` }} />
          <div className="bg-tang flex-1" />
        </div>
      )}
      <div className="mt-3 max-h-[340px] overflow-y-auto">
        {ds.length === 0 ? (
          <p className="py-8 text-center text-chu-phu">Chờ lệnh thanh lý đầu tiên. Thị trường yên thì có thể vài chục giây mới có một lệnh.</p>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {ds.map((x) => (
                <tr key={x.id} className="border-t border-vien first:border-0">
                  <td className="so py-1.5 text-chu-phu">
                    {new Date(x.luc).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="py-1.5 font-semibold">{x.ma}</td>
                  <td className={`py-1.5 ${x.long ? "text-giam" : "text-tang"}`}>{x.long ? "Long" : "Short"}</td>
                  <td className="so py-1.5 text-right text-chu-phu">{gia(x.gia)}</td>
                  <td className={`so py-1.5 text-right font-semibold ${x.usd >= 100000 ? "text-chu" : "text-chu-phu"}`}>{usdGon(x.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-[11px] text-chu-phu">Tính từ lúc mở trang. Binance chỉ gửi lệnh lớn nhất mỗi cặp trong mỗi giây nên số thực tế có thể cao hơn.</p>
    </Khoi>
  );
}

// ---------------- Bảng funding toàn thị trường ----------------
const SAP = [
  { ma: "kl", ten: "Khối lượng lớn" },
  { ma: "cao", ten: "Funding cao nhất" },
  { ma: "thap", ten: "Funding âm nhất" },
] as const;

function BangFunding({ ds }: { ds: DongThiTruong[] }) {
  const [sap, setSap] = useState<(typeof SAP)[number]["ma"]>("kl");
  // Chỉ xét 150 cặp thanh khoản nhất để bỏ các đồng quá nhỏ có funding bất thường
  const goc = ds.slice(0, 150);
  const hien = (sap === "kl" ? goc : [...goc].sort((a, b) => (sap === "cao" ? b.funding - a.funding : a.funding - b.funding))).slice(0, 20);
  return (
    <section className="rounded-3xl bg-nen-phu p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold">Funding toàn thị trường</h3>
          <p className="mt-0.5 text-[13px] text-chu-phu">150 hợp đồng vĩnh cửu USDT có khối lượng lớn nhất.</p>
        </div>
        <div className="flex gap-1 rounded-full bg-nen p-1">
          {SAP.map((s) => (
            <button
              key={s.ma}
              onClick={() => setSap(s.ma)}
              className={`h-7 rounded-full px-3 text-[13px] font-medium whitespace-nowrap ${sap === s.ma ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
            >
              {s.ten}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead className="text-chu-phu">
            <tr>
              <th className="py-2 text-left font-medium">Cặp</th>
              <th className="py-2 text-right font-medium">Giá</th>
              <th className="py-2 text-right font-medium">24 giờ</th>
              <th className="py-2 text-right font-medium">Khối lượng 24 giờ</th>
              <th className="py-2 text-right font-medium">Funding</th>
              <th className="py-2 text-right font-medium">Quy năm</th>
            </tr>
          </thead>
          <tbody>
            {hien.map((x) => (
              <tr key={x.ma} className="border-t border-vien">
                <td className="py-2 font-semibold">{x.ma}</td>
                <td className="so py-2 text-right">{gia(x.gia)}</td>
                <td className={`so py-2 text-right ${mau(x.pt24)}`}>{pt(x.pt24)}</td>
                <td className="so py-2 text-right text-chu-phu">{usdGon(x.kl)}</td>
                <td className={`so py-2 text-right font-semibold ${mau(x.funding)}`}>{pt(x.funding, 4)}</td>
                <td className={`so py-2 text-right ${mau(x.funding)}`}>{pt(x.funding * 3 * 365, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-chu-phu">Quy năm ước tính theo chu kỳ 8 giờ (3 lần/ngày); một số cặp thanh toán 4 giờ/lần nên chi phí thực cao hơn.</p>
    </section>
  );
}

// ---------------- Trang chính ----------------
export function PhaiSinhTienSo() {
  const [ma, setMa] = useState("BTC");
  const [khung, setKhung] = useState<Khung>("4h");
  const [du, setDu] = useState<{ ma: string; khung: Khung; d: DuLieuMa } | null>(null);
  const [tt, setTt] = useState<DongThiTruong[] | null>(null);
  const [loi, setLoi] = useState(false);

  const taiLai = useCallback(() => {
    taiMa(ma, khung)
      .then((d) => {
        setDu({ ma, khung, d });
        setLoi(false);
      })
      .catch(() => setLoi(true));
    taiThiTruong()
      .then(setTt)
      .catch(() => {});
  }, [ma, khung]);

  useEffect(() => {
    const id = setTimeout(taiLai, 0);
    return () => clearTimeout(id);
  }, [taiLai]);
  // Tiền số chạy 24/7: làm mới mỗi phút khi tab đang mở
  useLamMoi(taiLai, 60000, { chiTrongPhien: false });

  const d = du?.d;
  const dangTai = !du || du.ma !== ma || du.khung !== khung;
  const oiCuoi = d?.oi.at(-1)?.usd ?? 0;
  const moc24 = d ? d.oi.find((x) => x.t >= (d.oi.at(-1)?.t ?? 0) - 86400) : undefined;
  const oi24 = moc24 && oiCuoi ? (oiCuoi / moc24.usd - 1) * 100 : 0;
  const tkCuoi = d?.lsTaiKhoan.at(-1)?.long ?? 50;
  const topCuoi = d?.lsTop.at(-1)?.long ?? 50;
  const takerCuoi = d?.taker.at(-1);
  const takerTyLe = takerCuoi && takerCuoi.ban ? takerCuoi.mua / takerCuoi.ban : 1;
  const tongTt = tt?.slice(0, 150) ?? [];
  const tyLeDuong = tongTt.length ? (tongTt.filter((x) => x.funding > 0).length / tongTt.length) * 100 : 0;
  const fundingTb = tongTt.length ? tongTt.reduce((s, x) => s + x.funding * x.kl, 0) / tongTt.reduce((s, x) => s + x.kl, 0) : 0;

  const chuoiOi: Chuoi[] = d
    ? [
        { ten: "Open Interest (USD)", kieu: "duong", mauBien: "--nhan", diem: d.oi.map((x) => ({ t: x.t, v: x.usd })) },
        { ten: `Giá ${du.ma}`, kieu: "duong", mauBien: "--chu-phu", trai: true, diem: d.giaNen.map((x) => ({ t: x.t, v: x.dong })) },
      ]
    : [];
  const chuoiFunding: Chuoi[] = d
    ? [
        {
          ten: "Funding mỗi kỳ (%)",
          kieu: "cot",
          mauBien: "--tang",
          diem: d.lichSuFunding.map((x) => ({ t: x.t, v: x.gt, mauBien: x.gt >= 0 ? "--tang" : "--giam" })),
        },
      ]
    : [];
  const chuoiLs: Chuoi[] = d
    ? [
        { ten: "Tỷ lệ tài khoản Long (mọi người)", kieu: "duong", mauBien: "--chu", diem: d.lsTaiKhoan.map((x) => ({ t: x.t, v: x.long })) },
        { ten: "Vị thế Long của top trader", kieu: "duong", mauBien: "--nhan", diem: d.lsTop.map((x) => ({ t: x.t, v: x.long })) },
      ]
    : [];
  const chuoiTaker: Chuoi[] = d
    ? [
        {
          ten: "Mua chủ động trừ bán chủ động (USD)",
          kieu: "cot",
          mauBien: "--tang",
          diem: d.taker.map((x) => {
            const gn = d.giaNen.find((g) => g.t >= x.t)?.dong ?? d.markGia;
            const v = (x.mua - x.ban) * gn;
            return { t: x.t, v, mauBien: v >= 0 ? "--tang" : "--giam" };
          }),
        },
      ]
    : [];

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-nen-phu p-1 [scrollbar-width:none]">
          {COIN.map((c) => (
            <button
              key={c}
              onClick={() => setMa(c)}
              className={`h-8 shrink-0 rounded-full px-4 font-semibold ${ma === c ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full bg-nen-phu p-1">
          {KHUNG.map((k) => (
            <button
              key={k.ma}
              onClick={() => setKhung(k.ma)}
              className={`h-8 rounded-full px-4 font-medium whitespace-nowrap ${khung === k.ma ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
            >
              {k.ten}
            </button>
          ))}
        </div>
      </div>

      {loi && !d ? (
        <p className="rounded-2xl bg-nen-phu p-6 text-chu-phu">
          Không kết nối được Binance Futures. Một số mạng công ty hoặc nhà mạng chặn tên miền này; thử lại sau hoặc đổi mạng.
        </p>
      ) : (
        <div className={`space-y-6 transition-opacity ${dangTai ? "opacity-50" : ""}`}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <The nhan={`Giá ${ma} (mark)`} chinh={d ? gia(d.markGia) : "—"} phu="Hợp đồng vĩnh cửu USDT" />
            <The
              nhan="Funding hiện tại"
              chinh={d ? pt(d.funding, 4) : "—"}
              mauChinh={d ? mau(d.funding) : ""}
              phu={d ? <>Quy năm {pt(d.funding * 3 * 365, 1)} · còn <DemNguoc den={d.fundingKe} /></> : null}
            />
            <The nhan="Open Interest" chinh={d ? usdGon(oiCuoi) : "—"} phu={d ? <span className={mau(oi24)}>{pt(oi24)} trong 24 giờ</span> : null} />
            <The
              nhan="Tài khoản Long / Short"
              chinh={d ? `${so(tkCuoi, 1)} / ${so(100 - tkCuoi, 1)}` : "—"}
              phu={d ? `Top trader: ${so(topCuoi, 1)}% vị thế Long` : null}
            />
            <The
              nhan="Mua / bán chủ động"
              chinh={d ? so(takerTyLe, 2) : "—"}
              mauChinh={d ? mau(takerTyLe - 1) : ""}
              phu={`Kỳ ${KHUNG.find((k) => k.ma === khung)!.ten} gần nhất; trên 1 là bên mua lấn át`}
            />
          </div>

          {d && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Khoi tieuDe="Open Interest và giá" moTa={`Tổng giá trị hợp đồng đang mở, ${KHUNG.find((k) => k.ma === khung)!.moTa} gần nhất.`}>
                <BieuDo chuoi={chuoiOi} dinhDang={dinhDangUsd} />
              </Khoi>
              <Khoi tieuDe="Funding rate" moTa="Mỗi kỳ thanh toán (thường 8 giờ), khoảng 30 ngày gần nhất.">
                <BieuDo chuoi={chuoiFunding} dinhDang={dinhDangPt} />
              </Khoi>
              <Khoi tieuDe="Tỷ lệ Long" moTa="Phần trăm đứng phía Long: theo số tài khoản và theo vị thế của nhóm trader lớn.">
                <BieuDo chuoi={chuoiLs} dinhDang={dinhDangPt1} />
              </Khoi>
              <Khoi tieuDe="Lực mua bán chủ động" moTa="Khối lượng lệnh thị trường mua trừ bán trong mỗi kỳ, quy ra USD.">
                <BieuDo chuoi={chuoiTaker} dinhDang={dinhDangUsd} />
              </Khoi>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <ThanhLyTrucTiep />
        <div className="space-y-4">
          {tt && (
            <div className="grid grid-cols-2 gap-3">
              <The nhan="Funding bình quân (theo khối lượng)" chinh={pt(fundingTb, 4)} mauChinh={mau(fundingTb)} phu="150 cặp lớn nhất" />
              <The nhan="Số cặp funding dương" chinh={`${so(tyLeDuong, 0)}%`} phu="Phe Long đang trả phí cho phe Short" />
            </div>
          )}
          {tt ? <BangFunding ds={tt} /> : <div className="h-64 animate-pulse rounded-3xl bg-nen-phu" />}
        </div>
      </div>
    </div>
  );
}
