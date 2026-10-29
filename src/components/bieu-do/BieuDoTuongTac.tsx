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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThanhChiBao, thamSoCua, useChiBaoDangBat, useThamSoChiBao } from "@/components/bieu-do/ChiBaoChon";
import { TIM_CHI_BAO, type ChiBao, type DinhDang, type NguCanh } from "@/lib/bo-chi-bao";
import { capGiaoDich, kiemTraCap, REST, soLe, TrangThaiKetNoi, useLuongBinance } from "@/lib/binance";
import { flGiaTri, type MocGiaTri, type Chuoi, type NenCB } from "@/lib/chi-bao";
import { useGiaoDien } from "@/lib/giao-dien";

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
  const chiBaoDangBat = useChiBaoDangBat();
  const bangTs = useThamSoChiBao();
  // Chỉ báo đang bật dùng được với nguồn hiện tại (chỉ báo cơ bản chỉ có ở cổ phiếu)
  const chiBao = useMemo(
    () => chiBaoDangBat.map((m) => TIM_CHI_BAO.get(m)).filter((c): c is ChiBao => !!c && (nguon === "ck" || !c.chiCoPhieu)),
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

  const batGiaTri = nguon === "ck" && chiBao.some((c) => c.ma === "fl-gia-tri");
  const canDinhGia = nguon === "ck" && chiBao.some((c) => c.can === "dinh-gia");
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
      rightPriceScale: { borderColor: vien },
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

    const nc: NguCanh = {
      nguon,
      mau: { tang, giam, nhan, phu: mauCss("--chu-phu") },
      dinhGia: giaTriCuaMa,
      noiBo: noiBoCuaMa,
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
            : (x: number) => soViet(x);
      return { type: "custom" as const, formatter: f, tickmarksFormatter: (ds: number[]) => ds.map(f), minMove: 0.01 };
    };

    // Tạo series cho từng chỉ báo theo kết quả tính lần đầu; chỉ báo khung riêng mỗi cái một khung
    type Ve1 = { c: ChiBao; ts: Record<string, number>; series: (ISeriesApi<"Line"> | ISeriesApi<"Histogram">)[] };
    const dsVe: Ve1[] = [];
    let soKhung = 0;
    let klS: ISeriesApi<"Histogram"> | null = null;
    for (const c of chiBao) {
      const tsC = thamSoCua(c, bangTs);
      const kq = c.tinh(nenHienTai.current, tsC, nc);
      if (!kq) continue;
      const khungSo = c.khung === "rieng" ? ++soKhung : 0;
      const tyLe = c.khung === "kl" ? { priceScaleId: "kl" } : {};
      const series = kq.ve.map((v) => {
        const dd = v.dinhDang === "gia" ? dinhDangGia : dinhDangKhac(v.dinhDang);
        if (v.loai === "cot")
          return chart.addSeries(
            HistogramSeries,
            { priceLineVisible: false, lastValueVisible: c.khung === "rieng", priceFormat: dd, ...tyLe },
            khungSo,
          );
        return chart.addSeries(
          LineSeries,
          {
            color: v.mau,
            lineWidth: v.rong ?? 2,
            lineStyle: NET[v.net ?? "lien"],
            lineVisible: !v.chiCham,
            pointMarkersVisible: !!v.chiCham,
            pointMarkersRadius: 1.5,
            priceLineVisible: false,
            lastValueVisible: c.khung === "rieng",
            crosshairMarkerVisible: false,
            priceFormat: dd,
            ...tyLe,
          },
          khungSo,
        );
      });
      if (c.khung === "kl") {
        chart.priceScale("kl").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        klS = series[0] as ISeriesApi<"Histogram">;
      }
      for (const m of kq.muc ?? [])
        series[0]?.createPriceLine({ price: m.gia, color: m.mau, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });
      dsVe.push({ c, ts: tsC, series });
    }
    klSeries.current = klS;
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
    };

    const ve = (ds: NenCB[]) => {
      nen.setData(ds.map((x) => ({ time: x.time as UTCTimestamp, open: x.open, high: x.high, low: x.low, close: x.close })));
      theoThoiGian.clear();
      ds.forEach((x, i) => theoThoiGian.set(x.time, i));
      ketQua = [];
      const moc: SeriesMarker<Time>[] = [];
      for (const l of duongNgang) nen.removePriceLine(l);
      duongNgang = [];

      for (const { c, ts, series } of dsVe) {
        const kq = c.tinh(ds, ts, nc);
        if (!kq) continue;
        kq.ve.forEach((v, i) => {
          const s = series[i];
          if (!s) return;
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
  }, [nenGoc, chiBao, bangTs, giaoDien, nguon, giaTriCuaMa, noiBoCuaMa]);

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

  const soKhungPhu = chiBao.filter((c) => c.khung === "rieng").length;
  // Tóm tắt FL Giá trị cho nhãn góc phải biểu đồ
  const tomTatGiaTri = useMemo(
    () => (batGiaTri && nenGoc && giaTriCuaMa ? flGiaTri(nenGoc, giaTriCuaMa.moc, giaTriCuaMa.loai, giaTriCuaMa.peNganh) : null),
    [batGiaTri, nenGoc, giaTriCuaMa],
  );
  const cuoi = nenGoc?.[nenGoc.length - 1];
  const hien = chuThich ?? (cuoi ? { nen: cuoi, phanTram: null, gt: [] } : null);
  const giaHien = (x: number) =>
    nguon === "ck"
      ? (x / 1000).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : x.toLocaleString("vi-VN", { maximumFractionDigits: soLe(x) });

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
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
        {nguon === "ts" && <TrangThaiKetNoi trangThai={trangThai} />}
        {nguon === "ck" && <span className="text-[12px] text-chu-phu">Nến ngày, giá nghìn đồng</span>}
      </div>

      <ThanhChiBao coPhieu={nguon === "ck"} />

      {/* Biểu đồ giãn hết chiều cao còn lại; màn hình nhỏ (không giới hạn chiều cao) dùng chiều cao tối thiểu */}
      <div className="relative min-h-0 flex-1" style={{ minHeight: 440 + soKhungPhu * 120 }}>
        {tomTatGiaTri && tomTatGiaTri.diem != null && (
          <div className="pointer-events-none absolute top-1 right-16 z-10 hidden rounded-lg border border-nhan bg-nen/90 px-2 py-1 text-[11px] tabular-nums sm:block">
            <p className="font-semibold text-nhan">FL Giá trị · {tomTatGiaTri.thuoc}</p>
            <p>
              {tomTatGiaTri.thuoc} hiện tại <b>{tomTatGiaTri.boiNay?.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</b>
              {" · "}trung vị {tomTatGiaTri.p50.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
              {tomTatGiaTri.peNganh != null && <> · ngành {tomTatGiaTri.peNganh.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</>}
            </p>
            <p>
              Đắt hơn <b>{Math.round(tomTatGiaTri.diem)}%</b> lịch sử
              {tomTatGiaTri.chenh != null && (
                <>
                  {" · "}
                  <b className={tomTatGiaTri.chenh < 0 ? "text-tang" : "text-giam"}>
                    {tomTatGiaTri.chenh < 0 ? "thấp" : "cao"} hơn hợp lý {Math.abs(tomTatGiaTri.chenh).toFixed(0)}%
                  </b>
                </>
              )}
            </p>
          </div>
        )}
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
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-chu-phu">{loi}</div>
        ) : (
          <>
            {!nenGoc && <div className="absolute inset-0 animate-pulse bg-nen-phu" />}
            <div ref={khungRef} className="absolute inset-0" />
          </>
        )}
      </div>
    </div>
  );
}
