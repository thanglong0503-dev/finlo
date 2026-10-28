import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BieuDoTienSo } from "@/components/BieuDoTienSo";
import { giaUsd, mauTangGiam, phanTram, usdGon, vnd } from "@/lib/dinh-dang";
import { layBangTienSo, layBangVang, layTienSo } from "@/lib/mofi";

export const metadata: Metadata = { title: "Tài sản số" };

export default function TrangTaiSanSo() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Tài sản số</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Giá tài sản số</h1>
      <p className="mt-1 text-chu-phu">Giá tham khảo theo USD, quy đổi VND theo tỷ giá bán của Vietcombank.</p>
      <Suspense fallback={<p className="mt-6 text-chu-phu">Đang tải dữ liệu…</p>}>
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
            <div key={ts.ma} className="border border-vien p-4">
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
              <p className="mt-1 text-[11px] text-chu-phu">90 ngày gần nhất</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 border-t border-l border-vien md:grid-cols-4">
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
          <div key={o.nhan} className="border-r border-b border-vien p-4">
            <p className="text-chu-phu">{o.nhan}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{o.giaTri}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <p className="nhan-muc">Xếp hạng</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Top {bang.ds.length} theo vốn hoá</h2>
        <div className="mt-4 overflow-x-auto border border-vien">
          <table className="w-full">
            <thead className="border-b border-vien text-[10px] font-bold tracking-wider text-chu-phu uppercase">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Tài sản</th>
                <th className="px-3 py-2 text-right">Giá (USD)</th>
                <th className="hidden px-3 py-2 text-right sm:table-cell">Giá (VND)</th>
                <th className="px-3 py-2 text-right">Vốn hoá</th>
                <th className="hidden px-3 py-2 text-right sm:table-cell">Thị phần</th>
              </tr>
            </thead>
            <tbody>
              {bang.ds.map((x) => (
                <tr key={x.ma} className="border-t border-vien hover:bg-nhan-nhat">
                  <td className="px-3 py-2 text-chu-phu tabular-nums">{x.hang}</td>
                  <td className="px-3 py-2">
                    <span className="font-semibold">{x.ma}</span>
                    <span className="ml-2 text-[11px] text-chu-phu">{x.ten}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{giaUsd(x.gia)}</td>
                  <td className="hidden px-3 py-2 text-right text-chu-phu tabular-nums sm:table-cell">
                    {vnd(x.gia * tyGia)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">${usdGon(x.vonHoa)}</td>
                  <td className="hidden px-3 py-2 text-right text-chu-phu tabular-nums sm:table-cell">
                    {x.thiPhan.toFixed(2).replace(".", ",")}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-chu-phu">
          Nguồn: CoinGecko qua Mofi. Tài sản số có biến động lớn, giá chỉ mang tính tham khảo.
        </p>
      </section>
    </>
  );
}
