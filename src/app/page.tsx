import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DaiGia, type NhomGia } from "@/components/DaiGia";
import { DanhMucTheoDoi } from "@/components/DanhMucTheoDoi";
import { DuongNho } from "@/components/DuongNho";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { diem, giaNghin, mauTangGiam, phanTram, thayDoi, tyDong, usd, vonHoa } from "@/lib/dinh-dang";
import { layBangGia, layBangVang, layChiSo, layTienSo, type CoPhieu } from "@/lib/mofi";

const LOP_TAI_SAN = [
  {
    ten: "Chứng khoán",
    moTa: "Cổ phiếu niêm yết trên HOSE, HNX và UPCOM, cập nhật trong phiên.",
    trangThai: "1.525 mã",
    href: "/bang-gia",
  },
  {
    ten: "Tài sản số",
    moTa: "Bitcoin, Ethereum và top 30 tài sản mã hoá theo vốn hoá.",
    trangThai: "30 tài sản",
    href: "/tai-san-so",
  },
  {
    ten: "Kim loại quý",
    moTa: "Vàng miếng, vàng nhẫn của PNJ, Bảo Tín Mạnh Hải, Phú Quý và vàng thế giới.",
    trangThai: "Vàng SJC, nhẫn trơn",
    href: "/kim-loai-quy",
  },
  {
    ten: "Hàng hoá",
    moTa: "Dầu, cà phê, kim loại công nghiệp và nông sản quốc tế.",
    trangThai: "Sắp có",
    href: null,
  },
];

export default function TrangChu() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="luoi-nen absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-14 text-center sm:pt-20">
          <p className="inline-flex items-center gap-2 border border-nhan/30 bg-nhan-nhat px-3 py-1 text-[12px] font-medium text-nhan">
            <span className="cham-song h-1.5 w-1.5 bg-nhan" />
            Dữ liệu thị trường cập nhật mỗi phút
          </p>
          <h1 className="mt-5 text-[34px] leading-tight font-bold tracking-[-0.035em] sm:text-5xl">
            Nền tảng theo dõi
            <br />
            <span className="text-nhan">đa lớp tài sản</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-chu-phu">
            Chứng khoán, hàng hoá, tài sản số và kim loại quý trên cùng một màn hình.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/bang-gia"
              className="flex h-10 items-center bg-nhan px-6 text-sm font-semibold text-white hover:brightness-110"
            >
              Xem bảng giá
            </Link>
            <Link
              href="/co-phieu/VNM"
              className="flex h-10 items-center border border-chu bg-nen px-6 text-sm font-semibold hover:bg-chu hover:text-nen"
            >
              Phân tích cổ phiếu
            </Link>
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <>
            <div className="h-[42px] border-y-2 border-nhan bg-toi" />
            <div className="mx-auto max-w-6xl px-4 py-12">
              <p className="nhan-muc">Tổng quan</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Thị trường hôm nay</h2>
              <LuoiMo so={5} cot="md:grid-cols-5" />
              <BangMo dong={8} />
            </div>
          </>
        }
      >
        <ThiTruong />
      </Suspense>

      <DanhMucTheoDoi />

      <section className="border-t border-vien bg-nen-phu">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="nhan-muc">Một nơi</p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Bốn lớp tài sản, một màn hình.</h2>
          <p className="mt-2 max-w-xl text-chu-phu">
            Finlo gom dữ liệu của nhiều thị trường về một chỗ để bạn so sánh và ra quyết định nhanh hơn.
          </p>
          <div className="mt-8 grid border-t border-l border-vien sm:grid-cols-2 lg:grid-cols-4">
            {LOP_TAI_SAN.map((lop, i) => {
              const noiDung = (
                <>
                  <p className="text-3xl font-bold tracking-tight text-nhan tabular-nums">0{i + 1}</p>
                  <h3 className="mt-3 text-[15px] font-semibold">{lop.ten}</h3>
                  <p className="mt-1 text-chu-phu">{lop.moTa}</p>
                  <p className={`mt-4 font-medium ${lop.href ? "text-nhan" : "text-dung"}`}>
                    {lop.trangThai}
                    {lop.href && " →"}
                  </p>
                </>
              );
              return lop.href ? (
                <Link
                  key={lop.ten}
                  href={lop.href}
                  className="border-r border-b border-vien bg-nen p-5 shadow-[inset_0_0_0_0_var(--nhan)] transition-shadow hover:shadow-[inset_0_-3px_0_0_var(--nhan)]"
                >
                  {noiDung}
                </Link>
              ) : (
                <div key={lop.ten} className="border-r border-b border-vien bg-nen p-5">
                  {noiDung}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t-2 border-nhan bg-toi text-chu-toi">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-14">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.03em]">
              Theo dõi thị trường <span className="text-nhan-sang">ngay hôm nay.</span>
            </h2>
            <p className="mt-2 text-chu-toi-phu">Miễn phí, không cần đăng ký.</p>
          </div>
          <Link
            href="/bang-gia"
            className="inline-flex h-10 items-center bg-nhan-sang px-6 text-sm font-semibold text-toi hover:brightness-110"
          >
            Mở bảng giá
          </Link>
        </div>
      </section>
    </>
  );
}

// Phần số liệu: tải lúc có người truy cập (đã cache ~1 phút), không tải lúc build
async function ThiTruong() {
  await connection();
  const [bangGia, chiSo, tienSoKq, vangKq] = await Promise.all([
    layBangGia(),
    layChiSo(),
    // Tiền số và vàng là phần phụ: lỗi thì chỉ ẩn nhóm đó trên dải giá
    layTienSo().catch(() => null),
    layBangVang().catch(() => null),
  ]);
  const tienSo = tienSoKq ?? [];
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
      moTa: "Top 30",
      href: "/tai-san-so",
      muc: tienSo.map((ts) => ({ ten: ts.ma, gia: usd(ts.gia), phanTram: ts.phanTram })),
    },
    {
      ten: "Kim loại quý",
      moTa: `${vangKq?.thuongHieu.length ?? 0} thương hiệu`,
      href: "/kim-loai-quy",
      // Giá bán vàng miếng 1 lượng, đổi sang triệu đồng; % so với phiên trước từ lịch sử
      muc: (vangKq?.lichSu ?? []).map((d) => {
        const n = d.diem.length;
        const cuoi = d.diem[n - 1]?.value ?? 0;
        const truoc = d.diem[n - 2]?.value ?? cuoi;
        return {
          ten: d.ma === "the-gioi" ? "Vàng TG" : `SJC ${d.ten}`,
          gia: (cuoi / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }),
          phanTram: truoc ? ((cuoi - truoc) / truoc) * 100 : 0,
        };
      }),
    },
  ].filter((n) => n.muc.length > 0);

  return (
    <>
      <DaiGia nhom={nhom} />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <p className="nhan-muc">Tổng quan</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Thị trường hôm nay</h2>

        <div className="mt-6 grid grid-cols-2 border-t border-l border-vien md:grid-cols-5">
          {chiSo.map((cs, i) => (
            // VN-INDEX nổi bật với vạch xanh phía trên và nền xanh nhạt
            <div
              key={cs.ma}
              className={`border-r border-b border-vien p-4 shadow-[inset_0_2px_0_0_var(--nhan)] ${
                i === 0 ? "bg-nhan-nhat" : "shadow-none hover:shadow-[inset_0_2px_0_0_var(--nhan)]"
              }`}
            >
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
      <h3 className="flex items-center gap-2 border-b border-vien px-3 py-2.5 font-semibold">
        <span className="h-3.5 w-1 bg-nhan" />
        {tieuDe}
      </h3>
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
            <tr key={cp.ma} className="border-t border-vien hover:bg-nhan-nhat">
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
