"use client";

import type { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { NenCB } from "@/lib/chi-bao";

// Công cụ vẽ trên biểu đồ: hình được lưu theo (chỉ số nến, giá) nên bám đúng chỗ khi kéo, phóng to.
// Lớp SVG phủ lên khung giá; thanh công cụ dọc nằm bên trái.

export type CongCu = "tro" | "xu-huong" | "tia" | "ngang" | "doc" | "chu-nhat" | "fib" | "do" | "chu";
type Diem = { l: number; p: number }; // l: chỉ số nến (logical), p: giá
type Hinh = { id: string; loai: Exclude<CongCu, "tro">; a: Diem; b?: Diem; chu?: string };

const MOT_DIEM: CongCu[] = ["ngang", "doc", "chu"];
const FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

const docHinh = (khoa: string): Hinh[] => {
  try {
    return JSON.parse(localStorage.getItem(khoa) ?? "[]") as Hinh[];
  } catch {
    return [];
  }
};
const ghiHinh = (khoa: string, ds: Hinh[]) => {
  try {
    localStorage.setItem(khoa, JSON.stringify(ds));
  } catch {
    // không lưu được thì hình chỉ mất khi tải lại trang
  }
};

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

const CONG_CU: { ma: CongCu; ten: string; icon: ReactNode }[] = [
  { ma: "tro", ten: "Con trỏ", icon: <Icon><path d="M10 3v14M3 10h14" /></Icon> },
  { ma: "xu-huong", ten: "Đường xu hướng", icon: <Icon><path d="M4 16 16 4" /><circle cx="4" cy="16" r="1.6" /><circle cx="16" cy="4" r="1.6" /></Icon> },
  { ma: "tia", ten: "Tia (kéo dài về phải)", icon: <Icon><path d="M4 15 18 6" /><circle cx="4" cy="15" r="1.6" /></Icon> },
  { ma: "ngang", ten: "Đường ngang", icon: <Icon><path d="M2 10h16" /><circle cx="10" cy="10" r="1.6" /></Icon> },
  { ma: "doc", ten: "Đường dọc", icon: <Icon><path d="M10 2v16" /><circle cx="10" cy="10" r="1.6" /></Icon> },
  { ma: "chu-nhat", ten: "Hình chữ nhật (vùng giá)", icon: <Icon><rect x="3.5" y="5.5" width="13" height="9" rx="1" /></Icon> },
  { ma: "fib", ten: "Fibonacci thoái lui", icon: <Icon><path d="M3 4h14M3 8h14M3 12h14M3 16h14" /></Icon> },
  { ma: "do", ten: "Thước đo (% và số phiên)", icon: <Icon><path d="M3 14 14 3l3 3L6 17z" /><path d="M7 10l1.5 1.5M9.5 7.5 11 9" /></Icon> },
  { ma: "chu", ten: "Ghi chú chữ", icon: <Icon><path d="M5 5h10M10 5v11" /></Icon> },
];

export function VeHinh({
  chart,
  series,
  nen,
  khoa,
  dinhDang,
}: {
  chart: IChartApi | null;
  series: ISeriesApi<SeriesType> | null;
  nen: NenCB[];
  khoa: string; // khoá lưu hình theo mã
  dinhDang: (gia: number) => string;
}) {
  const [congCu, setCongCu] = useState<CongCu>("tro");
  const [namCham, setNamCham] = useState(true);
  const [an, setAn] = useState(false);
  const [moThanh, setMoThanh] = useState(false); // điện thoại: thanh công cụ thu gọn thành một nút
  const [hinh, setHinh] = useState<Hinh[]>([]);
  const [dangVe, setDangVe] = useState<{ loai: CongCu; a: Diem } | null>(null);
  const [con, setCon] = useState<Diem | null>(null); // vị trí con trỏ khi đang vẽ
  const [chon, setChon] = useState<string | null>(null);
  const [, setNhip] = useState(0); // tăng để vẽ lại khi biểu đồ cuộn/phóng
  const [rong, setRong] = useState(0);
  const svg = useRef<SVGSVGElement>(null);

  // Đổi mã thì nạp hình của mã đó (điều chỉnh state ngay khi vẽ)
  const [khoaTruoc, setKhoaTruoc] = useState<string | null>(null);
  if (khoaTruoc !== khoa) {
    setKhoaTruoc(khoa);
    setHinh(typeof window === "undefined" ? [] : docHinh(khoa));
    setDangVe(null);
    setChon(null);
  }

  const luu = (ds: Hinh[]) => {
    setHinh(ds);
    ghiHinh(khoa, ds);
  };

  // Vẽ lại theo biểu đồ: kiểm tra mỗi khung hình xem trục có đổi không (cuộn, phóng, đổi thang giá)
  useEffect(() => {
    if (!chart || !series) return;
    let truoc = "";
    let id = 0;
    const lap = () => {
      const r = chart.timeScale().getVisibleLogicalRange();
      const y = series.priceToCoordinate(nen.at(-1)?.close ?? 0);
      const w = svg.current?.clientWidth ?? 0;
      const k = `${r?.from}|${r?.to}|${y}|${w}`;
      if (k !== truoc) {
        truoc = k;
        setRong(w);
        setNhip((n) => n + 1);
      }
      id = requestAnimationFrame(lap);
    };
    id = requestAnimationFrame(lap);
    return () => cancelAnimationFrame(id);
  }, [chart, series, nen]);

  // Phím Delete xoá hình đang chọn, Esc huỷ thao tác
  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "Escape") {
        setDangVe(null);
        setChon(null);
        setCongCu("tro");
      }
      if ((e.key === "Delete" || e.key === "Backspace") && chon) {
        luu(hinh.filter((h) => h.id !== chon));
        setChon(null);
      }
    };
    window.addEventListener("keydown", phim);
    return () => window.removeEventListener("keydown", phim);
  });

  if (!chart || !series) return null;
  const ts = chart.timeScale();
  const X = (l: number) => ts.logicalToCoordinate(l as never) ?? -9999;
  const Y = (p: number) => series.priceToCoordinate(p) ?? -9999;

  const tuToaDo = (x: number, y: number): Diem | null => {
    const l = ts.coordinateToLogical(x);
    const p = series.coordinateToPrice(y);
    if (l == null || p == null) return null;
    if (!namCham) return { l, p };
    // Nam châm: hút về chỉ số nến tròn và mức mở/cao/thấp/đóng gần nhất
    const i = Math.round(l);
    const x0 = nen[Math.min(Math.max(i, 0), nen.length - 1)];
    if (!x0 || i < 0 || i >= nen.length) return { l: i, p };
    const gan = [x0.open, x0.high, x0.low, x0.close].reduce((a, b) => (Math.abs(Y(b) - y) < Math.abs(Y(a) - y) ? b : a));
    return { l: i, p: Math.abs(Y(gan) - y) < 14 ? gan : p };
  };

  const viTri = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return tuToaDo(e.clientX - r.left, e.clientY - r.top);
  };

  const bam = (e: React.PointerEvent) => {
    if (congCu === "tro") return;
    const d = viTri(e);
    if (!d) return;
    const id = String(Math.max(0, ...hinh.map((h) => Number(h.id) || 0)) + 1);
    if (MOT_DIEM.includes(congCu)) {
      let chu: string | undefined;
      if (congCu === "chu") {
        chu = window.prompt("Nội dung ghi chú")?.trim();
        if (!chu) return;
      }
      luu([...hinh, { id, loai: congCu as Hinh["loai"], a: d, chu }]);
      setCongCu("tro");
      return;
    }
    if (!dangVe) setDangVe({ loai: congCu, a: d });
    else {
      luu([...hinh, { id, loai: dangVe.loai as Hinh["loai"], a: dangVe.a, b: d }]);
      setDangVe(null);
      setCon(null);
      setCongCu("tro");
    }
  };

  // Nhãn đỉnh/đáy trong vùng đang xem
  const vung = ts.getVisibleLogicalRange();
  let dinh: { i: number; p: number } | null = null;
  let day: { i: number; p: number } | null = null;
  if (vung) {
    for (let i = Math.max(0, Math.ceil(vung.from)); i <= Math.min(nen.length - 1, Math.floor(vung.to)); i++) {
      if (!dinh || nen[i].high > dinh.p) dinh = { i, p: nen[i].high };
      if (!day || nen[i].low < day.p) day = { i, p: nen[i].low };
    }
  }

  const ve = (h: Hinh, xem = false) => {
    const chonNay = h.id === chon;
    const mau = chonNay ? "var(--nhan)" : h.loai === "do" ? "#3b82f6" : h.loai === "fib" ? "var(--chu-phu)" : "var(--chu)";
    const net = { stroke: mau, strokeWidth: chonNay ? 2.5 : 1.5, fill: "none" };
    const xa = X(h.a.l);
    const ya = Y(h.a.p);
    const b = h.b;
    const xb = b ? X(b.l) : xa;
    const yb = b ? Y(b.p) : ya;
    const chonHinh = xem
      ? {}
      : {
          onPointerDown: (e: React.PointerEvent) => {
            if (congCu !== "tro") return;
            e.stopPropagation();
            setChon(h.id);
          },
          style: { pointerEvents: congCu === "tro" ? ("stroke" as const) : ("none" as const), cursor: "pointer" },
        };
    switch (h.loai) {
      case "xu-huong":
        return <line key={h.id} x1={xa} y1={ya} x2={xb} y2={yb} {...net} {...chonHinh} />;
      case "tia": {
        const k = xb !== xa ? (yb - ya) / (xb - xa) : 0;
        const xc = xb >= xa ? rong : 0;
        return <line key={h.id} x1={xa} y1={ya} x2={xc} y2={ya + k * (xc - xa)} {...net} {...chonHinh} />;
      }
      case "ngang":
        return (
          <g key={h.id}>
            <line x1={0} y1={ya} x2={rong} y2={ya} {...net} strokeDasharray="6 4" {...chonHinh} />
            <text x={rong - 4} y={ya - 4} textAnchor="end" fontSize="11" fill={mau}>
              {dinhDang(h.a.p)}
            </text>
          </g>
        );
      case "doc":
        return <line key={h.id} x1={xa} y1={0} x2={xa} y2={9999} {...net} strokeDasharray="6 4" {...chonHinh} />;
      case "chu-nhat":
        return (
          <rect
            key={h.id}
            x={Math.min(xa, xb)}
            y={Math.min(ya, yb)}
            width={Math.abs(xb - xa)}
            height={Math.abs(yb - ya)}
            {...net}
            fill="color-mix(in srgb, var(--nhan) 10%, transparent)"
            {...chonHinh}
            style={{ ...(chonHinh as { style?: object }).style, pointerEvents: congCu === "tro" ? "all" : "none" }}
          />
        );
      case "fib": {
        if (!b) return null;
        const x0 = Math.min(xa, xb);
        return (
          <g key={h.id}>
            {FIB.map((f) => {
              const p = b.p + (h.a.p - b.p) * f;
              const y = Y(p);
              return (
                <g key={f}>
                  <line x1={x0} y1={y} x2={rong} y2={y} {...net} strokeWidth={1} {...chonHinh} />
                  <text x={x0 + 4} y={y - 3} fontSize="10" fill={mau}>
                    {(f * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% · {dinhDang(p)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      }
      case "do": {
        if (!b) return null;
        const pt = (b.p / h.a.p - 1) * 100;
        const soPhien = Math.round(b.l - h.a.l);
        const mauDo = pt >= 0 ? "var(--tang)" : "var(--giam)";
        return (
          <g key={h.id}>
            <rect
              x={Math.min(xa, xb)}
              y={Math.min(ya, yb)}
              width={Math.abs(xb - xa)}
              height={Math.abs(yb - ya)}
              fill={`color-mix(in srgb, ${mauDo} 14%, transparent)`}
              stroke={mauDo}
              strokeWidth={1}
              {...chonHinh}
              style={{ ...(chonHinh as { style?: object }).style, pointerEvents: congCu === "tro" ? "all" : "none" }}
            />
            <text x={(xa + xb) / 2} y={Math.min(ya, yb) - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill={mauDo}>
              {pt >= 0 ? "+" : ""}
              {pt.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}% · {dinhDang(b.p - h.a.p)} · {Math.abs(soPhien)} phiên
            </text>
          </g>
        );
      }
      case "chu":
        return (
          <text key={h.id} x={xa} y={ya} fontSize="12" fontWeight="600" fill={mau} {...chonHinh} style={{ cursor: "pointer", pointerEvents: congCu === "tro" ? "all" : "none" }}>
            {h.chu}
          </text>
        );
    }
  };

  const nhanCucTri = (c: { i: number; p: number } | null, len: boolean) => {
    if (!c) return null;
    const x = X(c.i);
    const y = Y(c.p) + (len ? -8 : 16);
    const benPhai = x < rong * 0.7;
    return (
      <text x={benPhai ? x + 6 : x - 6} y={y} textAnchor={benPhai ? "start" : "end"} fontSize="11" fill="var(--chu-phu)">
        {benPhai ? `← ${dinhDang(c.p)}` : `${dinhDang(c.p)} →`}
      </text>
    );
  };

  const xemTruoc: Hinh | null = dangVe && con ? { id: "xem", loai: dangVe.loai as Hinh["loai"], a: dangVe.a, b: con } : null;

  return (
    <>
      {/* Lớp vẽ: chỉ bắt chuột khi đang dùng công cụ, còn lại để biểu đồ kéo/phóng bình thường */}
      <svg
        ref={svg}
        className="absolute inset-0 z-[5] h-full w-full overflow-hidden"
        style={{ pointerEvents: congCu === "tro" ? "none" : "all", cursor: congCu === "tro" ? "default" : "crosshair" }}
        onPointerDown={bam}
        onPointerMove={(e) => dangVe && setCon(viTri(e))}
      >
        {!an && hinh.map((h) => ve(h))}
        {xemTruoc && ve(xemTruoc, true)}
        {nhanCucTri(dinh, true)}
        {nhanCucTri(day, false)}
      </svg>

      {/* Thanh công cụ dọc bên trái. Điện thoại: thu thành một nút ở góc dưới để không che dòng giá phía trên */}
      <div className="absolute bottom-8 left-1 z-20 flex flex-col gap-0.5 rounded-xl border border-vien bg-nen/90 p-0.5 backdrop-blur-sm sm:top-2 sm:bottom-auto">
        <button
          title={moThanh ? "Thu gọn công cụ vẽ" : "Công cụ vẽ"}
          aria-label={moThanh ? "Thu gọn công cụ vẽ" : "Công cụ vẽ"}
          aria-expanded={moThanh}
          onClick={() => setMoThanh((x) => !x)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg sm:hidden ${moThanh || congCu !== "tro" ? "text-nhan" : "text-chu-phu"}`}
        >
          <Icon>
            {moThanh ? <path d="M5 5l10 10M15 5 5 15" /> : <path d="M4 16l2-6 8-8 4 4-8 8-6 2zM12 4l4 4" />}
          </Icon>
        </button>
        <div className={`${moThanh ? "flex" : "hidden"} flex-col gap-0.5 sm:flex`}>
        {CONG_CU.map((c) => (
          <button
            key={c.ma}
            title={c.ten}
            aria-label={c.ten}
            onClick={() => {
              setCongCu(c.ma);
              setDangVe(null);
              setChon(null);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${congCu === c.ma ? "bg-chu text-nen" : "text-chu-phu hover:bg-nen-noi hover:text-chu"}`}
          >
            {c.icon}
          </button>
        ))}
        <span className="mx-1.5 my-0.5 h-px bg-vien" />
        <button
          title={namCham ? "Nam châm: đang bật (hút về giá mở/cao/thấp/đóng)" : "Nam châm: đang tắt"}
          onClick={() => setNamCham((x) => !x)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${namCham ? "text-nhan" : "text-chu-phu"} hover:bg-nen-noi`}
        >
          <Icon>
            <path d="M5 4v6a5 5 0 0 0 10 0V4" />
            <path d="M5 7h3M12 7h3" />
          </Icon>
        </button>
        <button
          title={an ? "Hiện hình vẽ" : "Ẩn hình vẽ"}
          onClick={() => setAn((x) => !x)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${an ? "text-nhan" : "text-chu-phu"} hover:bg-nen-noi`}
        >
          <Icon>
            <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" />
            <circle cx="10" cy="10" r="2" />
            {an && <path d="M3 17 17 3" />}
          </Icon>
        </button>
        <button
          title={chon ? "Xoá hình đang chọn" : "Xoá tất cả hình vẽ"}
          onClick={() => {
            if (chon) {
              luu(hinh.filter((h) => h.id !== chon));
              setChon(null);
            } else if (hinh.length && window.confirm("Xoá tất cả hình vẽ trên mã này?")) luu([]);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-chu-phu hover:bg-nen-noi hover:text-giam"
        >
          <Icon>
            <path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11" />
          </Icon>
        </button>
        </div>
      </div>

      {congCu !== "tro" && (
        <p className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-full bg-chu px-3 py-1 text-[12px] font-medium text-nen">
          {MOT_DIEM.includes(congCu) ? "Bấm lên biểu đồ để đặt" : dangVe ? "Bấm điểm thứ hai" : "Bấm điểm đầu tiên"} · Esc để huỷ
        </p>
      )}
    </>
  );
}
