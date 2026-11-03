"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { phanTram } from "@/lib/dinh-dang";
import { mauNhiet } from "@/lib/nganh";

export type OMa = { ma: string; ten: string; nganh: string; von: number; gt: number; pt: number; top: boolean; vn30: boolean };

type Khung = { x: number; y: number; w: number; h: number };

// Treemap kiểu squarify: chia từng dải sao cho ô gần vuông nhất. ds phải xếp giảm dần theo kt
function chia<T extends { kt: number }>(ds: T[], khung: Khung): (T & Khung)[] {
  const tong = ds.reduce((s, x) => s + x.kt, 0);
  if (!tong || khung.w <= 0 || khung.h <= 0) return [];
  const tiLe = (khung.w * khung.h) / tong;
  const kq: (T & Khung)[] = [];
  let { x, y, w, h } = khung;
  let i = 0;
  while (i < ds.length) {
    const canh = Math.min(w, h);
    let so = 1;
    let xauNhat = Infinity;
    for (let j = i, s = 0; j < ds.length; j++) {
      s += ds[j].kt * tiLe;
      const lon = ds[i].kt * tiLe;
      const nho = ds[j].kt * tiLe;
      const xau = Math.max((canh * canh * lon) / (s * s), (s * s) / (canh * canh * nho));
      if (xau > xauNhat) break;
      xauNhat = xau;
      so = j - i + 1;
    }
    const dai = ds.slice(i, i + so);
    const day = dai.reduce((a, b) => a + b.kt * tiLe, 0) / canh;
    let vt = 0;
    for (const t of dai) {
      const dd = (t.kt * tiLe) / day;
      kq.push(w >= h ? { ...t, x, y: y + vt, w: day, h: dd } : { ...t, x: x + vt, y, w: dd, h: day });
      vt += dd;
    }
    if (w >= h) {
      x += day;
      w -= day;
    } else {
      y += day;
      h -= day;
    }
    i += so;
  }
  return kq;
}

function NutChon<T extends string>({ ds, chon, datChon }: { ds: readonly (readonly [T, string])[]; chon: T; datChon: (k: T) => void }) {
  return ds.map(([k, ten]) => (
    <button
      key={k}
      type="button"
      onClick={() => datChon(k)}
      className={`h-7 rounded-full px-3 text-[12px] font-medium ${chon === k ? "bg-nen-noi text-chu" : "text-chu-phu hover:text-chu"}`}
    >
      {ten}
    </button>
  ));
}

const RO = [
  ["top", "Top 100"],
  ["vn30", "VN30"],
] as const;
const THEO = [
  ["von", "Theo vốn hoá"],
  ["gt", "Theo giá trị giao dịch"],
] as const;

// Bản đồ nhiệt cổ phiếu theo ngành: ô theo vốn hoá hoặc giá trị giao dịch, màu theo % hôm nay
export function BanDoNhietMa({ ds }: { ds: OMa[] }) {
  const khung = useRef<HTMLDivElement>(null);
  const [rong, datRong] = useState(0);
  const [ro, datRo] = useState<"top" | "vn30">("top");
  const [theo, datTheo] = useState<"von" | "gt">("von");

  useEffect(() => {
    if (!khung.current) return;
    const quan = new ResizeObserver((e) => datRong(e[0].contentRect.width));
    quan.observe(khung.current);
    return () => quan.disconnect();
  }, []);

  const cao = rong && rong < 640 ? 640 : 560;
  const nhom = useMemo(() => {
    const gom = new Map<string, OMa[]>();
    for (const c of ds) if (ro === "top" ? c.top : c.vn30) gom.set(c.nganh, [...(gom.get(c.nganh) ?? []), c]);
    const co = (c: OMa) => Math.max(1, theo === "von" ? c.von : c.gt);
    const nganh = [...gom.entries()]
      .map(([ten, cp]) => ({
        ten,
        cp: cp.map((c) => ({ ...c, kt: co(c) })).sort((a, b) => b.kt - a.kt),
        kt: cp.reduce((s, c) => s + co(c), 0),
      }))
      .sort((a, b) => b.kt - a.kt);
    return chia(nganh, { x: 0, y: 0, w: rong, h: cao }).map((n) => {
      const dauDe = n.h > 44 && n.w > 64 ? 18 : 0;
      return {
        ...n,
        pt: n.cp.reduce((s, c) => s + c.pt * c.kt, 0) / n.kt,
        dauDe,
        o: chia(n.cp, { x: n.x + 1, y: n.y + 1 + dauDe, w: n.w - 2, h: n.h - 2 - dauDe }),
      };
    });
  }, [ds, ro, theo, rong, cao]);

  return (
    <div className="p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <NutChon ds={RO} chon={ro} datChon={datRo} />
        <span className="mx-1 hidden h-4 w-px bg-vien sm:block" />
        <NutChon ds={THEO} chon={theo} datChon={datTheo} />
      </div>
      <div ref={khung} className="relative overflow-hidden rounded-lg" style={{ height: cao }}>
        {rong > 0 &&
          nhom.map((n) => (
            <div key={n.ten}>
              {n.dauDe > 0 && (
                <p className="absolute truncate px-1.5 text-[11px] leading-[18px] font-semibold" style={{ left: n.x, top: n.y, width: n.w }}>
                  {n.ten} <span className="so font-normal text-chu-phu">{phanTram(n.pt)}</span>
                </p>
              )}
              {n.o.map((o) => (
                <Link
                  key={o.ma}
                  prefetch={false}
                  href={`/co-phieu/${o.ma}`}
                  title={`${o.ma} · ${o.ten}: ${phanTram(o.pt)}`}
                  className="absolute flex flex-col items-center justify-center overflow-hidden border border-nen hover:z-10 hover:outline hover:outline-2 hover:outline-chu"
                  style={{ left: o.x, top: o.y, width: o.w, height: o.h, background: mauNhiet(o.pt) }}
                >
                  {o.w > 30 && o.h > 16 && (
                    <span className="leading-tight font-semibold" style={{ fontSize: Math.min(20, Math.max(10, Math.min(o.w / 4, o.h / 2.6))) }}>
                      {o.ma}
                    </span>
                  )}
                  {o.w > 44 && o.h > 32 && (
                    <span className="so leading-tight" style={{ fontSize: Math.min(13, Math.max(9, o.w / 6)) }}>
                      {phanTram(o.pt)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
