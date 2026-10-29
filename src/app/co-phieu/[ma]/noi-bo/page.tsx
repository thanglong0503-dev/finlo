import type { Metadata } from "next";
import { Suspense } from "react";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { NoiBoClient } from "@/components/NoiBoClient";
import { soNguyen, tyDong } from "@/lib/dinh-dang";
import { layNoiBo } from "@/lib/mofi";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]/noi-bo">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — Giao dịch nội bộ` };
}

export default function TrangNoiBo({ params }: PageProps<"/co-phieu/[ma]/noi-bo">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <Suspense
        fallback={
          <>
            <LuoiMo so={4} />
            <BangMo dong={10} />
          </>
        }
      >
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const nb = await layNoiBo(ma);
  if (!nb || nb.dong.length === 0)
    return <p className="text-chu-phu">Chưa ghi nhận giao dịch của người nội bộ hoặc cổ đông lớn tại {ma}.</p>;

  // Tổng hợp 12 tháng tính đến lần cập nhật dữ liệu, chỉ tính giao dịch đã thực hiện xong
  const truocNgay = (ngay: number) => new Date(Date.parse(nb.capNhat) - ngay * 864e5).toISOString().slice(0, 10);
  const moc = truocNgay(365);
  const namQua = nb.dong.filter((d) => d.daXong && d.ngay >= moc);
  const mua = namQua.filter((d) => d.mua);
  const ban = namQua.filter((d) => !d.mua);
  const cong = (ds: typeof namQua, f: (d: (typeof namQua)[number]) => number | null) =>
    ds.reduce((s, d) => s + (f(d) ?? 0), 0);
  const rongCp = cong(mua, (d) => d.soCp) - cong(ban, (d) => d.soCp);
  const rongGt = cong(mua, (d) => d.giaTri) - cong(ban, (d) => d.giaTri);
  const dangKy = nb.dong.filter((d) => !d.daXong && d.ngay >= truocNgay(60));

  const the = [
    {
      nhan: "Giao dịch mua",
      chinh: `${mua.length} lần`,
      phu: `${soNguyen(cong(mua, (d) => d.soCp))} cp · ${tyDong(cong(mua, (d) => d.giaTri))}`,
      mau: "text-tang",
    },
    {
      nhan: "Giao dịch bán",
      chinh: `${ban.length} lần`,
      phu: `${soNguyen(cong(ban, (d) => d.soCp))} cp · ${tyDong(cong(ban, (d) => d.giaTri))}`,
      mau: "text-giam",
    },
    {
      nhan: rongCp >= 0 ? "Mua ròng" : "Bán ròng",
      chinh: `${soNguyen(Math.abs(rongCp))} cp`,
      phu: `Ước tính ${rongGt >= 0 ? "+" : "−"}${tyDong(Math.abs(rongGt))}`,
      mau: namQua.length === 0 ? "" : rongCp >= 0 ? "text-tang" : "text-giam",
    },
    {
      nhan: "Đăng ký gần đây",
      chinh: `${dangKy.length} lệnh`,
      phu: dangKy.length
        ? `${dangKy.filter((d) => d.mua).length} mua · ${dangKy.filter((d) => !d.mua).length} bán, 60 ngày qua`
        : "Không có trong 60 ngày qua",
      mau: "",
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="nhan-muc">12 tháng gần nhất</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">Người nội bộ và cổ đông lớn</h2>
        </div>
        <p className="text-[12px] text-chu-phu">
          {nb.dong.length} giao dịch từ {nb.dong[nb.dong.length - 1].ngay.split("-").reverse().join("/")}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-px border border-vien bg-vien lg:grid-cols-4 rounded-2xl overflow-hidden">
        {the.map((t) => (
          <div key={t.nhan} className="bg-nen p-4">
            <p className="text-chu-phu">{t.nhan}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${t.mau}`}>{t.chinh}</p>
            <p className="mt-0.5 text-[12px] text-chu-phu tabular-nums">{t.phu}</p>
          </div>
        ))}
      </div>

      <NoiBoClient dong={nb.dong} />

      {nb.ghiChu && <p className="mt-4 text-[11px] text-chu-phu">{nb.ghiChu}</p>}
    </>
  );
}
