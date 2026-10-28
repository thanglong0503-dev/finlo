import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BieuDoVang } from "@/components/BieuDoVang";
import { usd, vnd } from "@/lib/dinh-dang";
import { layBangVang, type ThuongHieuVang } from "@/lib/mofi";

export const metadata: Metadata = { title: "Giá vàng hôm nay" };

const gio = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    : "—";

export default function TrangKimLoaiQuy() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Kim loại quý</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Giá vàng hôm nay</h1>
      <p className="mt-1 text-chu-phu">Giá mua vào và bán ra theo bảng giá công khai của từng thương hiệu, đơn vị đồng.</p>
      <Suspense fallback={<p className="mt-6 text-chu-phu">Đang tải dữ liệu…</p>}>
        <NoiDung />
      </Suspense>
    </div>
  );
}

async function NoiDung() {
  await connection();
  const vang = await layBangVang();
  const { theGioi } = vang;

  // Vàng miếng SJC 1 lượng: giá bán thấp nhất giữa các thương hiệu, so với vàng thế giới quy đổi
  const giaMieng = vang.thuongHieu.map((th) => th.gia["mieng-luong"]?.ban).filter((x): x is number => x != null);
  const banThapNhat = giaMieng.length ? Math.min(...giaMieng) : null;
  const chenhTheGioi = banThapNhat != null ? banThapNhat - theGioi.vndLuong : null;

  return (
    <>
      <div className="mt-6 grid grid-cols-2 border-t border-l border-vien md:grid-cols-4">
        {[
          { nhan: "Vàng thế giới", giaTri: `$${usd(theGioi.usdOz)}`, phu: "USD / ounce" },
          { nhan: "Thế giới quy đổi", giaTri: vnd(theGioi.vndLuong), phu: "đồng / lượng" },
          { nhan: "SJC bán ra thấp nhất", giaTri: banThapNhat != null ? vnd(banThapNhat) : "—", phu: "đồng / lượng" },
          {
            nhan: "Chênh lệch SJC – thế giới",
            giaTri: chenhTheGioi != null ? vnd(chenhTheGioi) : "—",
            phu:
              chenhTheGioi != null
                ? `${((chenhTheGioi / theGioi.vndLuong) * 100).toFixed(1).replace(".", ",")}% so với thế giới`
                : "",
          },
        ].map((o) => (
          <div key={o.nhan} className="border-r border-b border-vien p-4">
            <p className="text-chu-phu">{o.nhan}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{o.giaTri}</p>
            <p className="text-[11px] text-chu-phu">{o.phu}</p>
          </div>
        ))}
      </div>

      {vang.sanPham.map((sp) => {
        const coGia = vang.thuongHieu.filter((th) => th.gia[sp.ma]);
        if (coGia.length === 0) return null;
        return <BangSanPham key={sp.ma} ten={sp.ten} tuoi={sp.tuoi} ma={sp.ma} thuongHieu={coGia} />;
      })}

      <section className="mt-8">
        <p className="nhan-muc">Lịch sử</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Giá bán vàng miếng 1 lượng</h2>
        <p className="mt-1 text-chu-phu">Triệu đồng / lượng, giá bán cuối ngày.</p>
        <div className="mt-4 border border-vien p-4">
          <BieuDoVang duong={vang.lichSu.map((d) => ({ ten: d.ten, diem: d.diem }))} />
        </div>
      </section>

      <section className="mt-8 border-t border-vien pt-6">
        <p className="nhan-muc">Nguồn dữ liệu</p>
        <ul className="mt-3 space-y-1.5 text-chu-phu">
          {vang.thuongHieu.map((th) => (
            <li key={th.ma}>
              <span className="font-medium text-chu">{th.tenDayDu}</span> · cập nhật {gio(th.capNhat)} ·{" "}
              <a href={th.nguon} target="_blank" rel="noopener noreferrer" className="text-nhan hover:underline">
                bảng giá gốc
              </a>
              {th.ghiChu && <span> · {th.ghiChu}</span>}
            </li>
          ))}
          <li>
            Vàng thế giới: gold-api.com (XAU/USD), tỷ giá Vietcombank {vnd(theGioi.tyGia)} đ/USD, quy đổi 1 lượng =
            1,2057 ounce.
          </li>
        </ul>
      </section>
    </>
  );
}

function BangSanPham({
  ten,
  tuoi,
  ma,
  thuongHieu,
}: {
  ten: string;
  tuoi: string;
  ma: string;
  thuongHieu: ThuongHieuVang[];
}) {
  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-semibold">
        {ten} <span className="font-normal text-chu-phu">· tuổi {tuoi}</span>
      </h2>
      <div className="mt-3 overflow-x-auto border border-vien">
        <table className="w-full">
          <thead className="border-b border-vien text-[10px] font-bold tracking-wider text-chu-phu uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Thương hiệu</th>
              <th className="px-3 py-2 text-right">Mua vào</th>
              <th className="px-3 py-2 text-right">Bán ra</th>
              <th className="px-3 py-2 text-right">Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {thuongHieu.map((th) => {
              const g = th.gia[ma];
              return (
                <tr key={th.ma} className="border-t border-vien">
                  <td className="px-3 py-2 font-semibold">{th.ten}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{g.mua != null ? vnd(g.mua) : "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{vnd(g.ban)}</td>
                  <td className="px-3 py-2 text-right text-chu-phu tabular-nums">
                    {g.mua != null ? vnd(g.ban - g.mua) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
