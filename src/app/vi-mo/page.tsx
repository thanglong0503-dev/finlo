import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BieuDoSo } from "@/components/BieuDoSo";
import { DuongNho } from "@/components/DuongNho";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { layLaiSuat, layViMo, type ChuoiViMo } from "@/lib/mofi";
import { diemCo, dinhDangViMo, giaTriCuoi, kyThanhNgay, nhanKy } from "@/lib/vi-mo";

export const metadata: Metadata = { title: "Lãi suất & Vĩ mô" };

// Thị trường tiền tệ: lãi suất điều hành, liên ngân hàng, tỷ giá (theo ngày)
const TIEN_TE = [
  "tt-lai-suat-tai-cap-von",
  "tt-lai-suat-tai-chiet-khau",
  "tt-lien-ngan-hang-qua-dem",
  "tt-lien-ngan-hang-1-tuan",
  "tt-lien-ngan-hang-1-thang",
  "tt-ty-gia-trung-tam",
  "tt-ty-gia-vcb-ban",
  "nh-tang-truong-tin-dung",
];

// Kinh tế vĩ mô: ưu tiên chuỗi theo quý/tháng (mới nhất), sau đó là chuỗi năm
const KINH_TE = [
  "nso-gdp-tang-truong-quy",
  "cpi-lam-phat-thang",
  "nso-lam-phat-co-ban-thang",
  "nso-iip-thang",
  "nso-ban-le-thang",
  "nso-xuat-khau-thang",
  "nso-nhap-khau-thang",
  "nso-khach-quoc-te-thang",
  "fdi-von-vao",
  "du-tru-ngoai-hoi",
  "can-can-vang-lai",
  "ld-that-nghiep-ilo",
];

export default function TrangViMo() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Vĩ mô</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Lãi suất & Kinh tế vĩ mô</h1>
      <p className="mt-1 text-chu-phu">
        Lãi suất tiết kiệm các ngân hàng, thị trường tiền tệ và các chỉ số kinh tế Việt Nam.
      </p>
      <Suspense
        fallback={
          <>
            <BangMo dong={12} />
            <LuoiMo so={8} />
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
  const [laiSuat, tienTe, kinhTe, gdpNam, cpiNam] = await Promise.all([
    layLaiSuat(),
    Promise.all(TIEN_TE.map(layViMo)),
    Promise.all(KINH_TE.map(layViMo)),
    layViMo("gdp-tang-truong"),
    layViMo("cpi-lam-phat"),
  ]);

  // Chỉ hiện các kỳ hạn có ít nhất một ngân hàng niêm yết
  const kyHan = laiSuat.kyHan.filter((k) => laiSuat.nganHang.some((b) => b.ls[k.ma] != null));
  const caoNhat = Object.fromEntries(
    kyHan.map((k) => [k.ma, Math.max(...laiSuat.nganHang.map((b) => b.ls[k.ma] ?? -1))]),
  );
  const nganHang = [...laiSuat.nganHang].sort((a, b) => (b.ls["12t"] ?? 0) - (a.ls["12t"] ?? 0));
  const tenKhoi: Record<string, string> = {
    "quoc-doanh": "Quốc doanh",
    "co-phan": "Cổ phần",
    "nha-nuoc-mua": "NN mua lại",
    "kiem-soat-dac-biet": "Kiểm soát đặc biệt",
  };

  const lnh = ["tt-lien-ngan-hang-qua-dem", "tt-lien-ngan-hang-1-tuan", "tt-lien-ngan-hang-1-thang"]
    .map((ma) => tienTe.find((c) => c?.ma === ma))
    .filter((c): c is ChuoiViMo => c != null);

  return (
    <>
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="nhan-muc">Lãi suất tiết kiệm</p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Lãi suất huy động theo kỳ hạn</h2>
          </div>
          <p className="text-chu-phu">{laiSuat.coSo} · %/năm</p>
        </div>
        <div className="mt-4 overflow-x-auto border border-vien rounded-2xl">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-vien text-[10px] font-bold tracking-wider text-chu-phu uppercase">
              <tr>
                <th className="sticky left-0 bg-nen px-3 py-2 text-left">Ngân hàng</th>
                {kyHan.map((k) => (
                  <th key={k.ma} className={`px-3 py-2 text-right ${k.ma === "12t" ? "text-nhan" : ""}`}>
                    {k.ngan}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nganHang.map((b) => (
                <tr key={b.ma} className="border-t border-vien hover:bg-nhan-nhat">
                  <td className="sticky left-0 bg-nen px-3 py-2">
                    {b.maCk ? (
                      <Link href={`/co-phieu/${b.maCk}`} className="font-semibold hover:underline">
                        {b.ten}
                      </Link>
                    ) : (
                      <span className="font-semibold">{b.ten}</span>
                    )}
                    <span className="ml-2 text-[11px] text-chu-phu">{tenKhoi[b.khoi] ?? b.khoi}</span>
                  </td>
                  {kyHan.map((k) => {
                    const v = b.ls[k.ma];
                    const laCaoNhat = v != null && v === caoNhat[k.ma];
                    return (
                      <td
                        key={k.ma}
                        className={`px-3 py-2 text-right tabular-nums ${
                          laCaoNhat ? "bg-nhan-nhat font-semibold text-nhan" : ""
                        } ${k.ma === "12t" ? "font-semibold" : ""}`}
                      >
                        {v != null ? v.toLocaleString("vi-VN", { minimumFractionDigits: 1 }) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-chu-phu">
          Ô xanh: cao nhất ở kỳ hạn đó. Sắp xếp theo kỳ hạn 12 tháng. Nguồn: biểu lãi suất công khai của từng ngân hàng
          qua Mofi, cập nhật {nhanKy(laiSuat.capNhat.slice(0, 10))}.
        </p>
      </section>

      <section className="mt-10">
        <p className="nhan-muc">Thị trường tiền tệ</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Lãi suất điều hành, liên ngân hàng và tỷ giá</h2>
        <LuoiChiTieu chuoi={tienTe} />
        {lnh.length > 0 && (
          <div className="mt-4 border border-vien p-4 rounded-2xl overflow-hidden">
            <h3 className="flex items-center gap-2 font-semibold">
              Lãi suất liên ngân hàng
            </h3>
            <div className="mt-3">
              <BieuDoSo
                donVi="%"
                cao={260}
                duong={lnh.map((c) => ({
                  ten: c.ten.replace("Lãi suất liên ngân hàng ", ""),
                  diem: diemCo(c).map((d) => ({ time: kyThanhNgay(d.ky), value: d.gt })),
                }))}
              />
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <p className="nhan-muc">Kinh tế</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Các chỉ số kinh tế vĩ mô</h2>
        <LuoiChiTieu chuoi={kinhTe} />
        {gdpNam && cpiNam && (
          <div className="mt-4 border border-vien p-4 rounded-2xl overflow-hidden">
            <h3 className="flex items-center gap-2 font-semibold">
              Tăng trưởng GDP và lạm phát theo năm
            </h3>
            <div className="mt-3">
              <BieuDoSo
                donVi="%"
                duong={[gdpNam, cpiNam].map((c) => ({
                  ten: c.ten,
                  diem: diemCo(c)
                    .filter((d) => Number(d.ky) >= 2000)
                    .map((d) => ({ time: kyThanhNgay(d.ky), value: d.gt })),
                }))}
              />
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-chu-phu">
          Nguồn: Cục Thống kê, Ngân hàng Nhà nước, IMF, World Bank qua Mofi. Chỉ số theo tháng/quý là mức tăng so với
          cùng kỳ năm trước.
        </p>
      </section>
    </>
  );
}

// Lưới thẻ chỉ tiêu: giá trị mới nhất, thay đổi so với kỳ trước và đường xu hướng
function LuoiChiTieu({ chuoi }: { chuoi: (ChuoiViMo | null)[] }) {
  const co = chuoi.filter((c): c is ChuoiViMo => c != null);
  return (
    <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vien bg-vien md:grid-cols-4">
      {co.map((c) => {
        const { cuoi, truoc } = giaTriCuoi(c);
        if (!cuoi) return null;
        // Chỉ tiêu tính bằng % thì so chênh lệch điểm %, còn lại so phần trăm thay đổi
        const laPhanTram = c.donVi.startsWith("%");
        const doi = !truoc ? null : laPhanTram ? cuoi.gt - truoc.gt : truoc.gt ? (cuoi.gt / truoc.gt - 1) * 100 : null;
        const xuHuong = diemCo(c).slice(-24).map((d) => d.gt);
        return (
          <div key={c.ma} className="bg-nen p-4" title={`Nguồn: ${c.nguon}`}>
            <p className="line-clamp-2 min-h-[2.5em] text-chu-phu">{c.ten}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{dinhDangViMo(cuoi.gt, c.donVi)}</p>
            <p className="text-[11px] text-chu-phu">
              {nhanKy(cuoi.ky)}
              {doi != null && doi !== 0 && (
                <span className={`ml-1.5 ${doi > 0 ? "text-tang" : "text-giam"}`}>
                  {doi > 0 ? "+" : "−"}
                  {Math.abs(doi).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
                  {laPhanTram ? " điểm %" : "%"} so với kỳ trước
                </span>
              )}
            </p>
            {xuHuong.length > 2 && (
              <div className="mt-2">
                <DuongNho diem={xuHuong} tang={xuHuong[xuHuong.length - 1] >= xuHuong[0]} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
