import Link from "next/link";
import { giaNghin } from "@/lib/dinh-dang";
import type { DongTH, HuongTH, KetLuan, PhanTichKyThuat, TongHopTH } from "@/lib/ky-thuat";

const so2 = (x: number) => x.toLocaleString("vi-VN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export const mauKetLuan = (k: KetLuan) =>
  k === "Mua mạnh" || k === "Mua" ? "text-tang" : k === "Bán mạnh" || k === "Bán" ? "text-giam" : "text-dung";

const NHAN_HUONG: Record<HuongTH, { chu: string; mau: string }> = {
  mua: { chu: "Mua", mau: "text-tang" },
  ban: { chu: "Bán", mau: "text-giam" },
  trung: { chu: "Trung tính", mau: "text-chu-phu" },
};

const MUC: KetLuan[] = ["Bán mạnh", "Bán", "Trung tính", "Mua", "Mua mạnh"];

// Thước 5 nấc, kim chỉ vị trí điểm tổng hợp (-1..+1)
function DongHo({ ten, th }: { ten: string; th: TongHopTH }) {
  const viTri = ((th.diem + 1) / 2) * 100;
  return (
    <div className="bg-nen p-4">
      <p className="text-chu-phu">{ten}</p>
      <p className={`mt-1 text-2xl font-bold ${mauKetLuan(th.ketLuan)}`}>{th.ketLuan}</p>
      <div className="relative mt-4">
        <div className="grid h-1.5 grid-cols-5 gap-0.5">
          <span className="bg-giam" />
          <span className="bg-giam/50" />
          <span className="bg-vien" />
          <span className="bg-tang/50" />
          <span className="bg-tang" />
        </div>
        <span
          className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 bg-chu"
          style={{ left: `${Math.min(99, Math.max(1, viTri))}%` }}
        />
      </div>
      <div className="mt-1.5 grid grid-cols-5 text-center text-[10px] text-chu-phu">
        {MUC.map((m) => (
          <span key={m} className={m === th.ketLuan ? "font-semibold text-chu" : ""}>
            {m}
          </span>
        ))}
      </div>
      <p className="mt-3 flex gap-4 text-[12px] tabular-nums">
        <span className="text-tang">Mua {th.mua}</span>
        <span className="text-chu-phu">Trung tính {th.trung}</span>
        <span className="text-giam">Bán {th.ban}</span>
      </p>
    </div>
  );
}

function BangTH({ tieuDe, ds, laGia }: { tieuDe: string; ds: DongTH[]; laGia?: boolean }) {
  return (
    <section className="border border-vien">
      <h2 className="flex items-center gap-2 border-b border-vien px-4 py-2.5 font-semibold">
        <span className="h-3.5 w-1 bg-nhan" />
        {tieuDe}
      </h2>
      <table className="w-full">
        <thead>
          <tr className="border-b border-vien text-left text-[12px] text-chu-phu">
            <th className="px-4 py-2 font-medium">Chỉ báo</th>
            <th className="px-4 py-2 text-right font-medium">Giá trị</th>
            <th className="px-4 py-2 text-right font-medium">Tín hiệu</th>
          </tr>
        </thead>
        <tbody>
          {ds.map((d) => (
            <tr key={d.ten} className="border-b border-vien last:border-b-0">
              <td className="px-4 py-2">
                {d.ten}
                {d.ghiChu && <span className="ml-2 text-[11px] text-chu-phu">{d.ghiChu}</span>}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">
                {d.giaTri == null ? "—" : laGia ? giaNghin(d.giaTri) : so2(d.giaTri)}
              </td>
              <td className={`px-4 py-2 text-right font-semibold ${NHAN_HUONG[d.huong].mau}`}>
                {d.giaTri == null ? "—" : NHAN_HUONG[d.huong].chu}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function KyThuat({ ma, kt }: { ma: string; kt: PhanTichKyThuat }) {
  const { muc } = kt;
  const thang = [
    { ten: "R3", gt: muc.r3 },
    { ten: "R2", gt: muc.r2 },
    { ten: "R1", gt: muc.r1 },
    { ten: "Pivot", gt: muc.pivot },
    { ten: "S1", gt: muc.s1 },
    { ten: "S2", gt: muc.s2 },
    { ten: "S3", gt: muc.s3 },
  ];
  const fl = kt.finlo;

  return (
    <>
      <p className="text-chu-phu">
        Tính trên nến ngày đến phiên {ngayVN(kt.ngay)}, giá đóng cửa {giaNghin(kt.gia)}. Tín hiệu là kết quả máy tính
        theo quy tắc cố định, không phải khuyến nghị đầu tư.
      </p>

      <div className="mt-4 grid gap-px border border-vien bg-vien md:grid-cols-3">
        <DongHo ten="Tổng hợp" th={kt.tong} />
        <DongHo ten="Đường trung bình" th={kt.tongTB} />
        <DongHo ten="Dao động" th={kt.tongDD} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BangTH tieuDe="Đường trung bình" ds={kt.trungBinh} laGia />
        <div className="flex flex-col gap-6">
          <BangTH tieuDe="Dao động" ds={kt.daoDong} />
          <section className="border border-vien">
            <h2 className="flex items-center gap-2 border-b border-vien px-4 py-2.5 font-semibold">
              <span className="h-3.5 w-1 bg-nhan" />
              Biến động và thanh khoản
            </h2>
            <dl className="grid grid-cols-2">
              <div className="border-r border-vien px-4 py-3">
                <dt className="text-chu-phu">ATR 14 / giá</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {kt.atrPhanTram != null ? `${so2(kt.atrPhanTram)}%` : "—"}
                </dd>
              </div>
              <div className="px-4 py-3">
                <dt className="text-chu-phu">KL phiên / TB 20 phiên</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {kt.klSoTb20 != null ? `${so2(kt.klSoTb20)} lần` : "—"}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border border-vien">
          <h2 className="flex items-center gap-2 border-b border-vien px-4 py-2.5 font-semibold">
            <span className="h-3.5 w-1 bg-nhan" />
            Hỗ trợ và kháng cự (pivot cổ điển)
          </h2>
          <ul>
            {[...thang, { ten: "Gia", gt: kt.gia }]
              .sort((x, y) => y.gt - x.gt)
              .map((t) =>
                t.ten === "Gia" ? (
                  <li
                    key="gia"
                    className="flex justify-between border-b border-vien bg-nhan-nhat px-4 py-1.5 text-[12px] font-semibold text-nhan"
                  >
                    <span>Giá hiện tại</span>
                    <span className="tabular-nums">{giaNghin(kt.gia)}</span>
                  </li>
                ) : (
                  <li key={t.ten} className="flex justify-between border-b border-vien px-4 py-2 last:border-b-0">
                    <span
                      className={t.ten.startsWith("R") ? "text-giam" : t.ten.startsWith("S") ? "text-tang" : "font-semibold"}
                    >
                      {t.ten === "Pivot" ? "Điểm xoay" : t.ten.startsWith("R") ? `Kháng cự ${t.ten}` : `Hỗ trợ ${t.ten}`}
                    </span>
                    <span className="tabular-nums">{giaNghin(t.gt)}</span>
                  </li>
                ),
              )}
          </ul>
        </section>

        <section className="border border-vien">
          <h2 className="flex items-center gap-2 border-b border-vien px-4 py-2.5 font-semibold">
            <span className="h-3.5 w-1 bg-nhan" />
            Vị trí giá trong biên độ
          </h2>
          <div className="divide-y divide-vien">
            {kt.bienKy.map((b) => {
              const vt = b.cao > b.thap ? ((kt.gia - b.thap) / (b.cao - b.thap)) * 100 : 50;
              return (
                <div key={b.ky} className="px-4 py-3">
                  <p className="flex justify-between">
                    <span className="font-medium">{b.ky === 250 ? "52 tuần" : `${b.ky} phiên`}</span>
                    <span className="text-[12px] text-chu-phu tabular-nums">cách đỉnh {so2((1 - kt.gia / b.cao) * 100)}%</span>
                  </p>
                  <div className="relative mt-2 h-1.5 bg-nen-phu">
                    <span className="absolute inset-y-0 left-0 bg-nhan/40" style={{ width: `${vt}%` }} />
                    <span
                      className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 bg-chu"
                      style={{ left: `${Math.min(99.5, Math.max(0.5, vt))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 flex justify-between text-[12px] text-chu-phu tabular-nums">
                    <span>Thấp {giaNghin(b.thap)}</span>
                    <span>Cao {giaNghin(b.cao)}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="h-3.5 w-1 bg-nhan" />
          Hiệu suất giá
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-px border border-vien bg-vien md:grid-cols-6">
          {kt.hieuSuat.map((h) => (
            <div key={h.ten} className="bg-nen px-4 py-3">
              <dt className="text-chu-phu">{h.ten}</dt>
              <dd
                className={`mt-0.5 text-[15px] font-semibold tabular-nums ${
                  h.gt == null ? "" : h.gt > 0 ? "text-tang" : h.gt < 0 ? "text-giam" : "text-dung"
                }`}
              >
                {h.gt == null ? "—" : `${h.gt > 0 ? "+" : h.gt < 0 ? "−" : ""}${so2(Math.abs(h.gt))}%`}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <p className="nhan-muc">Chỉ báo Finlo</p>
        <div className="mt-3 grid gap-px border border-vien bg-vien md:grid-cols-3">
          <div className="bg-nen p-4">
            <p className="flex items-center gap-2 font-semibold">
              FL Xu hướng <span className="border border-nhan px-1 text-[10px] text-nhan">Finlo</span>
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                fl.xuHuong == null ? "" : fl.xuHuong > 0 ? "text-tang" : fl.xuHuong < 0 ? "text-giam" : "text-dung"
              }`}
            >
              {fl.xuHuong == null ? "—" : `${fl.xuHuong > 0 ? "+" : fl.xuHuong < 0 ? "−" : ""}${Math.abs(Math.round(fl.xuHuong))}`}
            </p>
            <p className="mt-1 text-[12px] text-chu-phu">
              Điểm −100 đến +100 gộp giá/EMA20, EMA20/EMA50, MACD và RSI. Trên 0 là xu hướng tăng chiếm ưu thế.
            </p>
          </div>
          <div className="bg-nen p-4">
            <p className="flex items-center gap-2 font-semibold">
              FL Dòng tiền <span className="border border-nhan px-1 text-[10px] text-nhan">Finlo</span>
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                fl.dongTien == null ? "" : fl.dongTien > 0 ? "text-tang" : fl.dongTien < 0 ? "text-giam" : "text-dung"
              }`}
            >
              {fl.dongTien == null ? "—" : `${fl.dongTien > 0 ? "Tiền vào" : "Tiền ra"} ${so2(Math.abs(fl.dongTien))}`}
            </p>
            <p className="mt-1 text-[12px] text-chu-phu">
              Vị trí giá đóng cửa trong phiên có trọng số khối lượng, 20 phiên. Dương kéo dài là tiền đang vào.
            </p>
          </div>
          <div className="bg-nen p-4">
            <p className="flex items-center gap-2 font-semibold">
              FL Vùng giá <span className="border border-nhan px-1 text-[10px] text-nhan">Finlo</span>
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                fl.vungGia?.viTri === "tren" ? "text-tang" : fl.vungGia?.viTri === "duoi" ? "text-giam" : "text-dung"
              }`}
            >
              {fl.vungGia == null
                ? "—"
                : fl.vungGia.viTri === "tren"
                  ? "Vượt dải trên"
                  : fl.vungGia.viTri === "duoi"
                    ? "Thủng dải dưới"
                    : "Trong dải"}
            </p>
            <p className="mt-1 text-[12px] text-chu-phu tabular-nums">
              {fl.vungGia
                ? `Dải EMA20 ± 2 ATR: ${giaNghin(fl.vungGia.duoi)} – ${giaNghin(fl.vungGia.tren)}`
                : "Chưa đủ dữ liệu"}
            </p>
          </div>
        </div>

        {fl.tinHieu.length > 0 && (
          <div className="mt-4 border border-vien">
            <p className="border-b border-vien px-4 py-2.5 font-semibold">Tín hiệu Finlo gần đây</p>
            <ul>
              {fl.tinHieu.map((t) => (
                <li key={`${t.time}${t.ly}`} className="flex items-center gap-3 border-b border-vien px-4 py-2 last:border-b-0">
                  <span className="w-24 shrink-0 text-chu-phu tabular-nums">{ngayVN(t.time)}</span>
                  <span
                    className={`w-12 shrink-0 text-center text-[11px] font-bold text-white ${t.loai === "mua" ? "bg-tang" : "bg-giam"}`}
                  >
                    {t.loai === "mua" ? "MUA" : "BÁN"}
                  </span>
                  <span>{t.ly}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link
          href={`/bieu-do?loai=ck&ma=${ma}`}
          className="mt-4 inline-flex h-9 items-center bg-nhan px-3 font-semibold text-white hover:brightness-110"
        >
          Mở biểu đồ tương tác với các chỉ báo →
        </Link>
      </section>
    </>
  );
}
