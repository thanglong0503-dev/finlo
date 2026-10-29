"use client";

import { useEffect, useRef, useState } from "react";
import { type GiaoDichLon, type KieuGiaoDich, NGUONG_BTC, phanLoai, soChuyenThat } from "@/lib/ca-map-chung";

// Trình duyệt nghe thẳng Blockchain.com (giao dịch BTC chưa xác nhận) và Binance Futures (lệnh khớp), không qua máy chủ Finlo
const so = (x: number, chuSo = 0) => x.toLocaleString("vi-VN", { maximumFractionDigits: chuSo, minimumFractionDigits: chuSo });
const usdGon = (x: number) => (x >= 1e9 ? `$${so(x / 1e9, 2)} tỷ` : x >= 1e6 ? `$${so(x / 1e6, 2)} triệu` : `$${so(x / 1e3, 0)} nghìn`);
const gio = (luc: number) => new Date(luc).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const ngayGio = (luc: number) => {
  const d = new Date(luc);
  const hai = (x: number) => String(x).padStart(2, "0");
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
};

const KIEU: Record<KieuGiaoDich, { ten: string; moTa: string }> = {
  chuyen: { ten: "Chuyển", moTa: "Chuyển giữa một vài ví" },
  gom: { ten: "Gom ví", moTa: "Nhiều đầu vào gom về 1–2 ví, thường là sàn gom tiền nạp của khách" },
  chia: { ten: "Chia nhỏ", moTa: "Một lần trả cho rất nhiều ví, thường là sàn xử lý lệnh rút" },
};

function Nut<T extends string | number>({ ds, chon, dat, ten }: { ds: T[]; chon: T; dat: (x: T) => void; ten: (x: T) => string }) {
  return (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-nen p-1 [scrollbar-width:none]">
      {ds.map((x) => (
        <button
          key={x}
          onClick={() => dat(x)}
          className={`h-7 shrink-0 rounded-full px-3 text-[13px] font-medium whitespace-nowrap ${chon === x ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
        >
          {ten(x)}
        </button>
      ))}
    </div>
  );
}

function The({ nhan, chinh, phu, mau = "" }: { nhan: string; chinh: string; phu?: string; mau?: string }) {
  return (
    <div className="rounded-2xl bg-nen p-4">
      <p className="text-[13px] text-chu-phu">{nhan}</p>
      <p className={`so mt-1 text-[20px] leading-tight font-bold tracking-[-0.02em] ${mau}`}>{chinh}</p>
      {phu && <p className="mt-1 text-[12px] text-chu-phu">{phu}</p>}
    </div>
  );
}

// ---------------- Bitcoin trên chuỗi ----------------
type UtxBlockchain = {
  hash: string;
  time: number;
  inputs: { prev_out: { addr?: string; value: number } | null }[];
  out: { addr?: string | null; value: number }[];
};

function BtcTrenChuoi({ lichSu, giaBtc }: { lichSu: GiaoDichLon[]; giaBtc: number }) {
  const [moi, setMoi] = useState<GiaoDichLon[]>([]);
  const [ketNoi, setKetNoi] = useState(false);
  const [nguong, setNguong] = useState(NGUONG_BTC);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let hen: ReturnType<typeof setTimeout> | undefined;
    let dong = false;
    const mo = () => {
      ws = new WebSocket("wss://ws.blockchain.info/inv");
      ws.onopen = () => {
        setKetNoi(true);
        ws?.send(JSON.stringify({ op: "unconfirmed_sub" }));
      };
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data) as { op: string; x: UtxBlockchain };
        if (d.op !== "utx") return;
        const tong = d.x.out.reduce((s, o) => s + o.value, 0) / 1e8;
        if (tong < NGUONG_BTC) return;
        const btc = soChuyenThat(
          d.x.inputs.map((i) => i.prev_out?.addr),
          d.x.out.map((o) => ({ diaChi: o.addr ?? undefined, sat: o.value })),
        );
        if (btc < NGUONG_BTC) return;
        const gd: GiaoDichLon = { txid: d.x.hash, khoi: null, luc: d.x.time * 1000, btc, vao: d.x.inputs.length, ra: d.x.out.length, kieu: phanLoai(d.x.inputs.length, d.x.out.length) };
        setMoi((x) => (x.some((y) => y.txid === gd.txid) ? x : [gd, ...x].slice(0, 100)));
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

  const daCo = new Set(lichSu.map((x) => x.txid));
  const ds = [...moi.filter((x) => !daCo.has(x.txid)), ...lichSu].filter((x) => x.btc >= nguong);
  const daXacNhan = lichSu.filter((x) => x.btc >= nguong);
  const tong = daXacNhan.reduce((s, x) => s + x.btc, 0);
  const lonNhat = daXacNhan.reduce((m, x) => Math.max(m, x.btc), 0);
  const gom = daXacNhan.filter((x) => x.kieu === "gom").reduce((s, x) => s + x.btc, 0);
  const chia = daXacNhan.filter((x) => x.kieu === "chia").reduce((s, x) => s + x.btc, 0);

  return (
    <section className="rounded-3xl bg-nen-phu p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold tracking-[-0.02em]">Bitcoin chuyển lớn trên chuỗi</h2>
          <p className="mt-0.5 text-[13px] text-chu-phu">
            Giao dịch từ {so(nguong)} BTC trở lên: 6 khối gần nhất (khoảng 1 giờ) và giao dịch mới đang chờ xác nhận.
          </p>
        </div>
        <Nut ds={[100, 500, 1000]} chon={nguong} dat={setNguong} ten={(x) => `≥ ${so(x)} BTC`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <The nhan="Số giao dịch lớn (6 khối)" chinh={so(daXacNhan.length)} phu={`Tổng ${so(tong)} BTC`} />
        <The nhan="Giá trị" chinh={giaBtc ? usdGon(tong * giaBtc) : "—"} phu={lonNhat ? `Lớn nhất ${so(lonNhat)} BTC` : undefined} />
        <The nhan="Dạng gom ví" chinh={`${so(gom)} BTC`} phu="Thường là sàn gom tiền nạp" />
        <The nhan="Dạng chia nhỏ" chinh={`${so(chia)} BTC`} phu="Thường là sàn trả lệnh rút" />
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px]">
        <span className={`inline-block h-2 w-2 rounded-full ${ketNoi ? "bg-tang" : "bg-chu-phu"}`} />
        {ketNoi ? "Đang nghe giao dịch mới" : "Đang kết nối…"}
      </div>

      <div className="mt-2 max-h-[460px] overflow-auto">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead className="sticky top-0 bg-nen-phu text-chu-phu">
            <tr>
              <th className="py-2 text-left font-medium">Thời gian</th>
              <th className="py-2 text-right font-medium">Số BTC</th>
              <th className="py-2 text-right font-medium">Giá trị</th>
              <th className="py-2 pl-4 text-left font-medium">Dạng</th>
              <th className="py-2 text-left font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {ds.map((x) => (
              <tr key={x.txid} className="border-t border-vien">
                <td className="so py-2 text-chu-phu">{x.khoi ? ngayGio(x.luc) : gio(x.luc)}</td>
                <td className={`so py-2 text-right font-semibold ${x.btc >= 1000 ? "text-nhan" : ""}`}>{so(x.btc, x.btc < 1000 ? 1 : 0)}</td>
                <td className="so py-2 text-right text-chu-phu">{giaBtc ? usdGon(x.btc * giaBtc) : "—"}</td>
                <td className="py-2 pl-4" title={KIEU[x.kieu].moTa}>
                  {KIEU[x.kieu].ten}
                  <span className="text-chu-phu"> · {x.vao}→{x.ra}</span>
                </td>
                <td className="py-2">
                  <a href={`https://mempool.space/tx/${x.txid}`} target="_blank" rel="noopener noreferrer" className="text-chu-phu hover:text-chu hover:underline">
                    {x.khoi ? `Khối ${so(x.khoi)}` : "Chờ xác nhận"} ↗
                  </a>
                </td>
              </tr>
            ))}
            {ds.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-chu-phu">
                  Chưa có giao dịch nào từ {so(nguong)} BTC trong khoảng này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-chu-phu">
        Số BTC đã trừ phần tiền thừa trả về chính ví gửi. “x→y” là số đầu vào → số đầu ra. Dạng giao dịch là phỏng đoán theo cấu trúc,
        chưa xác định được ví thuộc sàn hay tổ chức nào.
      </p>
    </section>
  );
}

// ---------------- Lệnh lớn trên Binance Futures ----------------
const CAP = ["BTC", "ETH", "SOL"] as const;
type Lenh = { id: string; ma: string; luc: number; gia: number; usd: number; mua: boolean };
type AggTrade = { a: number; s: string; p: string; q: string; T: number; m: boolean };

function LenhLonBinance({ datGiaBtc }: { datGiaBtc: (x: number) => void }) {
  const [ds, setDs] = useState<Lenh[]>([]);
  const [nguong, setNguong] = useState(250000);
  const [ketNoi, setKetNoi] = useState(false);
  const nguongRef = useRef(nguong);
  useEffect(() => {
    nguongRef.current = nguong;
  }, [nguong]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let hen: ReturnType<typeof setTimeout> | undefined;
    let dong = false;
    let lanCuoi = 0;
    // Lấy nhanh lệnh lớn trong vài phút gần nhất để không phải đợi trắng; lưu từ 100 nghìn USD để đổi ngưỡng vẫn có dữ liệu
    const doi = (t: AggTrade, ma: string): Lenh => ({ id: `${ma}-${t.a}`, ma, luc: t.T, gia: +t.p, usd: +t.p * +t.q, mua: !t.m });
    Promise.all(
      CAP.map((ma) =>
        fetch(`https://fapi.binance.com/fapi/v1/aggTrades?symbol=${ma}USDT&limit=1000`)
          .then((r) => r.json() as Promise<AggTrade[]>)
          .then((x) => {
            if (ma === "BTC" && x.length) datGiaBtc(+x[x.length - 1].p);
            return x.map((t) => doi(t, ma)).filter((l) => l.usd >= 100000);
          })
          .catch(() => []),
      ),
    ).then((x) => setDs((cu) => [...cu, ...x.flat()].sort((a, b) => b.luc - a.luc).slice(0, 300)));

    const mo = () => {
      ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${CAP.map((c) => `${c.toLowerCase()}usdt@aggTrade`).join("/")}`);
      ws.onopen = () => setKetNoi(true);
      ws.onmessage = (e) => {
        const t = (JSON.parse(e.data) as { data: AggTrade }).data;
        const ma = t.s.replace(/USDT$/, "");
        // Giá BTC chỉ để quy đổi USD: cập nhật tối đa 5 giây một lần cho đỡ vẽ lại
        if (ma === "BTC" && t.T - lanCuoi > 5000) {
          lanCuoi = t.T;
          datGiaBtc(+t.p);
        }
        const l = doi(t, ma);
        if (l.usd >= 100000) setDs((x) => [l, ...x].slice(0, 300));
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
  }, [datGiaBtc]);

  const loc = ds.filter((x) => x.usd >= nguong);
  const theoMa = CAP.map((ma) => {
    const l = loc.filter((x) => x.ma === ma);
    const mua = l.filter((x) => x.mua).reduce((s, x) => s + x.usd, 0);
    const ban = l.filter((x) => !x.mua).reduce((s, x) => s + x.usd, 0);
    return { ma, mua, ban, rong: mua - ban };
  });

  return (
    <section className="rounded-3xl bg-nen-phu p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold tracking-[-0.02em]">Lệnh lớn trên Binance Futures</h2>
          <p className="mt-0.5 text-[13px] text-chu-phu">Lệnh thị trường khớp một lần từ ngưỡng chọn trở lên: cá mập chủ động mua hay bán.</p>
        </div>
        <Nut ds={[100000, 250000, 1000000]} chon={nguong} dat={setNguong} ten={(x) => `≥ ${usdGon(x)}`} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {theoMa.map((m) => {
          const tong = m.mua + m.ban;
          return (
            <div key={m.ma} className="rounded-2xl bg-nen p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{m.ma}</p>
                <p className={`so text-[13px] font-semibold ${m.rong > 0 ? "text-tang" : m.rong < 0 ? "text-giam" : "text-chu-phu"}`}>
                  {m.rong >= 0 ? "Mua ròng " : "Bán ròng "}
                  {usdGon(Math.abs(m.rong))}
                </p>
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-nen-noi">
                {tong > 0 && (
                  <>
                    <div className="bg-tang" style={{ width: `${(m.mua / tong) * 100}%` }} />
                    <div className="flex-1 bg-giam" />
                  </>
                )}
              </div>
              <p className="so mt-2 flex justify-between text-[12px] text-chu-phu">
                <span>Mua {usdGon(m.mua)}</span>
                <span>Bán {usdGon(m.ban)}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px]">
        <span className={`inline-block h-2 w-2 rounded-full ${ketNoi ? "bg-tang" : "bg-chu-phu"}`} />
        {ketNoi ? "Đang nhận lệnh khớp" : "Đang kết nối…"}
      </div>
      <div className="mt-2 max-h-[400px] overflow-y-auto">
        <table className="w-full text-[13px]">
          <tbody>
            {loc.slice(0, 80).map((x) => (
              <tr key={x.id} className="border-t border-vien first:border-0">
                <td className="so py-1.5 text-chu-phu">{gio(x.luc)}</td>
                <td className="py-1.5 font-semibold">{x.ma}</td>
                <td className={`py-1.5 ${x.mua ? "text-tang" : "text-giam"}`}>{x.mua ? "Mua" : "Bán"}</td>
                <td className="so py-1.5 text-right text-chu-phu">${so(x.gia, x.gia >= 1000 ? 1 : 2)}</td>
                <td className={`so py-1.5 text-right font-semibold ${x.usd >= 1e6 ? "text-chu" : "text-chu-phu"}`}>{usdGon(x.usd)}</td>
              </tr>
            ))}
            {loc.length === 0 && (
              <tr>
                <td className="py-8 text-center text-chu-phu">Chưa có lệnh nào từ {usdGon(nguong)}; thị trường yên thì có thể vài phút mới có một lệnh.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-chu-phu">Tính từ vài phút trước khi mở trang. Mua/bán là phía chủ động khớp lệnh (taker).</p>
    </section>
  );
}

export function CaMap({ lichSu }: { lichSu: GiaoDichLon[] }) {
  const [giaBtc, setGiaBtc] = useState(0);
  return (
    <div className="mt-6 space-y-6">
      <BtcTrenChuoi lichSu={lichSu} giaBtc={giaBtc} />
      <LenhLonBinance datGiaBtc={setGiaBtc} />
    </div>
  );
}
