"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BieuDoTuongTac, type Nguon } from "@/components/bieu-do/BieuDoTuongTac";
import { ThanhChiBao } from "@/components/bieu-do/ChiBaoChon";
import { BO_CUC, chuoiO, KHOA_NHIEU, maHopLe, type O } from "@/lib/nhieu-bieu-do";

// Lưới nhiều biểu đồ: xem cùng lúc 1–6 mã (cổ phiếu và tiền số trộn được), chỉ báo dùng chung cho cả lưới.
// Bố cục và danh sách mã ghi vào đường dẫn để chia sẻ, và nhớ trong trình duyệt cho lần mở sau.

// Ô gợi ý mã khi gõ: danh sách cổ phiếu và tiền số tải một lần cho cả trang
type GoiY = { ck: string[]; ts: string[] };
let goiYDangTai: Promise<GoiY> | null = null;
function taiGoiY(): Promise<GoiY> {
  goiYDangTai ??= Promise.all([
    fetch("/api/danh-sach-ma")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    fetch("/api/tien-so")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
  ]).then(([ck, ts]: [{ ma: string }[], { ma: string }[]]) => ({
    ck: Array.isArray(ck) ? ck.map((x) => x.ma) : [],
    ts: Array.isArray(ts) ? ts.map((x) => x.ma) : [],
  }));
  return goiYDangTai;
}

export function NhieuBieuDo({ boDau, dsDau, coThamSo }: { boDau: number; dsDau: O[]; coThamSo: boolean }) {
  const [bo, setBo] = useState(boDau);
  const [ds, setDs] = useState(dsDau);
  const [goiY, setGoiY] = useState<GoiY>({ ck: [], ts: [] });
  const router = useRouter();

  useEffect(() => {
    taiGoiY().then(setGoiY);
    // Mở trang không kèm tham số: chuyển sang bố cục lần trước (trang dựng lại với tham số đó)
    if (coThamSo) return;
    try {
      const luu = JSON.parse(localStorage.getItem(KHOA_NHIEU) ?? "null") as { bo: number; ds: string } | null;
      if (luu?.ds) router.replace(`/bieu-do/nhieu?bo=${luu.bo}&ds=${luu.ds}`);
    } catch {}
  }, [coThamSo, router]);

  // Ghi bố cục vào đường dẫn (chia sẻ được) và trình duyệt (mở lại lần sau)
  const luu = (b: number, d: O[]) => {
    const chuoi = chuoiO(d);
    window.history.replaceState(null, "", `/bieu-do/nhieu?bo=${b}&ds=${chuoi}`);
    try {
      localStorage.setItem(KHOA_NHIEU, JSON.stringify({ bo: b, ds: chuoi }));
    } catch {}
  };
  const chonBo = (b: number) => {
    setBo(b);
    luu(b, ds);
  };
  const doiO = (i: number, o: O) => {
    const moi = ds.map((x, j) => (j === i ? o : x));
    setDs(moi);
    luu(bo, moi);
  };

  const lop = BO_CUC.find((b) => b.so === bo)?.lop ?? BO_CUC[3].lop;
  // Mỗi hàng cao bằng phần màn hình còn lại chia số hàng (màn hình lớn); điện thoại mỗi biểu đồ cao cố định
  const soHang = bo <= 3 ? 1 : 2;

  return (
    <div className="flex flex-col border-b border-vien">
      <div className="flex flex-wrap items-center gap-2 border-b border-vien px-3 py-2">
        <h1 className="mr-2 text-lg font-bold">Nhiều biểu đồ</h1>
        <div className="flex gap-1 rounded-full bg-nen-noi p-1" role="group" aria-label="Số biểu đồ">
          {BO_CUC.map((b) => (
            <button
              key={b.so}
              onClick={() => chonBo(b.so)}
              title={`${b.so} biểu đồ`}
              className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold ${
                bo === b.so ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"
              }`}
            >
              <BieuTuongLuoi so={b.so} />
              {b.nhan}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-chu-phu">Gõ mã vào ô trên mỗi biểu đồ để đổi; chỉ báo bật một lần áp cho cả lưới.</span>
        <Link href="/bieu-do" className="ml-auto text-[12px] font-semibold text-nhan hover:underline">
          Về một biểu đồ →
        </Link>
      </div>
      <ThanhChiBao coPhieu={null} />

      <datalist id="goi-y-ck">
        {goiY.ck.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <datalist id="goi-y-ts">
        {goiY.ts.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <div
        className={`grid ${lop} gap-px bg-vien`}
        style={{ ["--cao-o" as string]: `calc((100dvh - 60px - 92px) / ${soHang})` }}
      >
        {ds.slice(0, bo).map((o, i) => (
          <OBieuDo key={i} o={o} doi={(moi) => doiO(i, moi)} />
        ))}
      </div>
    </div>
  );
}

function OBieuDo({ o, doi }: { o: O; doi: (o: O) => void }) {
  const [nhap, setNhap] = useState(o.ma);
  const [maTruoc, setMaTruoc] = useState(o.ma);
  if (maTruoc !== o.ma) {
    setMaTruoc(o.ma);
    setNhap(o.ma);
  }
  const apDung = (nguon: Nguon = o.nguon) => {
    const ma = nhap.trim().toUpperCase();
    if (maHopLe(ma) && (ma !== o.ma || nguon !== o.nguon)) doi({ nguon, ma });
    else setNhap(o.ma);
  };

  return (
    <section className="flex h-[480px] min-w-0 flex-col bg-nen md:h-[max(420px,var(--cao-o))]">
      <div className="flex items-center gap-2 border-b border-vien px-2 py-1.5">
        <div className="flex rounded-full bg-nen-noi p-0.5 text-[11px] font-semibold">
          {(["ck", "ts"] as const).map((n) => (
            <button
              key={n}
              onClick={() => n !== o.nguon && doi({ nguon: n, ma: n === "ts" ? "BTC" : "VNM" })}
              className={`h-6 rounded-full px-2 ${o.nguon === n ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
            >
              {n === "ck" ? "Cổ phiếu" : "Tiền số"}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apDung();
          }}
          className="min-w-0"
        >
          <input
            value={nhap}
            onChange={(e) => setNhap(e.target.value.toUpperCase())}
            onBlur={() => apDung()}
            onFocus={(e) => e.target.select()}
            list={o.nguon === "ck" ? "goi-y-ck" : "goi-y-ts"}
            aria-label="Mã"
            spellCheck={false}
            className="h-7 w-28 rounded-full border border-vien bg-nen px-3 text-[13px] font-bold outline-none focus:border-nhan"
          />
        </form>
        {o.nguon === "ts" && <span className="text-[12px] text-chu-phu">/USDT</span>}
        <Link
          href={`/bieu-do?loai=${o.nguon}&ma=${o.ma}`}
          title="Mở biểu đồ đầy đủ"
          className="ml-auto text-[12px] font-semibold text-chu-phu hover:text-nhan"
        >
          Mở →
        </Link>
      </div>
      <BieuDoTuongTac key={`${o.nguon}:${o.ma}`} nguon={o.nguon} ma={o.ma} gon />
    </section>
  );
}

function BieuTuongLuoi({ so }: { so: number }) {
  const o: [number, number, number, number][] =
    so === 1
      ? [[1, 1, 12, 12]]
      : so === 2
        ? [
            [1, 1, 5.5, 12],
            [7.5, 1, 5.5, 12],
          ]
        : so === 3
          ? [
              [1, 1, 3.3, 12],
              [5.35, 1, 3.3, 12],
              [9.7, 1, 3.3, 12],
            ]
          : so === 4
            ? [
                [1, 1, 5.5, 5.5],
                [7.5, 1, 5.5, 5.5],
                [1, 7.5, 5.5, 5.5],
                [7.5, 7.5, 5.5, 5.5],
              ]
            : [
                [1, 1, 3.3, 5.5],
                [5.35, 1, 3.3, 5.5],
                [9.7, 1, 3.3, 5.5],
                [1, 7.5, 3.3, 5.5],
                [5.35, 7.5, 3.3, 5.5],
                [9.7, 7.5, 3.3, 5.5],
              ];
  return (
    <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden>
      {o.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="0.8" />
      ))}
    </svg>
  );
}
