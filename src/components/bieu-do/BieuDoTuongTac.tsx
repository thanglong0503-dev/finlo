"use client";

import {
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type SeriesMarker,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThanhChiBao, thamSoCua, useChiBaoDangBat, useThamSoChiBao } from "@/components/bieu-do/ChiBaoChon";
import { VeHinh } from "@/components/bieu-do/VeHinh";
import { dungDuoc, TIM_CHI_BAO, type ChiBao, type DinhDang, type NguCanh } from "@/lib/bo-chi-bao";
import { capGiaoDich, kiemTraCap, REST, soLe, TrangThaiKetNoi, useLuongBinance } from "@/lib/binance";
import { flGiaTri, type MocGiaTri, type Chuoi, type NenCB } from "@/lib/chi-bao";
import { useGiaoDien } from "@/lib/giao-dien";
import { taiPhaiSinh, type DuLieuPhaiSinh } from "@/lib/phai-sinh-bieu-do";
import { lucNgayVN, suKienCuaNguon, type SuKienBieuDo } from "@/lib/su-kien-bieu-do";

export type Nguon = "ck" | "ts";

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

type KieuBieuDo = "nen" | "nen-rong" | "thanh" | "duong" | "vung" | "ha";
const KIEU: { ma: KieuBieuDo; ten: string }[] = [
  { ma: "nen", ten: "Nến" },
  { ma: "nen-rong", ten: "Nến rỗng" },
  { ma: "thanh", ten: "Thanh OHLC" },
  { ma: "duong", ten: "Đường" },
  { ma: "vung", ten: "Vùng" },
  { ma: "ha", ten: "Heikin-Ashi" },
];
type ChuKy = "D" | "W" | "M";
const CHU_KY: { ma: ChuKy; ten: string }[] = [
  { ma: "D", ten: "Ngày" },
  { ma: "W", ten: "Tuần" },
  { ma: "M", ten: "Tháng" },
];

// Gộp nến ngày thành nến tuần (từ thứ Hai) hoặc tháng, theo giờ Việt Nam
function gopNen(ds: NenCB[], ck: ChuKy): NenCB[] {
  if (ck === "D") return ds;
  const kq: NenCB[] = [];
  let khoaTruoc = "";
  for (const x of ds) {
    const d = new Date((x.time + 7 * 3600) * 1000);
    let khoa: string;
    if (ck === "M") khoa = d.toISOString().slice(0, 7);
    else {
      const thu = (d.getUTCDay() + 6) % 7;
      khoa = new Date(d.getTime() - thu * 864e5).toISOString().slice(0, 10);
    }
    const cuoi = kq[kq.length - 1];
    if (khoa !== khoaTruoc || !cuoi) {
      kq.push({ ...x });
      khoaTruoc = khoa;
    } else {
      cuoi.high = Math.max(cuoi.high, x.high);
      cuoi.low = Math.min(cuoi.low, x.low);
      cuoi.close = x.close;
      cuoi.volume += x.volume;
      if (x.muaCD != null) cuoi.muaCD = (cuoi.muaCD ?? 0) + x.muaCD;
    }
  }
  return kq;
}

// Nến Heikin-Ashi: làm mượt để thấy xu hướng rõ hơn (chỉ dùng để hiển thị, chỉ báo vẫn tính trên giá thật)
function heikinAshi(ds: NenCB[]): NenCB[] {
  const kq: NenCB[] = [];
  ds.forEach((x, i) => {
    const close = (x.open + x.high + x.low + x.close) / 4;
    const open = i === 0 ? (x.open + x.close) / 2 : (kq[i - 1].open + kq[i - 1].close) / 2;
    kq.push({ time: x.time, open, close, high: Math.max(x.high, open, close), low: Math.min(x.low, open, close), volume: x.volume });
  });
  return kq;
}

const mauCss = (ten: string) => getComputedStyle(document.documentElement).getPropertyValue(ten).trim();
const duong = (nen: NenCB[], gt: Chuoi) =>
  nen.flatMap((x, i) => (gt[i] == null ? [] : [{ time: x.time as UTCTimestamp, value: gt[i] as number }]));

type ChuThich = {
  nen: NenCB;
  phanTram: number | null;
  gt: { ten: string; giaTri: string; mau?: string }[];
  x?: number; // vị trí con trỏ để đặt khung thông tin
  y?: number;
  suKien?: SuKienBieuDo[]; // sự kiện lớn rơi vào cây nến này
};

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
  const chiBaoDangBat = useChiBaoDangBat();
  const bangTs = useThamSoChiBao();
  // Chỉ báo đang bật dùng được với nguồn hiện tại (chỉ báo cơ bản chỉ có ở cổ phiếu)
  const chiBao = useMemo(
    () => chiBaoDangBat.map((m) => TIM_CHI_BAO.get(m)).filter((c): c is ChiBao => !!c && dungDuoc(c, nguon)),
    [chiBaoDangBat, nguon],
  );
  const [khung, setKhung] = useState(nguon === "ts" ? "1h" : "D");
  const [nenGoc, setNenGoc] = useState<NenCB[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [chuThich, setChuThich] = useState<ChuThich | null>(null);
  // Mốc định giá theo quý cho FL Giá trị (chỉ cổ phiếu, chỉ tải khi bật chỉ báo)
  const [dinhGia, setDinhGia] = useState<{ ma: string; loai: string; moc: MocGiaTri[]; peNganh: number | null } | null>(null);
  // Giao dịch nội bộ đã thực hiện (chỉ tải khi bật chỉ báo Giao dịch nội bộ)
  const [noiBo, setNoiBo] = useState<{ ma: string; ds: NonNullable<NguCanh["noiBo"]> } | null>(null);
  // Dữ liệu phái sinh Binance Futures (chỉ tiền số, chỉ tải khi bật chỉ báo Long/Short)
  const [phaiSinh, setPhaiSinh] = useState<{ khoa: string; d: DuLieuPhaiSinh | null } | null>(null);
  // Vùng xám và mốc sự kiện lớn trên biểu đồ
  const [hienSuKien, setHienSuKien] = useState(true);

  const khungRef = useRef<HTMLDivElement>(null);
  const bieuDo = useRef<IChartApi | null>(null);
  const nenSeries = useRef<ISeriesApi<SeriesType> | null>(null);
  // Cập nhật nhanh cây nến cuối (khi đang xem nến ngày thường); khung khác thì vẽ lại theo nhịp
  const capNhatNhanh = useRef<((moi: NenCB) => void) | null>(null);
  const tramRef = useRef<HTMLDivElement>(null);
  const [kieu, setKieu] = useState<KieuBieuDo>("nen");
  const [chuKy, setChuKy] = useState<ChuKy>("D");
  const [thangLog, setThangLog] = useState(false);
  const [thanhVe, setThanhVe] = useState<{ chart: IChartApi; series: ISeriesApi<SeriesType>; ds: NenCB[] } | null>(null);
  const klSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
  const veLai = useRef<((nen: NenCB[]) => void) | null>(null);
  const nenHienTai = useRef<NenCB[]>([]);
  const coMoi = useRef(false);
  // Vùng đang xem, gắn với bộ dữ liệu đã dùng để vẽ (đổi mã/khung thì không áp lại vùng cũ)
  const khoangXem = useRef<{ duLieu: NenCB[]; khoa: string; vung: LogicalRange | null } | null>(null);

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
            : (data as [number, string, string, string, string, string, number, string, number, string][]).map((r) => ({
                time: r[0] / 1000,
                open: +r[1],
                high: +r[2],
                low: +r[3],
                close: +r[4],
                volume: +r[5],
                muaCD: +r[9],
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

  const batGiaTri = nguon === "ck" && chiBao.some((c) => c.ma === "fl-gia-tri");
  const canDinhGia = nguon === "ck";
  const canNoiBo = nguon === "ck" && chiBao.some((c) => c.can === "noi-bo");
  useEffect(() => {
    if (!canDinhGia || dinhGia?.ma === ma) return;
    let huy = false;
    fetch(`/api/dinh-gia/${ma}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { loai: string; moc: MocGiaTri[]; peNganh: number | null } | null) => {
        if (!huy && d) setDinhGia({ ma, ...d });
      })
      .catch(() => {});
    return () => {
      huy = true;
    };
  }, [canDinhGia, ma, dinhGia?.ma]);
  const giaTriCuaMa = dinhGia?.ma === ma ? dinhGia : null;

  useEffect(() => {
    if (!canNoiBo || noiBo?.ma === ma) return;
    let huy = false;
    fetch(`/api/noi-bo/${ma}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NonNullable<NguCanh["noiBo"]> | null) => {
        if (!huy && d) setNoiBo({ ma, ds: d });
      })
      .catch(() => {});
    return () => {
      huy = true;
    };
  }, [canNoiBo, ma, noiBo?.ma]);
  const noiBoCuaMa = noiBo?.ma === ma ? noiBo.ds : null;

  const khoaPhaiSinh = `${ma}:${khung}`;
  const canPhaiSinh = nguon === "ts" && chiBao.some((c) => c.can === "phai-sinh");
  useEffect(() => {
    if (!canPhaiSinh || phaiSinh?.khoa === khoaPhaiSinh) return;
    let huy = false;
    taiPhaiSinh(ma, khung).then((d) => {
      if (!huy) setPhaiSinh({ khoa: khoaPhaiSinh, d });
    });
    return () => {
      huy = true;
    };
  }, [canPhaiSinh, ma, khung, khoaPhaiSinh, phaiSinh?.khoa]);
  const phaiSinhCuaMa = nguon === "ts" && phaiSinh?.khoa === khoaPhaiSinh ? phaiSinh.d : null;
  const khongCoPhaiSinh = canPhaiSinh && phaiSinh?.khoa === khoaPhaiSinh && !phaiSinh.d;

  // ---- Dựng biểu đồ (khi có dữ liệu mới, đổi chỉ báo hoặc đổi sáng/tối) ----
  useEffect(() => {
    if (!khungRef.current || !nenGoc) return;
    const tang = mauCss("--tang");
    const giam = mauCss("--giam");
    const vien = mauCss("--vien");
    const nhan = mauCss("--nhan");

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
      rightPriceScale: { borderColor: vien, mode: thangLog ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal },
      timeScale: { borderColor: vien, timeVisible: nguon === "ts", rightOffset: 6 },
      localization: { locale: "vi-VN" },
    });
    bieuDo.current = chart;

    // Định dạng giá: cổ phiếu hiển thị nghìn đồng, tiền số theo độ lớn giá
    const giaCuoi = nenGoc[nenGoc.length - 1].close;
    const le = soLe(giaCuoi);
    // Giá theo kiểu Việt Nam (1.234,56) cho cả nhãn và vạch chia trục; cổ phiếu hiển thị theo nghìn đồng
    const vietGia = (p: number) =>
      nguon === "ck"
        ? (p / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : p.toLocaleString("vi-VN", { minimumFractionDigits: le, maximumFractionDigits: le });
    const dinhDangGia = {
      type: "custom" as const,
      formatter: vietGia,
      tickmarksFormatter: (ds: number[]) => ds.map(vietGia),
      minMove: nguon === "ck" ? 10 : 1 / 10 ** le,
    };

    // Series giá chính theo kiểu biểu đồ đang chọn
    const laOHLC = kieu === "nen" || kieu === "nen-rong" || kieu === "ha" || kieu === "thanh";
    const nen: ISeriesApi<SeriesType> =
      kieu === "thanh"
        ? chart.addSeries(BarSeries, { upColor: tang, downColor: giam, thinBars: false, priceFormat: dinhDangGia })
        : kieu === "duong"
          ? chart.addSeries(LineSeries, { color: nhan, lineWidth: 2, priceFormat: dinhDangGia })
          : kieu === "vung"
            ? chart.addSeries(AreaSeries, { lineColor: nhan, topColor: nhan + "55", bottomColor: nhan + "05", lineWidth: 2, priceFormat: dinhDangGia })
            : chart.addSeries(CandlestickSeries, {
                upColor: kieu === "nen-rong" ? "transparent" : tang,
                downColor: giam,
                borderVisible: kieu === "nen-rong",
                borderUpColor: tang,
                borderDownColor: giam,
                wickUpColor: tang,
                wickDownColor: giam,
                priceFormat: dinhDangGia,
              });
    nenSeries.current = nen;
    const diemNen = (x: NenCB) =>
      laOHLC
        ? { time: x.time as UTCTimestamp, open: x.open, high: x.high, low: x.low, close: x.close }
        : { time: x.time as UTCTimestamp, value: x.close };
    const dauMoc = createSeriesMarkers(nen, []);

    const nc: NguCanh = {
      nguon,
      mau: { tang, giam, nhan, phu: mauCss("--chu-phu"), chu: mauCss("--chu") },
      dinhGia: giaTriCuaMa,
      noiBo: noiBoCuaMa,
      phaiSinh: phaiSinhCuaMa,
    };
    const NET = { lien: LineStyle.Solid, dut: LineStyle.Dashed, cham: LineStyle.Dotted } as const;
    // Trục các khung chỉ báo cũng ghi số kiểu Việt Nam
    const soViet = (x: number, chuSo = 2) => x.toLocaleString("vi-VN", { minimumFractionDigits: chuSo, maximumFractionDigits: chuSo });
    const dinhDangKhac = (d: DinhDang) => {
      const f =
        d === "kl"
          ? (x: number) => x.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 1 })
          : d === "pt"
            ? (x: number) => `${soViet(x)}%`
            : d === "pt4"
              ? (x: number) => `${soViet(x, 4)}%`
              : (x: number) => soViet(x);
      return { type: "custom" as const, formatter: f, tickmarksFormatter: (ds: number[]) => ds.map(f), minMove: d === "pt4" ? 0.0001 : 0.01 };
    };

    // Vùng xám sự kiện: cột cao kín khung giá trên thang riêng 0..1, không ảnh hưởng thang giá
    const dsSuKien = hienSuKien ? suKienCuaNguon(nguon) : [];
    const vungSuKien = dsSuKien.some((x) => x.den)
      ? chart.addSeries(HistogramSeries, {
          priceScaleId: "su-kien",
          priceLineVisible: false,
          lastValueVisible: false,
          base: 0,
          autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 1 } }),
        })
      : null;
    if (vungSuKien) chart.priceScale("su-kien").applyOptions({ scaleMargins: { top: 0, bottom: 0 }, visible: false });
    const mauVung = giaoDien === "toi" ? "rgba(148,163,184,0.13)" : "rgba(100,116,139,0.12)";

    // Tạo series cho từng chỉ báo theo kết quả tính lần đầu; chỉ báo khung riêng mỗi cái một khung
    type MotSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram"> | ISeriesApi<"Area">;
    // Mỗi phần vẽ có thể cần nhiều series (vùng tô = hai vùng trên/dưới)
    type Ve1 = { c: ChiBao; ts: Record<string, number>; series: MotSeries[][] };
    const khongDoiThang = () => null;
    const dsVe: Ve1[] = [];
    let soKhung = 0;
    let klS: ISeriesApi<"Histogram"> | null = null;
    for (const c of chiBao) {
      const tsC = thamSoCua(c, bangTs);
      const kq = c.tinh(nenHienTai.current, tsC, nc);
      if (!kq) continue;
      const khungSo = c.khung === "rieng" ? ++soKhung : 0;
      const tyLe = c.khung === "kl" ? { priceScaleId: "kl" } : {};
      const series = kq.ve.map((v): MotSeries[] => {
        if (v.loai === "vung") {
          // Hai vùng tô: dưới đường (rẻ) và trên đường (đắt); không tham gia tính thang giá
          const vung = (mau: string, tren: boolean) =>
            chart.addSeries(
              AreaSeries,
              {
                lineVisible: false,
                lineColor: "transparent",
                topColor: mau + (tren ? "08" : "38"),
                bottomColor: mau + (tren ? "38" : "08"),
                invertFilledArea: tren,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
                autoscaleInfoProvider: khongDoiThang,
                // Cùng định dạng với giá để trục và nhãn không bị đổi sang số thô
                priceFormat: khungSo === 0 ? dinhDangGia : undefined,
              },
              khungSo,
            );
          return [vung(v.mauDuoi, false), vung(v.mauTren, true)];
        }
        const dd = v.dinhDang === "gia" ? dinhDangGia : dinhDangKhac(v.dinhDang);
        if (v.loai === "cot")
          return [chart.addSeries(
            HistogramSeries,
            { priceLineVisible: false, lastValueVisible: c.khung === "rieng", priceFormat: dd, ...tyLe },
            khungSo,
          )];
        return [chart.addSeries(
          LineSeries,
          {
            color: v.mau,
            lineWidth: v.rong ?? 2,
            lineStyle: NET[v.net ?? "lien"],
            lineVisible: !v.chiCham,
            pointMarkersVisible: !!v.chiCham,
            pointMarkersRadius: 1.5,
            priceLineVisible: false,
            lastValueVisible: c.khung === "rieng" || !!v.nhan,
            title: v.nhan ?? "",
            crosshairMarkerVisible: false,
            priceFormat: dd,
            ...tyLe,
          },
          khungSo,
        )];
      });
      if (c.khung === "kl") {
        chart.priceScale("kl").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        klS = series[0][0] as ISeriesApi<"Histogram">;
      }
      for (const m of kq.muc ?? [])
        series[0]?.[0]?.createPriceLine({ price: m.gia, color: m.mau, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });
      dsVe.push({ c, ts: tsC, series });
    }
    klSeries.current = klS;
    // Nến luôn vẽ trên cùng (đè lên vùng tô và đường chỉ báo)
    nen.setSeriesOrder(chart.panes()[0].getSeries().length - 1);
    // Khung giá chiếm phần lớn, mỗi khung chỉ báo khoảng 1/4
    chart.panes().forEach((p, i) => p.setStretchFactor(i === 0 ? 1 : 0.28));

    // Kết quả tính gần nhất, để chú thích theo con trỏ đọc lại
    let ketQua: { ten: string; gt: Chuoi; mau?: string; dinhDang: (x: number) => string }[] = [];
    const theoThoiGian = new Map<number, number>();
    let duongNgang: ReturnType<typeof nen.createPriceLine>[] = [];

    const giaStr = (x: number) =>
      nguon === "ck"
        ? (x / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : x.toLocaleString("vi-VN", { maximumFractionDigits: le });
    const DINH_DANG: Record<DinhDang, (x: number) => string> = {
      gia: giaStr,
      so: (x) => x.toLocaleString("vi-VN", { maximumFractionDigits: 2 }),
      kl: (x) => x.toLocaleString("vi-VN", { notation: "compact", maximumFractionDigits: 2 }),
      pt: (x) => `${x.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`,
      pt4: (x) => `${x.toLocaleString("vi-VN", { maximumFractionDigits: 4 })}%`,
    };

    let dsCuoi: NenCB[] = [];
    const suKienTai = new Map<number, SuKienBieuDo[]>();
    const ve = (dsGoc: NenCB[]) => {
      const ds = gopNen(dsGoc, chuKy);
      dsCuoi = ds;
      nen.setData((kieu === "ha" ? heikinAshi(ds) : ds).map(diemNen) as never);
      // Lớp vẽ hình cần biểu đồ và dữ liệu đang hiển thị (đặt ngoài nhịp vẽ của React)
      requestAnimationFrame(() => setThanhVe({ chart, series: nen, ds }));
      theoThoiGian.clear();
      ds.forEach((x, i) => theoThoiGian.set(x.time, i));
      ketQua = [];
      const moc: SeriesMarker<Time>[] = [];
      // Sự kiện: vùng xám cho khoảng thời gian, mốc chữ ở cây nến đầu tiên của sự kiện
      suKienTai.clear();
      if (dsSuKien.length && ds.length) {
        const buoc = ds.length > 1 ? ds[1].time - ds[0].time : 86400;
        const vung = new Array<boolean>(ds.length).fill(false);
        for (const sk of dsSuKien) {
          const tu = lucNgayVN(sk.tu);
          const den = sk.den ? lucNgayVN(sk.den) + 86400 : tu + 86400;
          if (den <= ds[0].time || tu > ds[ds.length - 1].time + buoc) continue;
          let dau = -1;
          ds.forEach((x, i) => {
            if (x.time + buoc > tu && x.time < den) {
              if (dau < 0) dau = i;
              if (sk.den) vung[i] = true;
              suKienTai.set(i, [...(suKienTai.get(i) ?? []), sk]);
            }
          });
          // Nến ngày nghỉ (cuối tuần, lễ): gắn vào phiên kế tiếp
          if (dau < 0) {
            dau = ds.findIndex((x) => x.time >= tu);
            if (dau < 0 || ds[dau].time - tu > 7 * 86400) continue;
            suKienTai.set(dau, [...(suKienTai.get(dau) ?? []), sk]);
          }
          moc.push({ time: ds[dau].time as UTCTimestamp, position: "aboveBar", shape: "square", size: 0.6, color: nc.mau.phu, text: sk.chu });
        }
        vungSuKien?.setData(
          ds.map((x, i) => (vung[i] ? { time: x.time as UTCTimestamp, value: 1, color: mauVung } : { time: x.time as UTCTimestamp })),
        );
      }
      for (const l of duongNgang) nen.removePriceLine(l);
      duongNgang = [];

      for (const { c, ts, series } of dsVe) {
        const kq = c.tinh(ds, ts, nc);
        if (!kq) continue;
        kq.ve.forEach((v, i) => {
          const nhom = series[i];
          if (!nhom) return;
          const s = nhom[0];
          if (v.loai === "vung") {
            for (const x of nhom) x.setData(duong(ds, v.gt));
            return;
          }
          if (v.loai === "cot")
            s.setData(
              ds.flatMap((x, j) => (v.gt[j] == null ? [] : [{ time: x.time as UTCTimestamp, value: v.gt[j]!, color: v.mau(v.gt[j]!, j) }])),
            );
          else s.setData(duong(ds, v.gt));
          ketQua.push({ ten: v.ten, gt: v.gt, mau: v.loai === "duong" ? v.mau : undefined, dinhDang: DINH_DANG[v.dinhDang] });
        });
        for (const m of kq.mucGia ?? [])
          duongNgang.push(
            nen.createPriceLine({ price: m.gia, color: m.mau, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: m.nhan }),
          );
        for (const m of kq.moc ?? [])
          moc.push({
            time: m.time as UTCTimestamp,
            position: m.len ? "belowBar" : "aboveBar",
            shape: m.len ? "arrowUp" : "arrowDown",
            color: m.mau,
            text: m.chu,
          });
      }
      moc.sort((a, b) => (a.time as number) - (b.time as number));
      dauMoc.setMarkers(moc);
    };
    ve(nenHienTai.current);
    veLai.current = ve;
    capNhatNhanh.current =
      chuKy === "D" && kieu !== "ha"
        ? (moi) => {
            nen.update(diemNen(moi) as never);
            klSeries.current?.update({
              time: moi.time as UTCTimestamp,
              value: moi.volume,
              color: (moi.close >= moi.open ? tang : giam) + "55",
            });
          }
        : null;

    // Giữ nguyên vùng đang xem khi bật/tắt chỉ báo; lần đầu xem khoảng 150 nến gần nhất
    const tong = dsCuoi.length;
    const daXem = khoangXem.current?.duLieu === nenGoc && khoangXem.current.khoa === chuKy ? khoangXem.current.vung : null;
    chart.timeScale().setVisibleLogicalRange(daXem ?? { from: Math.max(0, tong - 150), to: tong + 5 });

    chart.subscribeCrosshairMove((p) => {
      if (!p.time) {
        setChuThich(null);
        return;
      }
      const i = theoThoiGian.get(p.time as number);
      if (i == null) return;
      const ds = dsCuoi;
      setChuThich({
        nen: ds[i],
        phanTram: i > 0 ? (ds[i].close / ds[i - 1].close - 1) * 100 : null,
        gt: ketQua.flatMap((k) => (k.gt[i] == null ? [] : [{ ten: k.ten, giaTri: k.dinhDang(k.gt[i]!), mau: k.mau }])),
        x: p.point?.x,
        y: p.point?.y,
        suKien: suKienTai.get(i),
      });
    });

    return () => {
      khoangXem.current = { duLieu: nenGoc, khoa: chuKy, vung: chart.timeScale().getVisibleLogicalRange() };
      chart.remove();
      bieuDo.current = nenSeries.current = klSeries.current = null;
      veLai.current = null;
      capNhatNhanh.current = null;
      setThanhVe(null);
    };
  }, [nenGoc, chiBao, bangTs, giaoDien, nguon, giaTriCuaMa, noiBoCuaMa, phaiSinhCuaMa, kieu, chuKy, thangLog, hienSuKien]);

  // ---- Tiền số: nến realtime ----
  const nhanTin = useCallback((_: string, duLieu: unknown) => {
    const { k } = duLieu as { k: { t: number; o: string; h: string; l: string; c: string; v: string; V: string } };
    const moi: NenCB = { time: k.t / 1000, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v, muaCD: +k.V };
    const ds = nenHienTai.current;
    if (ds.length && ds[ds.length - 1].time === moi.time) ds[ds.length - 1] = moi;
    else if (!ds.length || moi.time > ds[ds.length - 1].time) ds.push(moi);
    // Nến cập nhật ngay; chỉ báo tính lại theo nhịp bên dưới
    capNhatNhanh.current?.(moi);
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
    capNhatNhanh.current?.(moi);
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

  const soKhungPhu = chiBao.filter((c) => c.khung === "rieng").length;
  // Tóm tắt FL Giá trị cho dòng chú thích trên biểu đồ
  const tomTatGiaTri = useMemo(
    () => (batGiaTri && nenGoc && giaTriCuaMa ? flGiaTri(nenGoc, giaTriCuaMa.moc, giaTriCuaMa.loai, giaTriCuaMa.peNganh) : null),
    [batGiaTri, nenGoc, giaTriCuaMa],
  );
  // Câu tóm tắt kiểu "giá hôm nay rẻ hơn X% số phiên trong N năm qua" cho FL Giá trị
  const camNhanGiaTri = useMemo(() => {
    const g = tomTatGiaTri;
    if (!g || g.diem == null || !nenGoc || !giaTriCuaMa) return null;
    const i = nenGoc.length - 1;
    const re = g.re[i];
    const thuongLe = re != null ? (re * g.p50) / g.p20 : null;
    const dauTien = Math.min(...giaTriCuaMa.moc.map((m) => m.tu));
    const soNam = Math.max(1, Math.round((nenGoc[i].time - Math.max(dauTien, nenGoc[0].time)) / (365 * 86400)));
    return {
      thuoc: g.thuoc,
      soVoi: g.thuoc === "P/E" ? "so với lợi nhuận" : "so với tài sản",
      re: g.diem < 50,
      phanTram: Math.round(g.diem < 50 ? 100 - g.diem : g.diem),
      soNam,
      thuongLe,
      chenh: thuongLe ? (nenGoc[i].close / thuongLe - 1) * 100 : null,
      boiNay: g.boiNay,
      p50: g.p50,
      peNganh: g.peNganh,
    };
  }, [tomTatGiaTri, nenGoc, giaTriCuaMa]);
  const cuoi = nenGoc?.[nenGoc.length - 1];
  const hien = chuThich ?? (cuoi ? { nen: cuoi, phanTram: null, gt: [] } : null);

  const boiSo = useMemo(() => {
    if (nguon !== "ck" || !nenGoc || !giaTriCuaMa?.moc.length) return null;
    const moc = [...giaTriCuaMa.moc].sort((a, b) => a.tu - b.tu);
    const neoTai = (t: number) => {
      let j = -1;
      while (j + 1 < moc.length && moc[j + 1].tu <= t) j++;
      return j >= 0 ? moc[j] : null;
    };
    const cuoiMoc = moc[moc.length - 1];
    const theoPB = ["ngan_hang", "chung_khoan", "bao_hiem"].includes(giaTriCuaMa.loai) || !(cuoiMoc.eps && cuoiMoc.eps > 0);
    const lichSu: number[] = [];
    let j = -1;
    for (const x of nenGoc) {
      while (j + 1 < moc.length && moc[j + 1].tu <= x.time) j++;
      const neo = j >= 0 ? (theoPB ? moc[j].bvps : moc[j].eps) : null;
      if (neo && neo > 0) lichSu.push(x.close / neo);
    }
    lichSu.sort((a, b) => a - b);
    return { theoPB, neoTai, lichSu };
  }, [nguon, nenGoc, giaTriCuaMa]);

  // Khung thông tin tại cây nến đang rê: P/E, P/B, ROE, nắm giữ tới nay, rẻ/đắt so với lịch sử
  const theNen = (() => {
    if (!chuThich || chuThich.x == null || !cuoi) return null;
    const n = chuThich.nen;
    const nam = (cuoi.time - n.time) / (365.25 * 86400);
    const giu = nam >= 1 ? ((cuoi.close / n.close) ** (1 / nam) - 1) * 100 : (cuoi.close / n.close - 1) * 100;
    const neo = boiSo?.neoTai(n.time) ?? null;
    const pe = neo?.eps && neo.eps > 0 ? n.close / neo.eps : null;
    const pb = neo?.bvps && neo.bvps > 0 ? n.close / neo.bvps : null;
    const roe = neo?.eps != null && neo.bvps ? (neo.eps / neo.bvps) * 100 : null;
    const boi = boiSo ? (boiSo.theoPB ? pb : pe) : null;
    const viTri =
      boi != null && boiSo && boiSo.lichSu.length > 20 ? (boiSo.lichSu.filter((v) => v < boi).length / boiSo.lichSu.length) * 100 : null;
    return { n, nam, giu, pe, pb, roe, viTri, thuoc: boiSo?.theoPB ? "P/B" : "P/E", soPhien: boiSo?.lichSu.length ?? 0 };
  })();

  const chupAnh = () => {
    const anh = bieuDo.current?.takeScreenshot();
    if (!anh) return;
    const a = document.createElement("a");
    a.download = `finlo-${ma}-${new Date(cuoi?.time ? cuoi.time * 1000 : 0).toISOString().slice(0, 10)}.png`;
    a.href = anh.toDataURL("image/png");
    a.click();
  };
  const toanManHinh = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else tramRef.current?.requestFullscreen?.();
  };
  const nutCC = "flex h-8 w-8 items-center justify-center rounded-full text-chu-phu hover:bg-nen-noi hover:text-chu";
  const giaHien = (x: number) =>
    nguon === "ck"
      ? (x / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : x.toLocaleString("vi-VN", { maximumFractionDigits: soLe(x) });

  return (
    <div ref={tramRef} className="flex h-full min-h-0 flex-1 flex-col bg-nen">
      <div className="flex flex-wrap items-center gap-2 border-b border-vien px-2 py-2">
        <div className="flex gap-1 rounded-full bg-nen-noi p-1">
          {nguon === "ts"
            ? KHUNG_TS.map((k) => (
                <button
                  key={k.ma}
                  onClick={() => setKhung(k.ma)}
                  className={`h-7 rounded-full px-2.5 font-medium ${khung === k.ma ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
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
        {nguon === "ck" && (
          <div className="flex gap-1 rounded-full bg-nen-noi p-1">
            {CHU_KY.map((k) => (
              <button
                key={k.ma}
                onClick={() => setChuKy(k.ma)}
                className={`h-7 rounded-full px-2.5 font-medium ${chuKy === k.ma ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
              >
                {k.ten}
              </button>
            ))}
          </div>
        )}
        <select
          value={kieu}
          onChange={(e) => setKieu(e.target.value as KieuBieuDo)}
          aria-label="Kiểu biểu đồ"
          className="h-9 rounded-full border border-vien bg-nen px-3 text-[13px] font-medium outline-none focus:border-nhan"
        >
          {KIEU.map((k) => (
            <option key={k.ma} value={k.ma}>
              {k.ten}
            </option>
          ))}
        </select>
        <button
          onClick={() => setThangLog((x) => !x)}
          title="Thang logarit: hợp để xem biến động % trong thời gian dài"
          className={`h-8 rounded-full px-3 text-[12px] font-semibold ${thangLog ? "bg-chu text-nen" : "text-chu-phu hover:bg-nen-noi hover:text-chu"}`}
        >
          Log
        </button>
        <button
          onClick={() => setHienSuKien((x) => !x)}
          title="Vùng xám: khủng hoảng, thiên nga đen; mốc nhỏ: tin tài chính quan trọng. Rê chuột vào nến để xem chi tiết."
          className={`h-8 rounded-full px-3 text-[12px] font-semibold ${hienSuKien ? "bg-chu text-nen" : "text-chu-phu hover:bg-nen-noi hover:text-chu"}`}
        >
          Sự kiện
        </button>
        {nguon === "ts" && <TrangThaiKetNoi trangThai={trangThai} />}
        <div className="ml-auto flex items-center gap-1">
          {nguon === "ck" && <span className="mr-2 hidden text-[12px] text-chu-phu xl:inline">Giá nghìn đồng</span>}
          <button onClick={chupAnh} title="Chụp ảnh biểu đồ" aria-label="Chụp ảnh biểu đồ" className={nutCC}>
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M3 6.5h3l1.5-2h5L14 6.5h3v9H3z" />
              <circle cx="10" cy="11" r="2.8" />
            </svg>
          </button>
          <button onClick={toanManHinh} title="Toàn màn hình" aria-label="Toàn màn hình" className={nutCC}>
            <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M3 7.5V3h4.5M12.5 3H17v4.5M17 12.5V17h-4.5M7.5 17H3v-4.5" />
            </svg>
          </button>
        </div>
      </div>

      <ThanhChiBao coPhieu={nguon === "ck"} />
      {khongCoPhaiSinh && (
        <p className="border-b border-vien px-3 py-1.5 text-[12px] text-chu-phu">
          {ma} chưa có hợp đồng vĩnh cửu trên Binance Futures nên các chỉ báo Long/Short, Open Interest, funding không có dữ liệu.
        </p>
      )}

      {/* Biểu đồ giãn hết chiều cao còn lại; màn hình nhỏ (không giới hạn chiều cao) dùng chiều cao tối thiểu */}
      <div className="relative min-h-0 flex-1" style={{ minHeight: 440 + soKhungPhu * 120 }}>
        {hien && (
          <div className="pointer-events-none absolute top-1 left-12 z-10 flex max-w-[calc(100%-120px)] flex-wrap gap-x-3 gap-y-0.5 text-[12px] tabular-nums">
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
            {camNhanGiaTri && (
              <span className="mt-1 flex basis-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-vien bg-nen/85 px-3 py-1.5 text-[12px] backdrop-blur-sm">
                <span className="font-semibold">
                  FL Giá trị · {camNhanGiaTri.thuoc} <span className="font-normal text-chu-phu">{camNhanGiaTri.soVoi}</span>
                </span>
                <span>
                  Giá hôm nay{" "}
                  {camNhanGiaTri.phanTram >= 99 ? (
                    <>
                      <b className={camNhanGiaTri.re ? "text-tang" : "text-giam"}>{camNhanGiaTri.re ? "rẻ nhất" : "đắt nhất"}</b> trong{" "}
                      {camNhanGiaTri.soNam} năm qua
                    </>
                  ) : (
                    <>
                      <b className={camNhanGiaTri.re ? "text-tang" : "text-giam"}>
                        {camNhanGiaTri.re ? "rẻ" : "đắt"} hơn {camNhanGiaTri.phanTram}%
                      </b>{" "}
                      số phiên trong {camNhanGiaTri.soNam} năm qua
                    </>
                  )}
                </span>
                {camNhanGiaTri.thuongLe != null && camNhanGiaTri.chenh != null && (
                  <span className="text-chu-phu">
                    Thường lệ <b className="text-chu">{giaHien(camNhanGiaTri.thuongLe)}</b> (
                    <span className={camNhanGiaTri.chenh < 0 ? "text-tang" : "text-giam"}>
                      {camNhanGiaTri.chenh > 0 ? "+" : ""}
                      {camNhanGiaTri.chenh.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
                    </span>
                    ) · {camNhanGiaTri.thuoc} {camNhanGiaTri.boiNay?.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}, trung vị{" "}
                    {camNhanGiaTri.p50.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
                    {camNhanGiaTri.peNganh != null && <>, ngành {camNhanGiaTri.peNganh.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}</>}
                  </span>
                )}
                <span className="flex items-center gap-3 text-chu-phu">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-tang/40" /> rẻ so với chính {ma}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-giam/40" /> đắt so với chính {ma}
                  </span>
                </span>
              </span>
            )}
          </div>
        )}
        {loi ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-chu-phu">{loi}</div>
        ) : (
          <>
            {!nenGoc && <div className="absolute inset-0 animate-pulse bg-nen-phu" />}
            <div ref={khungRef} className="absolute inset-0" />
            {thanhVe && (
              <VeHinh
                chart={thanhVe.chart}
                series={thanhVe.series}
                nen={thanhVe.ds}
                khoa={`finlo-ve:${nguon}:${ma}:${nguon === "ck" ? chuKy : khung}`}
                dinhDang={giaHien}
              />
            )}
            {theNen && (
              <div
                className="pointer-events-none absolute z-20 w-60 rounded-2xl border border-vien bg-nen-phu/95 p-3 text-[12px] shadow-2xl backdrop-blur-md"
                style={{
                  left: Math.max(48, (theNen && chuThich?.x != null ? chuThich.x : 0) + (chuThich!.x! > 520 ? -256 : 20)),
                  top: Math.max(8, Math.min((chuThich!.y ?? 0) + 16, 9999)),
                }}
              >
                <p className="flex justify-between">
                  <span className="text-chu-phu">
                    {new Date(theNen.n.time * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                  </span>
                  <b className="tabular-nums">{giaHien(theNen.n.close)}</b>
                </p>
                {nguon === "ck" && (
                  <dl className="mt-2 space-y-1 border-t border-vien pt-2 tabular-nums">
                    {(
                      [
                        ["P/E", theNen.pe],
                        ["P/B", theNen.pb],
                        ["ROE", theNen.roe],
                      ] as const
                    ).map(([ten, v]) => (
                      <div key={ten} className="flex justify-between">
                        <dt className="text-chu-phu">{ten}</dt>
                        <dd className="font-semibold">
                          {v == null ? "—" : `${v.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${ten === "ROE" ? "%" : ""}`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {theNen.nam > 0.02 && (
                  <div className="mt-2 flex justify-between border-t border-vien pt-2">
                    <span className="text-chu-phu">Giữ tới nay</span>
                    <span className="text-right">
                      <b className={theNen.giu >= 0 ? "text-tang" : "text-giam"}>
                        {theNen.giu >= 0 ? "+" : ""}
                        {theNen.giu.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%{theNen.nam >= 1 ? "/năm" : ""}
                      </b>
                      <span className="block text-[11px] text-chu-phu">
                        {theNen.nam >= 1
                          ? `${theNen.nam.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} năm`
                          : `${Math.round(theNen.nam * 365)} ngày`}
                      </span>
                    </span>
                  </div>
                )}
                {chuThich?.suKien?.map((sk) => (
                  <div key={sk.ten} className="mt-2 border-t border-vien pt-2">
                    <p className="font-semibold">{sk.ten}</p>
                    <p className="text-[11px] text-chu-phu">
                      {sk.tu.split("-").reverse().join("/")}
                      {sk.den ? ` – ${sk.den.split("-").reverse().join("/")}` : ""}
                    </p>
                    <p className="mt-1 leading-snug text-chu-phu">{sk.moTa}</p>
                  </div>
                ))}
                {theNen.viTri != null && (
                  <div className="mt-2 border-t border-vien pt-2">
                    <p className="flex justify-between">
                      <span className="text-chu-phu">{theNen.thuoc} {theNen.viTri < 50 ? "rẻ hơn" : "đắt hơn"}</span>
                      <b className={theNen.viTri < 50 ? "text-tang" : "text-giam"}>
                        {Math.round(theNen.viTri < 50 ? 100 - theNen.viTri : theNen.viTri)}% số phiên
                      </b>
                    </p>
                    <div className="relative mt-2 h-1.5 rounded-full bg-gradient-to-r from-tang/60 via-vien to-giam/60">
                      <span className="absolute -top-1 h-3.5 w-1 -translate-x-1/2 rounded-full bg-chu" style={{ left: `${theNen.viTri}%` }} />
                    </div>
                    <p className="mt-1 flex justify-between text-[11px] text-chu-phu">
                      <span>rẻ</span>
                      <span>{theNen.soPhien.toLocaleString("vi-VN")} phiên</span>
                      <span>đắt</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
