import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DaiGia, type NhomGia } from "@/components/DaiGia";
import { DuongNho } from "@/components/DuongNho";
import { diem, giaNghin, mauTangGiam, phanTram, thayDoi, tyDong, usd, vonHoa } from "@/lib/dinh-dang";
import { layBangGia, layChiSo, layTienSo, type CoPhieu } from "@/lib/mofi";

const LOP_TAI_SAN = [
  { ten: "Chứng khoán", moTa: "Cổ phiếu niêm yết trên HOSE, HNX và UPCOM, cập nhật trong phiên.", trangThai: "1.525 mã" },
  { ten: "Tài sản số", moTa: "Bitcoin, Ethereum và các tài sản mã hoá phổ biến.", trangThai: "2 tài sản" },
  { ten: "Hàng hoá", moTa: "Dầu, cà phê, kim loại công nghiệp và nông sản quốc tế.", trangThai: "Sắp có" },
  { ten: "Kim loại quý", moTa: "Vàng miếng, vàng nhẫn và bạc của các thương hiệu trong nước.", trangThai: "Sắp có" },
];

export default function TrangChu() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:pt-20">
        <h1 className="text-[34px] leading-tight font-bold tracking-[-0.035em] sm:text-5xl">
          Nền tảng theo dõi
          <br />
          đa lớp tài sản
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-chu-phu">
          Chứng khoán, hàng hoá, tài sản số và kim loại quý trên cùng một màn hình.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/bang-gia" className="flex h-10 items-center bg-chu px-6 text-sm font-semibold text-nen hover:opacity-90">
            Xem bảng giá
          </Link>
          <Link
            href="/co-phieu/VNM"
            className="flex h-10 items-center border border-vien px-6 text-sm font-semibold hover:bg-nen-phu"
          >
            Phân tích cổ phiếu
          </Link>
        </div>
      </section>

      <Suspense fallback={<div className="h-[42rem] border-y border-vien" />}>
        <ThiTruong />
      </Suspense>

      <section className="border-t border-vien bg-nen-phu">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="nhan-muc">Một nơi</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Bốn lớp tài sản, một màn hình.</h2>
          <p className="mt-2 max-w-xl text-chu-phu">
            Finlo gom dữ liệu của nhiều thị trường về một chỗ để bạn so sánh và ra quyết định nhanh hơn.
          </p>
          <div className="mt-8 grid border-t border-l border-vien sm:grid-cols-2 lg:grid-cols-4">
            {LOP_TAI_SAN.map((lop, i) => (
              <div key={lop.ten} className="border-r border-b border-vien bg-nen p-5">
                <p className="nhan-muc">Lớp {i + 1}</p>
                <h3 className="mt-2 text-[15px] font-semibold">{lop.ten}</h3>
                <p className="mt-1 text-chu-phu">{lop.moTa}</p>
                <p className={`mt-4 font-medium ${lop.trangThai === "Sắp có" ? "text-dung" : "text-nhan"}`}>
                  {lop.trangThai}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-[-0.03em]">Theo dõi thị trường ngay hôm nay.</h2>
        <p className="mt-2 text-chu-phu">Miễn phí, không cần đăng ký.</p>
        <Link
          href="/bang-gia"
          className="mt-6 inline-flex h-10 items-center bg-chu px-6 text-sm font-semibold text-nen hover:opacity-90"
        >
          Mở bảng giá
        </Link>
      </section>
    </>
  );
}

// Phần số liệu: tải lúc có người truy cập (đã cache ~1 phút), không tải lúc build
async function ThiTruong() {
  await connection();
  const [bangGia, chiSo, tienSo] = await Promise.all([layBangGia(), layChiSo(), layTienSo()]);
  const ds = bangGia.coPhieu;

  // Chỉ xét mã có thanh khoản đáng kể để danh sách tăng/giảm không toàn mã ít giao dịch
  const thanhKhoan = ds.filter((cp) => cp.giaTri >= 10e9);
  const tangManh = [...thanhKhoan].sort((a, b) => b.phanTram - a.phanTram).slice(0, 8);
  const giamManh = [...thanhKhoan].sort((a, b) => a.phanTram - b.phanTram).slice(0, 8);
  const vonHoaLon = [...ds].sort((a, b) => (b.vonHoa ?? 0) - (a.vonHoa ?? 0)).slice(0, 8);

  const coGiaoDich = ds.filter((cp) => cp.khoiLuong > 0);
  const soTang = coGiaoDich.filter((cp) => cp.phanTram > 0).length;
  const soGiam = coGiaoDich.filter((cp) => cp.phanTram < 0).length;
  const soDung = coGiaoDich.length - soTang - soGiam;
  const tongGiaTri = ds.reduce((s, cp) => s + cp.giaTri, 0);

  const nhom: NhomGia[] = [
    {
      ten: "Chỉ số",
      moTa: `${chiSo.length} chỉ số`,
      href: "/bang-gia",
      muc: chiSo.map((cs) => ({ ten: cs.ten, gia: diem(cs.diem), phanTram: cs.phanTram })),
    },
    {
      ten: "Chứng khoán",
      moTa: `+${ds.length.toLocaleString("vi-VN")} mã`,
      href: "/bang-gia",
      muc: ds.slice(0, 8).map((cp) => ({ ten: cp.ma, gia: giaNghin(cp.gia), phanTram: cp.phanTram })),
    },
    {
      ten: "Tài sản số",
      moTa: `${tienSo.length} tài sản`,
      href: "/",
      muc: tienSo.map((ts) => ({ ten: ts.ma, gia: usd(ts.gia), phanTram: ts.phanTram })),
    },
  ];

  return (
    <>
      <DaiGia nhom={nhom} />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="nhan-muc">Tổng quan</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Thị trường hôm nay</h2>

        <div className="mt-6 grid grid-cols-2 border-t border-l border-vien md:grid-cols-5">
          {chiSo.map((cs) => (
            <div key={cs.ma} className="border-r border-b border-vien p-4">
              <p className="font-semibold">{cs.ten}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{diem(cs.diem)}</p>
              <p className={`tabular-nums ${mauTangGiam(cs.phanTram)}`}>
                {thayDoi(cs.thayDoi)} ({phanTram(cs.phanTram)})
              </p>
              <div className="mt-3">
                <DuongNho diem={cs.lichSu} tang={cs.lichSu[cs.lichSu.length - 1] >= cs.lichSu[0]} />
              </div>
              <p className="mt-1 text-[11px] text-chu-phu">3 tháng</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 border border-vien p-4 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex justify-between text-chu-phu">
              <span>
                Tăng <b className="text-tang">{soTang}</b>
              </span>
              <span>
                Đứng giá <b className="text-dung">{soDung}</b>
              </span>
              <span>
                Giảm <b className="text-giam">{soGiam}</b>
              </span>
            </div>
            <div className="mt-2 flex h-1.5 overflow-hidden">
              <div className="bg-tang" style={{ flex: soTang }} />
              <div className="bg-dung" style={{ flex: soDung }} />
              <div className="bg-giam" style={{ flex: soGiam }} />
            </div>
          </div>
          <div className="md:border-l md:border-vien md:pl-6">
            <p className="text-chu-phu">Giá trị giao dịch toàn thị trường</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{tyDong(tongGiaTri)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <BangTop tieuDe="Vốn hoá lớn nhất" ds={vonHoaLon} cotPhu="vonHoa" />
          <BangTop tieuDe="Tăng mạnh nhất" ds={tangManh} cotPhu="giaTri" />
          <BangTop tieuDe="Giảm mạnh nhất" ds={giamManh} cotPhu="giaTri" />
        </div>

        <div className="mt-6 text-right">
          <Link href="/bang-gia" className="font-medium text-nhan hover:underline">
            Xem tất cả {ds.length.toLocaleString("vi-VN")} mã →
          </Link>
        </div>
      </section>
    </>
  );
}

function BangTop({ tieuDe, ds, cotPhu }: { tieuDe: string; ds: CoPhieu[]; cotPhu: "vonHoa" | "giaTri" }) {
  return (
    <div className="border border-vien">
      <h3 className="border-b border-vien px-3 py-2.5 font-semibold">{tieuDe}</h3>
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-bold tracking-wider text-chu-phu uppercase">
            <th className="px-3 py-1.5 text-left">Mã</th>
            <th className="px-3 py-1.5 text-right">{cotPhu === "vonHoa" ? "Vốn hoá" : "Giá trị GD"}</th>
            <th className="px-3 py-1.5 text-right">Giá</th>
            <th className="px-3 py-1.5 text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {ds.map((cp) => (
            <tr key={cp.ma} className="border-t border-vien hover:bg-nen-phu">
              <td className="px-3 py-2">
                <Link href={`/co-phieu/${cp.ma}`} className="font-semibold hover:underline">
                  {cp.ma}
                </Link>
              </td>
              <td className="px-3 py-2 text-right text-chu-phu tabular-nums">
                {cotPhu === "vonHoa" ? vonHoa(cp.vonHoa) : tyDong(cp.giaTri)}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums ${mauTangGiam(cp.phanTram)}`}>{giaNghin(cp.gia)}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${mauTangGiam(cp.phanTram)}`}>
                {phanTram(cp.phanTram)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
