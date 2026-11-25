import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { mauTangGiam, phanTram } from "@/lib/dinh-dang";
import { DIEU_KIEN_DAU_CO, DIEU_KIEN_TICH_SAN, ketLuanFinlo, type MaKetLuanFinlo, type NhanDinh } from "@/lib/ket-luan";
import { layBangGia } from "@/lib/mofi";

export const metadata: Metadata = {
  title: "Kết luận Finlo — Tổng hợp mọi bộ phân tích",
  description: "Gộp Fin Rating, mô hình định giá, FL Bắt đáy, tín hiệu kỹ thuật, dòng tiền khối ngoại và khuyến nghị công ty chứng khoán thành hai danh sách chọn lọc: tích sản dài hạn và đầu cơ ngắn hạn, kèm lý do từng nguồn.",
};

const NGUON = [
  { ten: "Fin Rating", href: "/fin-rating", moTa: "Điểm 1 đến 10 theo 7 trục, chấm mỗi tuần" },
  { ten: "Định giá", href: "/xep-hang-dinh-gia", moTa: "Giá trị ước tính từ DCF, thu nhập thặng dư, bội số lịch sử" },
  { ten: "Cổ tức", href: "/co-phieu-co-tuc", moTa: "Tỷ suất và độ đều đặn 5 năm" },
  { ten: "FL Bắt đáy", href: "/bat-day", moTa: "Vùng rẻ theo P/B lịch sử và tín hiệu đáy, mỗi ngày" },
  { ten: "Tín hiệu kỹ thuật", href: "/quet-tin-hieu", moTa: "RSI, MACD, giao cắt MA, mẫu hình nến, mỗi ngày" },
  { ten: "Khối ngoại", href: "/dong-tien-ngoai", moTa: "Mua bán ròng 10 phiên và chuỗi phiên liên tiếp" },
  { ten: "Công ty chứng khoán", href: "/khuyen-nghi", moTa: "Khuyến nghị và giá mục tiêu 6 tháng gần nhất" },
];

export default function TrangKetLuan() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pt-8 pb-12">
      <div>
        <p className="nhan-muc">Tổng hợp mọi bộ phân tích của Finlo</p>
        <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Kết luận Finlo</h1>
        <p className="mt-2 max-w-3xl text-chu-phu">
          Finlo có nhiều công cụ, mỗi công cụ nhìn cổ phiếu từ một góc. Trang này gộp tất cả lại thành hai danh sách ngắn theo quy tắc cố định, và ghi rõ từng nguồn đang ủng hộ hay cảnh báo, để bạn thấy vì sao một mã được chọn.
        </p>
      </div>

      <p className="rounded-2xl border border-dung/40 bg-nen-phu px-4 py-3 text-[14px]">
        Đây là kết quả lọc tự động trên số liệu quá khứ, không phải khuyến nghị mua bán và không tính đến hoàn cảnh riêng của bạn. Mã được chọn vẫn có thể giảm giá. Hãy đọc phần cảnh báo của từng mã và tự kiểm tra trước khi quyết định.
      </p>

      <Suspense
        fallback={
          <div className="space-y-4">
            <LuoiMo so={4} cot="md:grid-cols-2" />
            <BangMo dong={6} />
          </div>
        }
      >
        <NoiDung />
      </Suspense>

      <section>
        <h2 className="text-xl font-bold tracking-[-0.03em]">Các nguồn được tổng hợp</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NGUON.map((n) => (
            <Link key={n.ten} href={n.href} className="rounded-2xl bg-nen-phu p-4 hover:bg-nen-noi">
              <p className="font-semibold">{n.ten}</p>
              <p className="mt-1 text-[13px] text-chu-phu">{n.moTa}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const so = (x: number, le = 2) => x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le });

async function NoiDung() {
  await connection();
  const bang = await layBangGia().catch(() => null);
  const gia = new Map((bang?.coPhieu ?? []).filter((c) => c.gia > 0).map((c) => [c.ma, c.gia]));
  const phanTramNgay = new Map((bang?.coPhieu ?? []).map((c) => [c.ma, c.phanTram]));
  const kq = ketLuanFinlo(gia);
  const [n, t, y] = kq.ngayNgay.split("-");

  return (
    <>
      <div className="flex flex-wrap gap-4 text-[13px]">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-tang" />Nguồn ủng hộ</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chu-phu/50" />Trung tính</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-giam" />Nguồn cảnh báo</span>
      </div>
      <p className="text-[13px] text-chu-phu">
        Fin Rating và định giá chấm ngày {ngayVN(kq.ngayFr)}; FL Bắt đáy, tín hiệu kỹ thuật và khối ngoại theo phiên {`${y}/${t}/${n}`}; giá theo bảng giá mới nhất.
      </p>
      <DanhSach
        id="tich-san"
        ten="Tích sản: nắm giữ dài hạn"
        moTa="Doanh nghiệp làm ăn tốt, tài chính lành mạnh, giá chưa đắt so với giá trị. Hợp với mua dần và giữ nhiều năm; biến động ngắn hạn ít quan trọng."
        dieuKien={DIEU_KIEN_TICH_SAN}
        ds={kq.tichSan}
        diem={(m) => m.diemTichSan}
        tenNganh={kq.tenNganh}
        phanTramNgay={phanTramNgay}
      />
      <DanhSach
        id="dau-co"
        ten="Đầu cơ: lướt sóng ngắn hạn"
        moTa="Mã đang có đà tăng hoặc tín hiệu đảo chiều, có dòng tiền vào, nền tảng không quá yếu. Hợp với giao dịch vài tuần đến vài tháng, cần đặt mức cắt lỗ."
        dieuKien={DIEU_KIEN_DAU_CO}
        ds={kq.dauCo}
        diem={(m) => m.diemDauCo}
        tenNganh={kq.tenNganh}
        phanTramNgay={phanTramNgay}
      />
    </>
  );
}

function DanhSach({
  id,
  ten,
  moTa,
  dieuKien,
  ds,
  diem,
  tenNganh,
  phanTramNgay,
}: {
  id: string;
  ten: string;
  moTa: string;
  dieuKien: string[];
  ds: MaKetLuanFinlo[];
  diem: (m: MaKetLuanFinlo) => number;
  tenNganh: Record<string, string>;
  phanTramNgay: Map<string, number>;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-2xl leading-tight font-bold tracking-[-0.03em]">{ten}</h2>
      <p className="mt-1 max-w-3xl text-chu-phu">{moTa}</p>
      <details className="mt-2 text-[13px] text-chu-phu">
        <summary className="cursor-pointer font-semibold text-chu">Điều kiện lọc</summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {dieuKien.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </details>

      {ds.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-nen-phu p-4 text-chu-phu">Hôm nay chưa có mã nào thoả hết điều kiện.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {ds.map((m, i) => (
              <a key={m.ma} href={`#${id}-${m.ma}`} className="rounded-full bg-nen-noi px-3 py-1 text-[13px] font-semibold hover:bg-vien">
                <span className="text-chu-phu tabular-nums">{i + 1}.</span> {m.ma}
              </a>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {ds.map((m, i) => (
              <TheMa key={m.ma} id={`${id}-${m.ma}`} m={m} hang={i + 1} diem={diem(m)} tenNganh={tenNganh} doiNgay={phanTramNgay.get(m.ma) ?? null} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const MAU: Record<NhanDinh["huong"], { cham: string; nhan: string }> = {
  tot: { cham: "bg-tang", nhan: "Ủng hộ" },
  xau: { cham: "bg-giam", nhan: "Cảnh báo" },
  trung: { cham: "bg-chu-phu/50", nhan: "Trung tính" },
};

function TheMa({ id, m, hang, diem, tenNganh, doiNgay }: { id: string; m: MaKetLuanFinlo; hang: number; diem: number; tenNganh: Record<string, string>; doiNgay: number | null }) {
  const ungHo = m.nhanDinh.filter((x) => x.huong === "tot");
  const canhBao = m.nhanDinh.filter((x) => x.huong === "xau");
  const thuTu = [...ungHo, ...m.nhanDinh.filter((x) => x.huong === "trung"), ...canhBao];
  const nguonUngHo = [...new Set(ungHo.map((x) => x.nguon))];
  return (
    <article id={id} className="scroll-mt-28 rounded-3xl border border-vien p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-chu-phu">
            Hạng {hang} · {m.nganh && tenNganh[m.nganh] ? `${tenNganh[m.nganh]} · ` : ""}{m.san}
          </p>
          <Link href={`/co-phieu/${m.ma}`} prefetch={false} className="mt-0.5 block text-2xl font-bold hover:text-nhan">
            {m.ma}
          </Link>
          <p className="truncate text-[13px] text-chu-phu" title={m.ten}>
            {m.ten}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold tabular-nums">{so(m.gia / 1000)}</p>
          {doiNgay != null && <p className={`text-[13px] tabular-nums ${mauTangGiam(doiNgay)}`}>{phanTram(doiNgay)}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-nen-phu px-2 py-2">
          <p className="text-[11px] text-chu-phu">Điểm danh sách</p>
          <p className="font-bold tabular-nums">{so(diem)}</p>
        </div>
        <div className="rounded-2xl bg-nen-phu px-2 py-2">
          <p className="text-[11px] text-chu-phu">Fin Rating</p>
          <p className="font-bold tabular-nums">{so(m.finRating)}</p>
        </div>
        <div className="rounded-2xl bg-nen-phu px-2 py-2">
          <p className="text-[11px] text-chu-phu">Nguồn ủng hộ / cảnh báo</p>
          <p className="font-bold tabular-nums">
            <span className="text-tang">{m.dongThuan.tot}</span> / <span className={m.dongThuan.xau ? "text-giam" : ""}>{m.dongThuan.xau}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 text-[14px]">
        <span className="font-semibold">Vì sao được chọn: </span>
        {nguonUngHo.length} nguồn cùng ủng hộ ({nguonUngHo.join(", ").toLowerCase()})
        {canhBao.length ? `, ${canhBao.length} nguồn cảnh báo cần lưu ý.` : ", không nguồn nào cảnh báo."}
      </p>

      <ul className="mt-3 space-y-2">
        {thuTu.map((x, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-snug">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${MAU[x.huong].cham}`} title={MAU[x.huong].nhan} />
            <span>
              {x.href ? (
                <Link href={x.href} prefetch={false} className="font-semibold hover:text-nhan">
                  {x.nguon}
                </Link>
              ) : (
                <span className="font-semibold">{x.nguon}</span>
              )}
              <span className="text-chu-phu">: {x.cau}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
