"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { capGiaoDich, kiemTraCap, REST, soLe, TrangThaiKetNoi, useLuongBinance } from "@/lib/binance";
import {
  bollinger,
  ema,
  flDongTien,
  flVungGia,
  flXuHuong,
  macd,
  rsi,
  sma,
  type Chuoi,
  type NenCB,
} from "@/lib/chi-bao";
import { useGiaoDien } from "@/lib/giao-dien";

export type Nguon = "ck" | "ts";

type ChiBao = {
  ma: string;
  ten: string;
  moTa: string;
  finlo?: boolean;
  khungRieng?: boolean; // vẽ ở khung riêng bên dưới biểu đồ giá
};

export const CHI_BAO: ChiBao[] = [
  { ma: "kl", ten: "KL", moTa: "Khối lượng giao dịch" },
  { ma: "ma20", ten: "MA20", moTa: "Trung bình động 20 phiên" },
  { ma: "ma50", ten: "MA50", moTa: "Trung bình động 50 phiên" },
  { ma: "ema20", ten: "EMA20", moTa: "Trung bình động hàm mũ 20 phiên" },
  { ma: "bb", ten: "BB", moTa: "Bollinger Bands (20, 2)" },
  { ma: "rsi", ten: "RSI", moTa: "Chỉ số sức mạnh tương đối 14 phiên; trên 70 quá mua, dưới 30 quá bán", khungRieng: true },
  { ma: "macd", ten: "MACD", moTa: "MACD (12, 26, 9)", khungRieng: true },
  {
    ma: "fl-xu-huong",
    ten: "FL Xu hướng",
    moTa: "Chỉ báo Finlo: điểm -100..+100 gộp vị trí giá so với EMA20, EMA20 so với EMA50, MACD và RSI. Cắt lên 0 là tín hiệu mua, cắt xuống là bán.",
    finlo: true,
    khungRieng: true,
  },
  {
    ma: "fl-dong-tien",
    ten: "FL Dòng tiền",
    moTa: "Chỉ báo Finlo: tiền vào/ra 20 phiên theo vị trí giá đóng cửa trong phiên, có trọng số khối lượng. Dương là tiền vào.",
    finlo: true,
    khungRieng: true,
  },
  {
    ma: "fl-vung-gia",
    ten: "FL Vùng giá",
    moTa: "Chỉ báo Finlo: dải EMA20 ± 2 ATR co giãn theo biến động; đánh dấu khi giá phá vỡ lên/thủng xuống.",
    finlo: true,
  },
];

// Màu cố định cho các đường chỉ báo (đọc rõ trên cả nền sáng và tối)
const MAU_DUONG: Record<string, string> = {
  ma20: "#e3a008",
  ma50: "#3b82f6",
  ema20: "#a855f7",
  rsi: "#a855f7",
  macd: "#3b82f6",
  tin: "#e3a008",
};

const KHUNG_TS = [
  { ma: "1m", nhan: "1p" },
  { ma: "15m", nhan: "15p" },
  { ma: "1h", nhan: "1G" },
  { ma: "4h", nhan: "4G" },
  { ma: "1d", nhan: "1N" },
];

const KHOANG_CK = [
  { nhan: "3T", ngay: 90 },
  { nhan: "6T", ngay: 180 },
  { nhan: "1N", ngay: 365 },
  { nhan: "3N", ngay: 365 * 3 },
  { nhan: "Tất cả", ngay: 0 },
];

// ---- Lưu lựa chọn chỉ báo trong trình duyệt ----
const KHOA_CB = "finlo-chi-bao";
const MAC_DINH = ["kl", "ma20", "fl-xu-huong"];
let cbTruoc: string | null = null;
let cbMang: string[] = MAC_DINH;
const docChiBao = () => {
  let s: string | null = null;
  try {
    s = localStorage.getItem(KHOA_CB);
  } catch {
    return MAC_DINH;
  }
  if (s !== cbTruoc) {
    cbTruoc = s;
    try {
      cbMang = s ? (JSON.parse(s) as string[]) : MAC_DINH;
    } catch {
      cbMang = MAC_DINH;
    }
  }
  return cbMang;
};
const dangKyCB = (goi: () => void) => {
  window.addEventListener("finlo-chi-bao", goi);
  return () => window.removeEventListener("finlo-chi-bao", goi);
};
function batTatChiBao(ma: string) {
  const ds = docChiBao();
  const moi = ds.includes(ma) ? ds.filter((x) => x !== ma) : [...ds, ma];
  try {
    localStorage.setItem(KHOA_CB, JSON.stringify(moi));
  } catch {
    // không lưu được thì thôi, lựa chọn chỉ mất khi tải lại trang
  }
  window.dispatchEvent(new Event("finlo-chi-bao"));
}

const mauCss = (ten: string) => getComputedStyle(document.documentElement).getPropertyValue(ten).trim();
const duong = (nen: NenCB[], gt: Chuoi) =>
  nen.flatMap((x, i) => (gt[i] == null ? [] : [{ time: x.time as UTCTimestamp, value: gt[i] as number }]));

type ChuThich = { nen: NenCB; phanTram: number | null; gt: { ten: string; giaTri: string; mau?: string }[] };

export function BieuDoTuongTac({
  nguon,
  ma,
  khiCoNen,
  phienCK = null,
}: {
  nguon: Nguon;
  ma: string;
  khiCoNen?: (nen: NenCB[]) => void; // báo dữ liệu nến đã tải cho khung bên cạnh dùng lại
  // Cổ phiếu: giá trong phiên (ảnh chụp mỗi phút) để cập nhật cây nến hôm nay
  phienCK?: { ngay: string; gia: number; thamChieu: number | null; khoiLuong: number } | null;
}) {
  const khiCoNenRef = useRef(khiCoNen);
  useEffect(() => {
    khiCoNenRef.current = khiCoNen;
  });
  const giaoDien = useGiaoDien();
  const chiBao = useSyncExternalStore(dangKyCB, docChiBao, () => MAC_DINH);
  const [khung, setKhung] = useState(nguon === "ts" ? "1h" : "D");
  const [nenGoc, setNenGoc] = useState<NenCB[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [chuThich, setChuThich] = useState<ChuThich | null>(null);

  const khungRef = useRef<HTMLDivElement>(null);
  const bieuDo = useRef<IChartApi | null>(null);
  const nenSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const klSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const veLai = useRef<((nen: NenCB[]) => void) | null>(null);
  const nenHienTai = useRef<NenCB[]>([]);
  const coMoi = useRef(false);
  // Vùng đang xem, gắn với bộ dữ liệu đã dùng để vẽ (đổi mã/khung thì không áp lại vùng cũ)
  const khoangXem = useRef<{ duLieu: NenCB[]; vung: LogicalRange | null } | null>(null);

  // Đổi mã/nguồn thì về khung mặc định và xoá dữ liệu cũ (điều chỉnh state ngay khi vẽ)
  const [khoaTruoc, setKhoaTruoc] = useState(`${nguon}:${ma}`);
  if (khoaTruoc !== `${nguon}:${ma}`) {
    setKhoaTruoc(`${nguon}:${ma}`);
    setKhung(nguon === "ts" ? "1h" : "D");
    setNenGoc(null);
    setLoi(null);
    setChuThich(null);
  }

  // ---- Tải lịch sử nến ----
  useEffect(() => {
    let huy = false;
    const url =
      nguon === "ck"
        ? `/api/nen/${ma}`
        : `${REST}/klines?symbol=${capGiaoDich(ma)}&interval=${khung}&limit=1000`;
    // Tiền số: chỉ vẽ cặp còn giao dịch trên Binance
    (nguon === "ts" ? kiemTraCap(ma) : Promise.resolve(true))
      .then((co) => (co ? fetch(url) : Promise.reject("khong-giao-dich")))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: unknown) => {
        if (huy) return;
        const nen: NenCB[] =
          nguon === "ck"
            ? (data as NenCB[])
            : (data as [number, string, string, string, string, string][]).map((r) => ({
                time: r[0] / 1000,
                open: +r[1],
                high: +r[2],
                low: +r[3],
                close: +r[4],
                volume: +r[5],
              }));
        if (nen.length === 0) return Promise.reject("rong");
        nenHienTai.current = nen;
        setNenGoc(nen);
        setLoi(null);
        khiCoNenRef.current?.(nen);
      })
      .catch(() => {
        if (!huy) setLoi(`Không có dữ liệu biểu đồ cho ${ma}${nguon === "ts" ? " trên Binance" : ""}.`);
      });
    return () => {
      huy = true;
    };
  }, [nguon, ma, khung]);

  // ---- Dựng biểu đồ (khi có dữ liệu mới, đổi chỉ báo hoặc đổi sáng/tối) ----
  useEffect(() => {
    if (!khungRef.current || !nenGoc) return;
    const tang = mauCss("--tang");
    const giam = mauCss("--giam");
    const vien = mauCss("--vien");
    const nhan = mauCss("--nhan");
    const coCB = (m: string) => chiBao.includes(m);

    const chart = createChart(khungRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: mauCss("--chu-phu"),
        fontFamily: "inherit",
        panes: { separatorColor: vien, separatorHoverColor: nhan },
      },
      grid: { vertLines: { color: vien }, horzLines: { color: vien } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: vien },
      timeScale: { borderColor: vien, timeVisible: nguon === "ts", rightOffset: 6 },
      localization: { locale: "vi-VN" },
    });
    bieuDo.current = chart;

    // Định dạng giá: cổ phiếu hiển thị nghìn đồng, tiền số theo độ lớn giá
    const giaCuoi = nenGoc[nenGoc.length - 1].close;
    const le = soLe(giaCuoi);
    const dinhDangGia =
      nguon === "ck"
        ? { type: "custom" as const, formatter: (p: number) => (p / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), minMove: 10 }
        : { type: "price" as const, precision: le, minMove: 1 / 10 ** le };

    const nen = chart.addSeries(CandlestickSeries, {
      upColor: tang,
      downColor: giam,
      borderVisible: false,
      wickUpColor: tang,
      wickDownColor: giam,
      priceFormat: dinhDangGia,
    });
    nenSeries.current = nen;
    const dauMoc = createSeriesMarkers(nen, []);

    let kl: ISeriesApi<"Histogram"> | null = null;
    if (coCB("kl")) {
      kl = chart.addSeries(HistogramSeries, { priceScaleId: "kl", priceFormat: { type: "volume" }, lastValueVisible: false });
      chart.priceScale("kl").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    }
    klSeries.current = kl;

    const lop = (mau: string, rong: 1 | 2 = 2, kieu: LineStyle = LineStyle.Solid, khung = 0) =>
      chart.addSeries(
        LineSeries,
        {
          color: mau,
          lineWidth: rong,
          lineStyle: kieu,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          priceFormat: khung === 0 ? dinhDangGia : undefined,
        },
        khung,
      );

    // Chỉ báo vẽ đè lên biểu đồ giá
    const ma20 = coCB("ma20") ? lop(MAU_DUONG.ma20) : null;
    const ma50 = coCB("ma50") ? lop(MAU_DUONG.ma50) : null;
    const ema20 = coCB("ema20") ? lop(MAU_DUONG.ema20) : null;
    const bb = coCB("bb")
      ? [lop(mauCss("--chu-phu"), 1, LineStyle.Dashed), lop(mauCss("--chu-phu"), 1), lop(mauCss("--chu-phu"), 1, LineStyle.Dashed)]
      : null;
    const vg = coCB("fl-vung-gia") ? [lop(nhan, 1, LineStyle.Dashed), lop(nhan, 1, LineStyle.Dotted), lop(nhan, 1, LineStyle.Dashed)] : null;

    // Chỉ báo khung riêng, đánh số khung theo thứ tự bật
    let soKhung = 0;
    const khungMoi = () => ++soKhung;
    let rsiS: ISeriesApi<"Line"> | null = null;
    if (coCB("rsi")) {
      const k = khungMoi();
      rsiS = lop(MAU_DUONG.rsi, 2, LineStyle.Solid, k);
      rsiS.createPriceLine({ price: 70, color: giam, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });
      rsiS.createPriceLine({ price: 30, color: tang, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });
    }
    let macdS: { cot: ISeriesApi<"Histogram">; duong: ISeriesApi<"Line">; tin: ISeriesApi<"Line"> } | null = null;
    if (coCB("macd")) {
      const k = khungMoi();
      macdS = {
        cot: chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, k),
        duong: lop(MAU_DUONG.macd, 2, LineStyle.Solid, k),
        tin: lop(MAU_DUONG.tin, 2, LineStyle.Solid, k),
      };
    }
    let xhS: ISeriesApi<"Histogram"> | null = null;
    if (coCB("fl-xu-huong")) {
      xhS = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: true }, khungMoi());
    }
    let dtS: ISeriesApi<"Histogram"> | null = null;
    if (coCB("fl-dong-tien")) {
      dtS = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: true }, khungMoi());
    }
    // Khung giá chiếm phần lớn, mỗi khung chỉ báo khoảng 1/4
    chart.panes().forEach((p, i) => p.setStretchFactor(i === 0 ? 1 : 0.28));

    // Kết quả tính gần nhất, để chú thích theo con trỏ đọc lại
    let ketQua: { ten: string; gt: Chuoi; mau?: string; dinhDang: (x: number) => string }[] = [];
    const theoThoiGian = new Map<number, number>();

    const giaStr = (x: number) =>
      nguon === "ck"
        ? (x / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : x.toLocaleString("vi-VN", { maximumFractionDigits: le });

    const ve = (ds: NenCB[]) => {
      const dong = ds.map((x) => x.close);
      nen.setData(ds.map((x) => ({ time: x.time as UTCTimestamp, open: x.open, high: x.high, low: x.low, close: x.close })));
      kl?.setData(
        ds.map((x) => ({ time: x.time as UTCTimestamp, value: x.volume, color: (x.close >= x.open ? tang : giam) + "55" })),
      );
      theoThoiGian.clear();
      ds.forEach((x, i) => theoThoiGian.set(x.time, i));
      ketQua = [];
      const moc: SeriesMarker<Time>[] = [];

      if (ma20) {
        const g = sma(dong, 20);
        ma20.setData(duong(ds, g));
        ketQua.push({ ten: "MA20", gt: g, mau: MAU_DUONG.ma20, dinhDang: giaStr });
      }
      if (ma50) {
        const g = sma(dong, 50);
        ma50.setData(duong(ds, g));
        ketQua.push({ ten: "MA50", gt: g, mau: MAU_DUONG.ma50, dinhDang: giaStr });
      }
      if (ema20) {
        const g = ema(dong, 20);
        ema20.setData(duong(ds, g));
        ketQua.push({ ten: "EMA20", gt: g, mau: MAU_DUONG.ema20, dinhDang: giaStr });
      }
      if (bb) {
        const b = bollinger(dong);
        bb[0].setData(duong(ds, b.tren));
        bb[1].setData(duong(ds, b.giua));
        bb[2].setData(duong(ds, b.duoi));
        ketQua.push({ ten: "BB trên", gt: b.tren, dinhDang: giaStr }, { ten: "BB dưới", gt: b.duoi, dinhDang: giaStr });
      }
      if (vg) {
        const v = flVungGia(ds);
        vg[0].setData(duong(ds, v.tren));
        vg[1].setData(duong(ds, v.giua));
        vg[2].setData(duong(ds, v.duoi));
        ketQua.push({ ten: "FL Vùng trên", gt: v.tren, mau: nhan, dinhDang: giaStr }, { ten: "FL Vùng dưới", gt: v.duoi, mau: nhan, dinhDang: giaStr });
        for (const t of v.tinHieu)
          moc.push({
            time: t.time as UTCTimestamp,
            position: t.loai === "mua" ? "belowBar" : "aboveBar",
            shape: t.loai === "mua" ? "arrowUp" : "arrowDown",
            color: t.loai === "mua" ? tang : giam,
            text: "VG",
          });
      }
      const so2 = (x: number) => x.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
      if (rsiS) {
        const g = rsi(dong);
        rsiS.setData(duong(ds, g));
        ketQua.push({ ten: "RSI", gt: g, mau: MAU_DUONG.rsi, dinhDang: so2 });
      }
      if (macdS) {
        const m = macd(dong);
        macdS.duong.setData(duong(ds, m.duong));
        macdS.tin.setData(duong(ds, m.tin));
        macdS.cot.setData(
          ds.flatMap((x, i) =>
            m.cot[i] == null ? [] : [{ time: x.time as UTCTimestamp, value: m.cot[i]!, color: (m.cot[i]! >= 0 ? tang : giam) + "99" }],
          ),
        );
        ketQua.push({ ten: "MACD", gt: m.duong, mau: MAU_DUONG.macd, dinhDang: so2 }, { ten: "Tín hiệu", gt: m.tin, mau: MAU_DUONG.tin, dinhDang: so2 });
      }
      if (xhS) {
        const x = flXuHuong(ds);
        xhS.setData(
          ds.flatMap((n, i) =>
            x.diem[i] == null ? [] : [{ time: n.time as UTCTimestamp, value: x.diem[i]!, color: x.diem[i]! >= 0 ? tang : giam }],
          ),
        );
        ketQua.push({ ten: "FL Xu hướng", gt: x.diem, mau: nhan, dinhDang: (v) => v.toFixed(0) });
        for (const t of x.tinHieu)
          moc.push({
            time: t.time as UTCTimestamp,
            position: t.loai === "mua" ? "belowBar" : "aboveBar",
            shape: t.loai === "mua" ? "arrowUp" : "arrowDown",
            color: t.loai === "mua" ? tang : giam,
            text: t.loai === "mua" ? "Mua" : "Bán",
          });
      }
      if (dtS) {
        const g = flDongTien(ds);
        dtS.setData(
          ds.flatMap((n, i) =>
            g[i] == null ? [] : [{ time: n.time as UTCTimestamp, value: g[i]!, color: (g[i]! >= 0 ? tang : giam) + "bb" }],
          ),
        );
        ketQua.push({ ten: "FL Dòng tiền", gt: g, mau: nhan, dinhDang: (v) => v.toFixed(0) });
      }
      moc.sort((a, b) => (a.time as number) - (b.time as number));
      dauMoc.setMarkers(moc);
    };
    ve(nenHienTai.current);
    veLai.current = ve;

    // Giữ nguyên vùng đang xem khi bật/tắt chỉ báo; lần đầu xem khoảng 150 nến gần nhất
    const tong = nenHienTai.current.length;
    const daXem = khoangXem.current?.duLieu === nenGoc ? khoangXem.current.vung : null;
    chart.timeScale().setVisibleLogicalRange(daXem ?? { from: Math.max(0, tong - 150), to: tong + 5 });

    chart.subscribeCrosshairMove((p) => {
      if (!p.time) {
        setChuThich(null);
        return;
      }
      const i = theoThoiGian.get(p.time as number);
      if (i == null) return;
      const ds = nenHienTai.current;
      setChuThich({
        nen: ds[i],
        phanTram: i > 0 ? (ds[i].close / ds[i - 1].close - 1) * 100 : null,
        gt: ketQua.flatMap((k) => (k.gt[i] == null ? [] : [{ ten: k.ten, giaTri: k.dinhDang(k.gt[i]!), mau: k.mau }])),
      });
    });

    return () => {
      khoangXem.current = { duLieu: nenGoc, vung: chart.timeScale().getVisibleLogicalRange() };
      chart.remove();
      bieuDo.current = nenSeries.current = klSeries.current = null;
      veLai.current = null;
    };
  }, [nenGoc, chiBao, giaoDien, nguon]);

  // ---- Tiền số: nến realtime ----
  const nhanTin = useCallback((_: string, duLieu: unknown) => {
    const { k } = duLieu as { k: { t: number; o: string; h: string; l: string; c: string; v: string } };
    const moi: NenCB = { time: k.t / 1000, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
    const ds = nenHienTai.current;
    if (ds.length && ds[ds.length - 1].time === moi.time) ds[ds.length - 1] = moi;
    else if (!ds.length || moi.time > ds[ds.length - 1].time) ds.push(moi);
    // Nến cập nhật ngay; chỉ báo tính lại theo nhịp bên dưới
    nenSeries.current?.update({ time: moi.time as UTCTimestamp, open: moi.open, high: moi.high, low: moi.low, close: moi.close });
    klSeries.current?.update({
      time: moi.time as UTCTimestamp,
      value: moi.volume,
      color: (moi.close >= moi.open ? mauCss("--tang") : mauCss("--giam")) + "55",
    });
    coMoi.current = true;
  }, []);
  const trangThai = useLuongBinance(nguon === "ts" && nenGoc ? [`${capGiaoDich(ma).toLowerCase()}@kline_${khung}`] : [], nhanTin);

  // ---- Cổ phiếu: cây nến hôm nay theo ảnh chụp phiên (mỗi phút) ----
  useEffect(() => {
    if (nguon !== "ck" || !phienCK || !nenGoc || phienCK.gia <= 0) return;
    const ds = nenHienTai.current;
    const [y, m, d] = phienCK.ngay.split("-").map(Number);
    // Nến ngày của mofi đánh dấu lúc 0h giờ Việt Nam (UTC+7)
    const lucNgay = Date.UTC(y, m - 1, d) / 1000 - 7 * 3600;
    const cuoi = ds[ds.length - 1];
    let moi: NenCB;
    if (cuoi && cuoi.time === lucNgay) {
      moi = {
        ...cuoi,
        close: phienCK.gia,
        high: Math.max(cuoi.high, phienCK.gia),
        low: Math.min(cuoi.low, phienCK.gia),
        volume: Math.max(cuoi.volume, phienCK.khoiLuong),
      };
      ds[ds.length - 1] = moi;
    } else if (!cuoi || lucNgay > cuoi.time) {
      const mo = phienCK.thamChieu ?? phienCK.gia;
      moi = {
        time: lucNgay,
        open: mo,
        high: Math.max(mo, phienCK.gia),
        low: Math.min(mo, phienCK.gia),
        close: phienCK.gia,
        volume: phienCK.khoiLuong,
      };
      ds.push(moi);
    } else return;
    nenSeries.current?.update({ time: moi.time as UTCTimestamp, open: moi.open, high: moi.high, low: moi.low, close: moi.close });
    klSeries.current?.update({
      time: moi.time as UTCTimestamp,
      value: moi.volume,
      color: (moi.close >= moi.open ? mauCss("--tang") : mauCss("--giam")) + "55",
    });
    coMoi.current = true;
  }, [nguon, phienCK, nenGoc]);

  // Tính lại chỉ báo mỗi 2 giây nếu có nến mới (tránh tính lại với từng tin)
  useEffect(() => {
    const id = setInterval(() => {
      if (!coMoi.current || !veLai.current) return;
      coMoi.current = false;
      veLai.current(nenHienTai.current);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const datKhoang = (ngay: number) => {
    const chart = bieuDo.current;
    const ds = nenHienTai.current;
    if (!chart || !ds.length) return;
    if (ngay === 0) return chart.timeScale().fitContent();
    const cuoi = ds[ds.length - 1].time;
    chart.timeScale().setVisibleRange({ from: (cuoi - ngay * 86400) as UTCTimestamp, to: cuoi as UTCTimestamp });
  };

  const soKhungPhu = CHI_BAO.filter((c) => c.khungRieng && chiBao.includes(c.ma)).length;
  const cuoi = nenGoc?.[nenGoc.length - 1];
  const hien = chuThich ?? (cuoi ? { nen: cuoi, phanTram: null, gt: [] } : null);
  const giaHien = (x: number) =>
    nguon === "ck"
      ? (x / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : x.toLocaleString("vi-VN", { maximumFractionDigits: soLe(x) });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-vien px-2 py-2">
        <div className="flex border border-vien">
          {nguon === "ts"
            ? KHUNG_TS.map((k) => (
                <button
                  key={k.ma}
                  onClick={() => setKhung(k.ma)}
                  className={`h-7 px-2.5 font-medium ${khung === k.ma ? "bg-nhan text-white" : "text-chu-phu hover:text-chu"}`}
                >
                  {k.nhan}
                </button>
              ))
            : KHOANG_CK.map((k) => (
                <button key={k.nhan} onClick={() => datKhoang(k.ngay)} className="h-7 px-2.5 font-medium text-chu-phu hover:text-chu">
                  {k.nhan}
                </button>
              ))}
        </div>
        {nguon === "ts" && <TrangThaiKetNoi trangThai={trangThai} />}
        {nguon === "ck" && <span className="text-[12px] text-chu-phu">Nến ngày, giá nghìn đồng</span>}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-vien px-2 py-1.5">
        {CHI_BAO.map((c) => {
          const bat = chiBao.includes(c.ma);
          return (
            <button
              key={c.ma}
              onClick={() => batTatChiBao(c.ma)}
              title={c.moTa}
              className={`h-7 border px-2 text-[12px] font-medium ${
                bat
                  ? c.finlo
                    ? "border-nhan bg-nhan text-white"
                    : "border-chu bg-chu text-nen"
                  : c.finlo
                    ? "border-nhan/50 text-nhan hover:bg-nhan-nhat"
                    : "border-vien text-chu-phu hover:text-chu"
              }`}
            >
              {c.ten}
            </button>
          );
        })}
      </div>

      <div className="relative flex-1">
        {hien && (
          <div className="pointer-events-none absolute top-1 left-2 z-10 flex max-w-[calc(100%-80px)] flex-wrap gap-x-3 gap-y-0.5 text-[12px] tabular-nums">
            <span className="text-chu-phu">
              {new Date(hien.nen.time * 1000).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                day: "2-digit",
                month: "2-digit",
                year: nguon === "ck" ? "numeric" : undefined,
                hour: nguon === "ts" ? "2-digit" : undefined,
                minute: nguon === "ts" ? "2-digit" : undefined,
              })}
            </span>
            <span>
              <span className="text-chu-phu">Mở </span>
              {giaHien(hien.nen.open)}
            </span>
            <span>
              <span className="text-chu-phu">Cao </span>
              <span className="text-tang">{giaHien(hien.nen.high)}</span>
            </span>
            <span>
              <span className="text-chu-phu">Thấp </span>
              <span className="text-giam">{giaHien(hien.nen.low)}</span>
            </span>
            <span>
              <span className="text-chu-phu">Đóng </span>
              <span className="font-semibold">{giaHien(hien.nen.close)}</span>
            </span>
            {hien.phanTram != null && (
              <span className={hien.phanTram >= 0 ? "text-tang" : "text-giam"}>
                {hien.phanTram >= 0 ? "+" : ""}
                {hien.phanTram.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%
              </span>
            )}
            {hien.gt.map((g) => (
              <span key={g.ten}>
                <span style={{ color: g.mau }} className={g.mau ? "" : "text-chu-phu"}>
                  {g.ten}{" "}
                </span>
                {g.giaTri}
              </span>
            ))}
          </div>
        )}
        {loi ? (
          <div className="flex h-[480px] items-center justify-center px-6 text-center text-chu-phu">{loi}</div>
        ) : (
          <>
            {!nenGoc && <div className="absolute inset-0 animate-pulse bg-nen-phu" />}
            <div ref={khungRef} style={{ height: 480 + soKhungPhu * 130 }} className="w-full" />
          </>
        )}
      </div>
    </div>
  );
}
