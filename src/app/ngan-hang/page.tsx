import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangSoLieu, type DongSoLieu } from "@/components/BangSoLieu";
import { BieuDoSo } from "@/components/BieuDoSo";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { layLogo, layNoNhom, layTongQuanNganhTC, type NoNhom } from "@/lib/mofi";

export const metadata: Metadata = {
  title: "Ngân hàng: huy động, cho vay, nợ xấu",
  description: "Tín dụng, huy động, tỷ lệ cho vay/huy động, nợ xấu theo nhóm và lợi nhuận của các ngân hàng niêm yết.",
};

export default function TrangNganHang() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Thị trường · Ngành</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Ngân hàng</h1>
      <p className="mt-2 text-chu-phu">Huy động, cho vay và chất lượng nợ của các ngân hàng niêm yết, tổng hợp từ báo cáo tài chính quý.</p>
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
const pt = (x: number | null, dau = false) =>
  x == null ? "—" : `${dau && x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
const tang = (nay?: number, truoc?: number) => (nay != null && truoc ? (nay / truoc - 1) * 100 : null);
const cong = (ds: (number | undefined)[]) => ds.reduce<number>((s, v) => s + (v ?? 0), 0);

// Nợ theo nhóm của một ngân hàng tại kỳ gần nhất không muộn hơn kỳ cho trước
function noTaiKy(theoKy: Record<string, NoNhom> | undefined, ky: string) {
  if (!theoKy) return null;
  const k = Object.keys(theoKy)
    .filter((x) => x <= ky)
    .sort()
    .at(-1);
  return k ? theoKy[k] : null;
}

async function NoiDung() {
  await connection();
  const [nn, noNhom, logo] = await Promise.all([layTongQuanNganhTC("ngan-hang"), layNoNhom(), layLogo().catch(() => ({}) as Record<string, string>)]);
  if (!nn || nn.quy.length === 0) return <p className="mt-6 text-chu-phu">Chưa tải được số liệu ngành ngân hàng.</p>;

  const quyCuoi = nn.quy[nn.quy.length - 1];
  const tv = Object.entries(nn.thanhVien);
  const choVay = cong(tv.map(([, x]) => x.cuoi?.choVayKhachHang));
  const choVayDauNam = cong(tv.map(([, x]) => x.cuoiNamTruoc?.choVayKhachHang));
  const tienGui = cong(tv.map(([, x]) => x.cuoi?.tienGuiKhachHang));
  const tienGuiDauNam = cong(tv.map(([, x]) => x.cuoiNamTruoc?.tienGuiKhachHang));
  const lnTtm = cong(tv.map(([, x]) => x.ttm?.lnst));
  const lnTtmTruoc = cong(tv.map(([, x]) => x.ttmNamTruoc?.lnst));

  // Nợ xấu toàn ngành tại quý gần nhất (gộp các ngân hàng có thuyết minh)
  const noCuoi = Object.values(noNhom)
    .map((k) => noTaiKy(k, quyCuoi.ky))
    .filter((x): x is NoNhom => !!x);
  const tongNo = cong(noCuoi.map((x) => x.tong));
  const noXau = cong(noCuoi.map((x) => x.nhom3 + x.nhom4 + x.nhom5));
  const nhom2 = cong(noCuoi.map((x) => x.nhom2));
  const duPhong = Math.abs(quyCuoi.so.duPhongChoVay ?? 0);

  const the = [
    { nhan: "Dư nợ cho vay khách hàng", chinh: nghinTy(choVay), phu: `Từ đầu năm ${pt(tang(choVay, choVayDauNam), true)}` },
    { nhan: "Huy động (tiền gửi khách hàng)", chinh: nghinTy(tienGui), phu: `Từ đầu năm ${pt(tang(tienGui, tienGuiDauNam), true)}` },
    { nhan: "Cho vay / huy động", chinh: pt((choVay / tienGui) * 100), phu: "Dư nợ khách hàng / tiền gửi khách hàng" },
    { nhan: "Nợ xấu (nhóm 3–5)", chinh: pt(tongNo ? (noXau / tongNo) * 100 : null), phu: `Nợ nhóm 2: ${pt(tongNo ? (nhom2 / tongNo) * 100 : null)}` },
    { nhan: "Bao phủ nợ xấu", chinh: pt(noXau ? (duPhong / noXau) * 100 : null), phu: "Dự phòng cho vay / nợ xấu" },
    { nhan: "Lợi nhuận sau thuế 4 quý", chinh: nghinTy(lnTtm), phu: `So với cùng kỳ ${pt(tang(lnTtm, lnTtmTruoc), true)}` },
  ];

  // Chuỗi theo quý toàn ngành
  const duongTinDung = [
    { ten: "Cho vay khách hàng (nghìn tỷ)", diem: nn.quy.map((q) => ({ time: q.ky, value: (q.so.choVayKhachHang ?? 0) / 1e6 })) },
    { ten: "Tiền gửi khách hàng (nghìn tỷ)", diem: nn.quy.map((q) => ({ time: q.ky, value: (q.so.tienGuiKhachHang ?? 0) / 1e6 })) },
  ];
  const cacKy = [...new Set(Object.values(noNhom).flatMap((k) => Object.keys(k)))].filter((k) => k >= nn.quy[0].ky).sort();
  const duongNoXau = [
    {
      ten: "Nợ xấu nhóm 3–5 (%)",
      diem: cacKy.flatMap((ky) => {
        const ds = Object.values(noNhom).map((k) => k[ky]).filter((x): x is NoNhom => !!x);
        if (ds.length < 15) return [];
        const t = cong(ds.map((x) => x.tong));
        return t ? [{ time: ky, value: (cong(ds.map((x) => x.nhom3 + x.nhom4 + x.nhom5)) / t) * 100 }] : [];
      }),
    },
    {
      ten: "Nợ nhóm 2 (%)",
      diem: cacKy.flatMap((ky) => {
        const ds = Object.values(noNhom).map((k) => k[ky]).filter((x): x is NoNhom => !!x);
        if (ds.length < 15) return [];
        const t = cong(ds.map((x) => x.tong));
        return t ? [{ time: ky, value: (cong(ds.map((x) => x.nhom2)) / t) * 100 }] : [];
      }),
    },
  ];

  const dong: DongSoLieu[] = tv.map(([ma, x]) => {
    const no = noTaiKy(noNhom[ma], quyCuoi.ky);
    return {
      ma,
      logo: logo[ma],
      so: {
        tongTaiSan: x.cuoi?.tongTaiSan ?? null,
        choVay: x.cuoi?.choVayKhachHang ?? null,
        tienGui: x.cuoi?.tienGuiKhachHang ?? null,
        tinDung: tang(x.cuoi?.choVayKhachHang, x.cuoiNamTruoc?.choVayKhachHang),
        huyDong: tang(x.cuoi?.tienGuiKhachHang, x.cuoiNamTruoc?.tienGuiKhachHang),
        ldr: x.cuoi?.tienGuiKhachHang ? (x.cuoi?.choVayKhachHang / x.cuoi?.tienGuiKhachHang) * 100 : null,
        noXau: no?.tong ? ((no.nhom3 + no.nhom4 + no.nhom5) / no.tong) * 100 : null,
        nhom2: no?.tong ? (no.nhom2 / no.tong) * 100 : null,
        lnst: x.ttm?.lnst ?? null,
        tangLn: tang(x.ttm?.lnst, x.ttmNamTruoc?.lnst),
      },
    };
  });

  return (
    <>
      <p className="mt-6 text-[13px] text-chu-phu">
        Số liệu đến quý {quyCuoi.q}/{quyCuoi.nam} · {tv.length} ngân hàng · tỷ lệ nợ xấu từ {noCuoi.length} ngân hàng có thuyết minh nhóm nợ
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
          <p className="mb-3 font-semibold">Tín dụng và huy động toàn ngành</p>
          <BieuDoSo duong={duongTinDung} donVi="diem" cao={260} />
        </section>
        <section className="rounded-2xl border border-vien p-4">
          <p className="mb-3 font-semibold">Chất lượng nợ toàn ngành</p>
          <BieuDoSo duong={duongNoXau} donVi="%" cao={260} />
        </section>
      </div>

      <h2 className="mt-10 text-[22px] font-bold tracking-[-0.02em]">Từng ngân hàng</h2>
      <p className="mt-1 mb-4 text-chu-phu">Số dư tỷ đồng tại quý gần nhất; tăng trưởng tính từ đầu năm. Bấm tiêu đề cột để sắp xếp.</p>
      <BangSoLieu
        sapXepDau="tongTaiSan"
        dong={dong}
        cot={[
          { khoa: "tongTaiSan", nhan: "Tổng tài sản", kieu: "ty" },
          { khoa: "choVay", nhan: "Cho vay KH", kieu: "ty" },
          { khoa: "tienGui", nhan: "Tiền gửi KH", kieu: "ty" },
          { khoa: "tinDung", nhan: "Tín dụng YTD", kieu: "pt-dau", goiY: "Tăng dư nợ cho vay từ đầu năm" },
          { khoa: "huyDong", nhan: "Huy động YTD", kieu: "pt-dau", goiY: "Tăng tiền gửi khách hàng từ đầu năm" },
          { khoa: "ldr", nhan: "Cho vay/Huy động", kieu: "pt" },
          { khoa: "noXau", nhan: "Nợ xấu", kieu: "pt", goiY: "Nợ nhóm 3–5 / tổng dư nợ" },
          { khoa: "nhom2", nhan: "Nhóm 2", kieu: "pt", goiY: "Nợ cần chú ý / tổng dư nợ" },
          { khoa: "lnst", nhan: "LNST 4 quý", kieu: "ty" },
          { khoa: "tangLn", nhan: "Tăng LN", kieu: "pt-dau", goiY: "4 quý gần nhất so với cùng kỳ" },
        ]}
      />
      <p className="mt-3 text-[12px] text-chu-phu">
        Nguồn: báo cáo tài chính hợp nhất các ngân hàng, Mofi chuẩn hoá. Tiền gửi khách hàng là huy động từ dân cư và tổ chức kinh tế,
        chưa gồm giấy tờ có giá.
      </p>
    </>
  );
}
