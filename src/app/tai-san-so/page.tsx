import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangTienSoTrucTiep } from "@/components/BangTienSoTrucTiep";
import { BieuDoTienSo } from "@/components/BieuDoTienSo";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { giaUsd, mauTangGiam, phanTram, usdGon, vnd } from "@/lib/dinh-dang";
import { layBangTienSo, layBangVang, layTienSo } from "@/lib/mofi";

export const metadata: Metadata = { title: "Tài sản số" };

export default function TrangTaiSanSo() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Tài sản số</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Giá tài sản số</h1>
      <p className="mt-1 text-chu-phu">Giá tham khảo theo USD, quy đổi VND theo tỷ giá bán của Vietcombank.</p>
      <Suspense
        fallback={
          <>
            <LuoiMo so={2} cao="h-44" cot="md:grid-cols-2" />
            <LuoiMo so={4} />
            <BangMo dong={10} />
          </>
        }
      >
        <NoiDung />
      </Suspense>
    </div>
  );
}

async function NoiDung() {
  await connection();
  const [noiBat, bang, vang] = await Promise.all([layTienSo(), layBangTienSo(30), layBangVang()]);
  const tyGia = vang.theGioi.tyGia;
  const thiPhanBtc = bang.ds.find((x) => x.ma === "BTC")?.thiPhan;

  return (
    <>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {noiBat.map((ts) => {
          // 90 ngày gần nhất cho biểu đồ
          const diem = ts.lichSu.slice(-90);
          // Giá theo bảng vốn hoá mới hơn nến ngày, dùng chung để thẻ và bảng khớp nhau
          const gia = bang.ds.find((x) => x.ma === ts.ma)?.gia ?? ts.gia;
          return (
            <div key={ts.ma} className="border border-vien p-4 rounded-2xl overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {ts.ma} <span className="font-normal text-chu-phu">· {ts.ten}</span>
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">${giaUsd(gia)}</p>
                  <p className="text-chu-phu tabular-nums">≈ {vnd(gia * tyGia)} đ</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold tabular-nums ${mauTangGiam(ts.phanTram)}`}>{phanTram(ts.phanTram)}</p>
                  <p className="text-[11px] text-chu-phu">1 ngày</p>
                </div>
              </div>
              <div className="mt-4">
                <BieuDoTienSo duong={[{ ten: ts.ma, diem }]} />
              </div>
              <div className="mt-1 flex justify-between text-[11px]">
                <span className="text-chu-phu">90 ngày gần nhất</span>
                <Link href={`/tai-san-so/${ts.ma}`} className="font-semibold text-nhan hover:underline">
                  Sổ lệnh & biểu đồ realtime →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vien bg-vien md:grid-cols-4">
        {[
          { nhan: "Tổng vốn hoá (top ~1.000)", giaTri: `$${usdGon(bang.tongVonHoa)}` },
          { nhan: "Thị phần Bitcoin", giaTri: thiPhanBtc != null ? `${thiPhanBtc.toFixed(2).replace(".", ",")}%` : "—" },
          { nhan: "Tỷ giá USD/VND", giaTri: vnd(tyGia) },
          {
            nhan: "Cập nhật",
            giaTri: new Date(bang.capNhat).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            }),
          },
        ].map((o) => (
          <div key={o.nhan} className="bg-nen p-4">
            <p className="text-chu-phu">{o.nhan}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{o.giaTri}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <p className="nhan-muc">Xếp hạng</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Top {bang.ds.length} theo vốn hoá</h2>
        <BangTienSoTrucTiep ds={bang.ds} tyGia={tyGia} />
        <p className="mt-3 text-[11px] text-chu-phu">
          Xếp hạng và vốn hoá: CoinGecko qua Mofi. Giá và % 24h: Binance realtime (cặp USDT). Bấm vào mã để xem sổ lệnh, biểu đồ realtime. Tài sản số có biến động lớn, giá chỉ mang tính tham khảo.
        </p>
      </section>
    </>
  );
}
