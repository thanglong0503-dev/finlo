import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangSoLieu, type DongSoLieu } from "@/components/BangSoLieu";
import { BieuDoSo } from "@/components/BieuDoSo";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { layLogo, layTongQuanNganhTC } from "@/lib/mofi";

export const metadata: Metadata = {
  title: "Công ty chứng khoán: cho vay ký quỹ, tự doanh",
  description: "Dư nợ cho vay ký quỹ, danh mục và lãi tự doanh, doanh thu môi giới của các công ty chứng khoán niêm yết.",
};

export default function TrangCTCK() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Thị trường · Ngành</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Công ty chứng khoán</h1>
      <p className="mt-2 text-chu-phu">
        Dư nợ cho vay ký quỹ (margin), danh mục tự doanh và doanh thu môi giới, tổng hợp từ báo cáo tài chính quý.
      </p>
      <Suspense
        fallback={
          <>
            <LuoiMo so={8} />
            <BangMo dong={10} />
          </>
        }
      >
        <NoiDung />
      </Suspense>
    </div>
  );
}

const nghinTy = (trieu: number) => `${(trieu / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} nghìn tỷ`;
const ty = (trieu: number) => `${Math.round(trieu / 1000).toLocaleString("vi-VN")} tỷ`;
const pt = (x: number | null, dau = false) =>
  x == null ? "—" : `${dau && x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
const tang = (nay?: number, truoc?: number) => (nay != null && truoc ? (nay / truoc - 1) * 100 : null);
const cong = (ds: (number | undefined)[]) => ds.reduce<number>((s, v) => s + (v ?? 0), 0);

async function NoiDung() {
  await connection();
  const [nn, logo] = await Promise.all([layTongQuanNganhTC("chung-khoan"), layLogo().catch(() => ({}) as Record<string, string>)]);
  if (!nn || nn.quy.length === 0) return <p className="mt-6 text-chu-phu">Chưa tải được số liệu ngành chứng khoán.</p>;

  const q = nn.quy[nn.quy.length - 1];
  const tv = Object.entries(nn.thanhVien);
  const choVay = cong(tv.map(([, x]) => x.cuoi?.choVay));
  const choVayDauNam = cong(tv.map(([, x]) => x.cuoiNamTruoc?.choVay));
  const tuDoanh = cong(tv.map(([, x]) => x.cuoi?.dauTuNganHan));
  const tuDoanhDauNam = cong(tv.map(([, x]) => x.cuoiNamTruoc?.dauTuNganHan));
  const laiTuDoanh = (q.so.laiFVTPL ?? 0) - (q.so.loFVTPL ?? 0);
  const lnTtm = cong(tv.map(([, x]) => x.ttm?.lnst));
  const lnTtmTruoc = cong(tv.map(([, x]) => x.ttmNamTruoc?.lnst));

  const the = [
    { nhan: "Dư nợ cho vay ký quỹ", chinh: nghinTy(choVay), phu: `Từ đầu năm ${pt(tang(choVay, choVayDauNam), true)}` },
    { nhan: "Dư nợ / vốn chủ sở hữu", chinh: q.so.vonChu ? `${(q.so.choVay / q.so.vonChu).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} lần` : "—", phu: "Toàn ngành, giới hạn pháp lý 2 lần" },
    { nhan: "Danh mục tự doanh", chinh: nghinTy(tuDoanh), phu: `Từ đầu năm ${pt(tang(tuDoanh, tuDoanhDauNam), true)}` },
    { nhan: `Lãi tự doanh ròng quý ${q.q}/${q.nam}`, chinh: ty(laiTuDoanh), phu: `Lãi ${ty(q.so.laiFVTPL ?? 0)} · lỗ ${ty(q.so.loFVTPL ?? 0)}` },
    { nhan: `Doanh thu môi giới quý ${q.q}/${q.nam}`, chinh: ty(q.so.doanhThuMoiGioi ?? 0), phu: `Lãi cho vay: ${ty(q.so.laiChoVay ?? 0)}` },
    { nhan: "Lợi nhuận sau thuế 4 quý", chinh: nghinTy(lnTtm), phu: `So với cùng kỳ ${pt(tang(lnTtm, lnTtmTruoc), true)}` },
  ];

  const duongSoDu = [
    { ten: "Dư nợ cho vay (nghìn tỷ)", diem: nn.quy.map((x) => ({ time: x.ky, value: (x.so.choVay ?? 0) / 1e6 })) },
    { ten: "Danh mục tự doanh (nghìn tỷ)", diem: nn.quy.map((x) => ({ time: x.ky, value: (x.so.dauTuNganHan ?? 0) / 1e6 })) },
  ];
  const duongThuNhap = [
    { ten: "Lãi tự doanh ròng (tỷ)", diem: nn.quy.map((x) => ({ time: x.ky, value: ((x.so.laiFVTPL ?? 0) - (x.so.loFVTPL ?? 0)) / 1000 })) },
    { ten: "Lãi cho vay (tỷ)", diem: nn.quy.map((x) => ({ time: x.ky, value: (x.so.laiChoVay ?? 0) / 1000 })) },
    { ten: "Doanh thu môi giới (tỷ)", diem: nn.quy.map((x) => ({ time: x.ky, value: (x.so.doanhThuMoiGioi ?? 0) / 1000 })) },
  ];

  const dong: DongSoLieu[] = tv.map(([ma, x]) => ({
    ma,
    logo: logo[ma],
    so: {
      tongTaiSan: x.cuoi?.tongTaiSan ?? null,
      choVay: x.cuoi?.choVay ?? null,
      tangChoVay: tang(x.cuoi?.choVay, x.cuoiNamTruoc?.choVay),
      tuDoanh: x.cuoi?.dauTuNganHan ?? null,
      tangTuDoanh: tang(x.cuoi?.dauTuNganHan, x.cuoiNamTruoc?.dauTuNganHan),
      moiGioi: x.ttm?.doanhThuMoiGioi ?? null,
      lnst: x.ttm?.lnst ?? null,
      tangLn: tang(x.ttm?.lnst, x.ttmNamTruoc?.lnst),
    },
  }));

  return (
    <>
      <p className="mt-6 text-[13px] text-chu-phu">
        Số liệu đến quý {q.q}/{q.nam} · {tv.length} công ty chứng khoán niêm yết
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {the.map((t) => (
          <div key={t.nhan} className="rounded-2xl bg-nen-phu p-4">
            <p className="text-chu-phu">{t.nhan}</p>
            <p className="mt-1 text-[22px] font-bold tabular-nums">{t.chinh}</p>
            <p className="mt-0.5 text-[12px] text-chu-phu tabular-nums">{t.phu}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-vien p-4">
          <p className="mb-3 font-semibold">Cho vay ký quỹ và danh mục tự doanh</p>
          <BieuDoSo duong={duongSoDu} donVi="diem" cao={260} />
        </section>
        <section className="rounded-2xl border border-vien p-4">
          <p className="mb-3 font-semibold">Nguồn thu theo quý</p>
          <BieuDoSo duong={duongThuNhap} donVi="diem" cao={260} />
        </section>
      </div>

      <h2 className="mt-10 text-[22px] font-bold tracking-[-0.02em]">Từng công ty</h2>
      <p className="mt-1 mb-4 text-chu-phu">Số dư tỷ đồng tại quý gần nhất; doanh thu, lợi nhuận cộng 4 quý. Bấm tiêu đề cột để sắp xếp.</p>
      <BangSoLieu
        sapXepDau="choVay"
        dong={dong}
        cot={[
          { khoa: "tongTaiSan", nhan: "Tổng tài sản", kieu: "ty" },
          { khoa: "choVay", nhan: "Dư nợ cho vay", kieu: "ty", goiY: "Cho vay ký quỹ và ứng trước tiền bán" },
          { khoa: "tangChoVay", nhan: "Cho vay YTD", kieu: "pt-dau" },
          { khoa: "tuDoanh", nhan: "Danh mục tự doanh", kieu: "ty", goiY: "Tài sản tài chính ngắn hạn tự doanh" },
          { khoa: "tangTuDoanh", nhan: "Tự doanh YTD", kieu: "pt-dau" },
          { khoa: "moiGioi", nhan: "DT môi giới 4Q", kieu: "ty" },
          { khoa: "lnst", nhan: "LNST 4 quý", kieu: "ty" },
          { khoa: "tangLn", nhan: "Tăng LN", kieu: "pt-dau" },
        ]}
      />
      <p className="mt-3 text-[12px] text-chu-phu">
        Tự doanh ở đây là danh mục và kết quả đầu tư theo báo cáo tài chính quý (FVTPL). Giá trị mua/bán ròng của tự doanh từng phiên
        chưa có nguồn dữ liệu công khai nên chưa hiển thị.
      </p>
    </>
  );
}
