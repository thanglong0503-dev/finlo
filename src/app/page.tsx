import Link from "next/link";
import { DaiGia, type MucGia } from "@/components/DaiGia";
import { diem, giaNghin, mauTangGiam, phanTram, usd } from "@/lib/dinh-dang";
import { layBangGia, layChiSo, layTienSo, type CoPhieu } from "@/lib/mofi";

const LOP_TAI_SAN = [
  { bieuTuong: "📈", ten: "Chứng khoán", moTa: "Hơn 1.500 mã cổ phiếu trên HOSE, HNX và UPCOM.", san: true },
  { bieuTuong: "🛢️", ten: "Hàng hoá", moTa: "Dầu, cà phê, kim loại công nghiệp, nông sản.", san: false },
  { bieuTuong: "🥇", ten: "Kim loại quý", moTa: "Vàng miếng, vàng nhẫn và bạc trong nước.", san: false },
  { bieuTuong: "₿", ten: "Tài sản số", moTa: "Bitcoin, Ethereum và các đồng phổ biến.", san: true },
];

function BangTop({ tieuDe, ds }: { tieuDe: string; ds: CoPhieu[] }) {
  return (
    <div className="rounded-2xl border border-vien p-5">
      <h3 className="mb-3 font-semibold">{tieuDe}</h3>
      <ul className="divide-y divide-vien">
        {ds.map((cp) => (
          <li key={cp.ma}>
            <Link href={`/co-phieu/${cp.ma}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
              <div className="min-w-0">
                <div className="font-semibold">{cp.ma}</div>
                <div className="truncate text-xs text-chu-phu">{cp.ten}</div>
              </div>
              <div className="text-right tabular-nums">
                <div>{giaNghin(cp.gia)}</div>
                <div className={`text-xs ${mauTangGiam(cp.phanTram)}`}>{phanTram(cp.phanTram)}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function TrangChu() {
  const [bangGia, chiSo, tienSo] = await Promise.all([layBangGia(), layChiSo(), layTienSo()]);

  // Chỉ xét mã có thanh khoản đáng kể để danh sách tăng/giảm không toàn mã "rác"
  const thanhKhoan = bangGia.coPhieu.filter((cp) => cp.giaTri >= 10e9);
  const tangManh = [...thanhKhoan].sort((a, b) => b.phanTram - a.phanTram).slice(0, 5);
  const giamManh = [...thanhKhoan].sort((a, b) => a.phanTram - b.phanTram).slice(0, 5);
  const soiNoi = bangGia.coPhieu.slice(0, 5);

  const dai: MucGia[] = [
    ...chiSo.map((cs) => ({ ten: cs.ten, gia: diem(cs.diem), phanTram: cs.phanTram })),
    ...bangGia.coPhieu.slice(0, 10).map((cp) => ({ ten: cp.ma, gia: giaNghin(cp.gia), phanTram: cp.phanTram })),
    ...tienSo.map((ts) => ({ ten: ts.ma, gia: `$${usd(ts.gia)}`, phanTram: ts.phanTram })),
  ];

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:pt-24">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          Lo trọn tài sản của bạn
          <br />
          trong <span className="text-nhan">một nơi</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-chu-phu">
          Chứng khoán, hàng hoá, kim loại quý và tài sản số. Theo dõi giá, xem biểu đồ, so sánh cơ hội trên cùng một
          màn hình.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/bang-gia" className="rounded-full bg-chu px-6 py-3 font-semibold text-nen hover:opacity-90">
            Xem bảng giá
          </Link>
          <Link href="/co-phieu/VNM" className="rounded-full border border-vien px-6 py-3 font-semibold hover:bg-nen-phu">
            Xem biểu đồ
          </Link>
        </div>
      </section>

      <DaiGia muc={dai} />

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold">Thị trường hôm nay</h2>
          <Link href="/bang-gia" className="text-sm text-nhan hover:underline">
            Tất cả {bangGia.coPhieu.length.toLocaleString("vi-VN")} mã →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <BangTop tieuDe="🔥 Sôi nổi nhất" ds={soiNoi} />
          <BangTop tieuDe="▲ Tăng mạnh" ds={tangManh} />
          <BangTop tieuDe="▼ Giảm mạnh" ds={giamManh} />
        </div>
      </section>

      <section className="bg-nen-phu">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xs font-semibold tracking-widest text-nhan">MỘT NƠI</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Bốn lớp tài sản, một màn hình.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOP_TAI_SAN.map((lop) => (
              <div key={lop.ten} className="rounded-2xl border border-vien bg-nen p-5">
                <div className="text-3xl">{lop.bieuTuong}</div>
                <h3 className="mt-3 font-semibold">{lop.ten}</h3>
                <p className="mt-1 text-sm text-chu-phu">{lop.moTa}</p>
                {!lop.san && <p className="mt-3 text-xs font-medium text-dung">Sắp có</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Bắt đầu theo dõi thị trường ngay.</h2>
        <p className="mt-3 text-chu-phu">Miễn phí, không cần đăng ký.</p>
        <Link
          href="/bang-gia"
          className="mt-6 inline-block rounded-full bg-nhan px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          Mở bảng giá
        </Link>
      </section>
    </>
  );
}
