"use client";

import Link from "next/link";
import { useState } from "react";
import { DuongNho } from "@/components/DuongNho";
import type { CoinThiTruong, MuaAltcoin, TamLy, ThiTruongTienSo } from "@/lib/tien-so";

type Ky = "p24" | "p7" | "p30";
const KY: { ma: Ky; ten: string; thang: number }[] = [
  { ma: "p24", ten: "24 giờ", thang: 8 },
  { ma: "p7", ten: "7 ngày", thang: 20 },
  { ma: "p30", ten: "30 ngày", thang: 40 },
];

const usdGon = (x: number) =>
  x >= 1e12
    ? `$${(x / 1e12).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} nghìn tỷ`
    : x >= 1e9
      ? `$${(x / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`
      : `$${(x / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} triệu`;
const giaUsd = (x: number) =>
  `$${x.toLocaleString("vi-VN", { maximumFractionDigits: x >= 1000 ? 0 : x >= 1 ? 2 : 6, minimumFractionDigits: x >= 1000 ? 0 : x >= 1 ? 2 : 2 })}`;
const pt = (x: number | null) =>
  x == null ? "—" : `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
const mau = (x: number | null) => (x == null ? "" : x > 0 ? "text-tang" : x < 0 ? "text-giam" : "text-dung");

// Màu ô bản đồ nhiệt: càng đậm càng biến động mạnh, tối đa ở ± thang %
const mauNhiet = (x: number | null, thang: number) => {
  if (x == null) return "var(--nen-noi)";
  const dam = Math.min(Math.abs(x) / thang, 1);
  return `color-mix(in srgb, ${x >= 0 ? "var(--tang)" : "var(--giam)"} ${Math.round(14 + dam * 60)}%, var(--nen))`;
};

// Đồng hồ nửa vòng 0–100: đỏ (sợ hãi) → vàng → xanh (tham lam)
function DongHoTamLy({ gt }: { gt: number }) {
  const goc = Math.PI * (1 - gt / 100);
  const x = 60 + 46 * Math.cos(goc);
  const y = 60 - 46 * Math.sin(goc);
  return (
    <svg viewBox="0 0 120 70" className="w-full max-w-[200px]" aria-hidden>
      <defs>
        <linearGradient id="tam-ly" x1="0" x2="1">
          <stop offset="0" stopColor="var(--giam)" />
          <stop offset="0.5" stopColor="var(--dung)" />
          <stop offset="1" stopColor="var(--tang)" />
        </linearGradient>
      </defs>
      <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="url(#tam-ly)" strokeWidth="10" strokeLinecap="round" />
      <line x1="60" y1="60" x2={x} y2={y} stroke="var(--chu)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="5" fill="var(--chu)" />
    </svg>
  );
}

function OCoin({ c, ky, thang }: { c: CoinThiTruong; ky: Ky; thang: number }) {
  return (
    <Link
      href={`/tai-san-so/${c.ma}`}
      prefetch={false}
      title={`${c.ten}: ${giaUsd(c.gia)} · ${pt(c[ky])}`}
      className="flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-md p-1 text-center hover:outline hover:outline-2 hover:-outline-offset-2 hover:outline-chu"
      style={{ flex: `${Math.sqrt(c.vonHoa)} 1 0`, background: mauNhiet(c[ky], thang) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- logo coin từ CoinGecko */}
      <img src={c.anh} alt="" loading="lazy" className="mb-0.5 h-5 w-5 rounded-full" />
      <span className="max-w-full truncate text-[12px] font-bold">{c.ma}</span>
      <span className="max-w-full truncate text-[11px] font-medium tabular-nums">{pt(c[ky])}</span>
    </Link>
  );
}

function DongCoin({ c, ky }: { c: CoinThiTruong; ky: Ky }) {
  return (
    <li>
      <Link href={`/tai-san-so/${c.ma}`} prefetch={false} className="flex items-center gap-3 px-4 py-2 hover:bg-nen-noi">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo coin từ CoinGecko */}
        <img src={c.anh} alt="" loading="lazy" className="h-6 w-6 shrink-0 rounded-full" />
        <span className="min-w-0">
          <span className="block font-semibold">{c.ma}</span>
          <span className="block truncate text-[11px] text-chu-phu">{c.ten}</span>
        </span>
        <span className="ml-auto text-right tabular-nums">
          <span className="block">{giaUsd(c.gia)}</span>
          <span className={`block text-[12px] font-semibold ${mau(c[ky])}`}>{pt(c[ky])}</span>
        </span>
      </Link>
    </li>
  );
}

export function TongQuanTienSo({ tt, tamLy, altcoin }: { tt: ThiTruongTienSo; tamLy: TamLy | null; altcoin: MuaAltcoin | null }) {
  const [ky, setKy] = useState<Ky>("p24");
  const thang = KY.find((k) => k.ma === ky)!.thang;

  // Bản đồ nhiệt: 40 đồng lớn nhất, chia 4 hàng theo căn bậc hai vốn hoá
  const nhiet = tt.coin.slice(0, 40);
  const tong = nhiet.reduce((s, c) => s + Math.sqrt(c.vonHoa), 0);
  const hang: CoinThiTruong[][] = [[]];
  let daCo = 0;
  for (const c of nhiet) {
    if (daCo >= (tong / 4) * hang.length && hang.length < 4) hang.push([]);
    hang[hang.length - 1].push(c);
    daCo += Math.sqrt(c.vonHoa);
  }

  const coKy = tt.coin.filter((c) => c[ky] != null && c.khoiLuong > 2e6);
  const tangManh = [...coKy].sort((a, b) => b[ky]! - a[ky]!).slice(0, 8);
  const giamManh = [...coKy].sort((a, b) => a[ky]! - b[ky]!).slice(0, 8);
  const soTang = tt.coin.filter((c) => (c.p24 ?? 0) > 0).length;

  const muaAlt = altcoin
    ? altcoin.diem >= 75
      ? { ten: "Mùa altcoin", mau: "text-tang" }
      : altcoin.diem <= 25
        ? { ten: "Mùa Bitcoin", mau: "text-dung" }
        : { ten: "Trung tính", mau: "text-chu" }
    : null;
  const mauTamLy = tamLy ? (tamLy.hienTai < 25 ? "text-giam" : tamLy.hienTai < 45 ? "text-giam" : tamLy.hienTai <= 55 ? "text-dung" : "text-tang") : "";

  return (
    <section className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Tổng vốn hoá thị trường</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{usdGon(tt.tongVonHoa)}</p>
          <p className={`text-[13px] tabular-nums ${mau(tt.thayDoiVonHoa24h)}`}>{pt(tt.thayDoiVonHoa24h)} trong 24 giờ</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Khối lượng giao dịch 24 giờ</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{usdGon(tt.tongKhoiLuong)}</p>
          <p className="text-[13px] text-chu-phu tabular-nums">
            {soTang}/{tt.coin.length} đồng lớn tăng giá
          </p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Tỷ trọng vốn hoá</p>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full">
            <span className="bg-[#f7931a]" style={{ width: `${tt.tyTrong.btc}%` }} />
            <span className="bg-[#627eea]" style={{ width: `${tt.tyTrong.eth}%` }} />
            <span className="bg-chu-phu/60" style={{ width: `${tt.tyTrong.onDinh}%` }} />
            <span className="flex-1 bg-nen-noi" />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 text-[12px] tabular-nums">
            <span>
              <b className="text-[#f7931a]">BTC</b> {tt.tyTrong.btc.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
            </span>
            <span>
              <b className="text-[#627eea]">ETH</b> {tt.tyTrong.eth.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
            </span>
            <span className="text-chu-phu">Đồng ổn định {tt.tyTrong.onDinh.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</span>
          </p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu" title="Phần trăm trong top 50 altcoin tăng giá 90 ngày tốt hơn Bitcoin">
            Chỉ số mùa altcoin
          </p>
          {altcoin && muaAlt ? (
            <>
              <p className="mt-1 text-[22px] font-bold tabular-nums">
                {altcoin.diem}
                <span className="text-[14px] text-chu-phu">/100</span> <span className={`text-[15px] ${muaAlt.mau}`}>{muaAlt.ten}</span>
              </p>
              <div className="relative mt-2 h-2 rounded-full bg-gradient-to-r from-[#f7931a] via-vien to-tang">
                <span className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-chu" style={{ left: `${altcoin.diem}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-chu-phu tabular-nums">
                {altcoin.soVuot}/{altcoin.soXet} altcoin chạy hơn BTC 90 ngày (BTC {pt(altcoin.btc90)})
              </p>
            </>
          ) : (
            <p className="mt-1 text-chu-phu">Chưa đủ dữ liệu</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Chỉ số Sợ hãi & Tham lam</p>
          {tamLy ? (
            <>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-1/2">
                  <DongHoTamLy gt={tamLy.hienTai} />
                </div>
                <div>
                  <p className="text-[40px] leading-none font-bold tabular-nums">{tamLy.hienTai}</p>
                  <p className={`mt-1 font-semibold ${mauTamLy}`}>{tamLy.phanLoai}</p>
                </div>
              </div>
              <p className="mt-3 text-[12px] text-chu-phu">90 ngày gần nhất</p>
              <DuongNho diem={tamLy.lichSu.map((x) => x.value)} tang={tamLy.hienTai >= 50} />
              <p className="mt-2 text-[11px] leading-relaxed text-chu-phu">
                Dưới 25 là cực kỳ sợ hãi (thường gần đáy ngắn hạn), trên 75 là cực kỳ tham lam (dễ điều chỉnh). Nguồn: alternative.me.
              </p>
            </>
          ) : (
            <p className="mt-1 text-chu-phu">Chưa tải được</p>
          )}
        </div>

        <div className="rounded-2xl bg-nen-phu p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              Bản đồ nhiệt <span className="font-normal text-chu-phu">· 40 đồng lớn nhất, ô to theo vốn hoá</span>
            </p>
            <div className="flex gap-1 rounded-full bg-nen-noi p-1">
              {KY.map((k) => (
                <button
                  key={k.ma}
                  onClick={() => setKy(k.ma)}
                  className={`h-7 rounded-full px-3 text-[12px] font-medium ${ky === k.ma ? "bg-chu text-nen" : "text-chu-phu hover:text-chu"}`}
                >
                  {k.ten}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex h-[340px] flex-col gap-1">
            {hang.map((h, i) => (
              <div key={i} className="flex min-h-0 flex-1 gap-1">
                {h.map((c) => (
                  <OCoin key={c.id} c={c} ky={ky} thang={thang} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {[
          { ten: "Tăng mạnh nhất", ds: tangManh },
          { ten: "Giảm mạnh nhất", ds: giamManh },
        ].map((n) => (
          <div key={n.ten} className="overflow-hidden rounded-2xl bg-nen-phu">
            <p className="flex items-center justify-between border-b border-vien px-4 py-3 font-semibold">
              {n.ten}
              <span className="text-[12px] font-normal text-chu-phu">top 200 · {KY.find((k) => k.ma === ky)!.ten}</span>
            </p>
            <ul className="py-1">
              {n.ds.map((c) => (
                <DongCoin key={c.id} c={c} ky={ky} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-chu-phu">
        Dữ liệu thị trường: CoinGecko, cập nhật khoảng 5 phút. Không tính đồng ổn định giá và token bọc/đặt cọc trong bản đồ nhiệt và
        xếp hạng.
      </p>
    </section>
  );
}
