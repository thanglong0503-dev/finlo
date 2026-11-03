import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BieuDoBatDay, TraMaBatDay, type MocVe, type VachVe } from "@/components/bat-day/ChungBatDay";
import { DanhSachKiem, KhongKhuyenNghi, KiemChung } from "@/components/bat-day/NoiDungChung";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { KET_LUAN, ketLuanDay, moPhongBatDay } from "@/lib/bat-day";
import { giaNghin, mauTangGiam, phanTram } from "@/lib/dinh-dang";
import { layBaoCao, layHoSo, layNen, layTaiChinhToanThiTruong } from "@/lib/mofi";
import { giaTriDay } from "@/lib/quet-bat-day";
import { mocDinhGia } from "@/lib/tai-chinh";

export async function generateMetadata({ params }: PageProps<"/bat-day/[ma]">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} bắt đáy được chưa? · FL Bắt đáy`, description: `Trạng thái của ${ma.toUpperCase()} theo quy tắc FL Bắt đáy. Không phải khuyến nghị đầu tư.` };
}

export default function TrangBatDayMa({ params }: PageProps<"/bat-day/[ma]">) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-8 pb-12">
      <Link href="/bat-day" className="text-[12px] text-chu-phu hover:text-nhan">
        ← Danh sách FL Bắt đáy
      </Link>
      <Suspense
        fallback={
          <div className="space-y-4">
            <LuoiMo so={3} cot="md:grid-cols-3" />
            <BangMo dong={8} />
          </div>
        }
      >
        <NoiDung params={params} />
      </Suspense>
      <KiemChung />
    </div>
  );
}

const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const LY_DO: Record<string, string> = { "cat-lo": "Cắt lỗ", "hoa-von": "Về giá vốn", "chot-loi": "Chốt lời", "het-gio": "Hết thời gian", "dang-mo": "Đang mở" };

function MucGia({ ten, gia, phu }: { ten: string; gia: number | null; phu?: string }) {
  return (
    <div className="bg-nen p-4">
      <p className="text-[12px] text-chu-phu">{ten}</p>
      <p className="so mt-1 text-xl font-bold">{gia == null ? "—" : giaNghin(gia)}</p>
      {phu && <p className="mt-0.5 text-[11px] text-chu-phu">{phu}</p>}
    </div>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  await connection();
  const ma = (await params).ma.toUpperCase();
  const [nen, bc, hoSo, tc] = await Promise.all([layNen(ma).catch(() => []), layBaoCao(ma).catch(() => null), layHoSo(ma).catch(() => null), layTaiChinhToanThiTruong().catch(() => null)]);
  const kt = moPhongBatDay(nen);
  if (!kt) return <p className="text-chu-phu">{ma} không có hoặc chưa đủ lịch sử giá để đánh giá (cần khoảng 6 tháng).</p>;

  const gt = bc && hoSo?.soCoPhieu ? giaTriDay(nen, mocDinhGia(bc, hoSo.soCoPhieu), tc?.[ma]?.lnst ?? null) : null;
  const kl = ketLuanDay(kt, gt);
  const kq = KET_LUAN[kl.ma];
  const tangDoc = (x: number) => ((x / kt.gia - 1) * 100);
  const thanhKhoanThap = kt.giaTriTb20 < 2e9;

  const nenVe = nen.slice(-250).map(({ time, open, high, low, close }) => ({ time, open: open / 1000, high: high / 1000, low: low / 1000, close: close / 1000 }));
  const dauVe = nenVe[0].time;
  const moc: MocVe[] = kt.lenh
    .flatMap((l): MocVe[] => [{ time: l.tinHieu, loai: "mua", nhan: "Mua" }, ...(l.ngayBan != null ? [{ time: l.ngayBan, loai: "ban" as const, nhan: LY_DO[l.lyDo] }] : [])])
    .filter((m) => m.time >= dauVe)
    .sort((a, b) => a.time - b.time);
  const vach: VachVe[] = [];
  if (kt.catLo != null) vach.push({ gia: kt.catLo / 1000, ten: "Cắt lỗ", mau: "--giam" });
  if (gt?.giaRe) vach.push({ gia: gt.giaRe / 1000, ten: "P/B rẻ", mau: "--tang" });
  if (gt?.giaThuongGap) vach.push({ gia: gt.giaThuongGap / 1000, ten: "P/B thường gặp", mau: "--dung" });
  const lichSu = [...kt.lenh].reverse().slice(0, 10);
  const daDong = kt.lenh.filter((l) => l.lai != null);
  const thang = daDong.filter((l) => l.lai! > 0).length;

  return (
    <>
      <section className="grid gap-6 rounded-3xl bg-nen-phu p-6 lg:grid-cols-[1fr_auto] lg:p-8">
        <div>
          <p className="text-chu-phu">
            <Link href={`/co-phieu/${ma}`} className="font-semibold text-chu hover:text-nhan">
              {ma}
            </Link>{" "}
            bắt đáy được chưa? Giá <span className="so font-semibold text-chu">{giaNghin(kt.gia)}</span>, cách đỉnh 1 năm <span className="so text-giam">{phanTram(kt.giam * 100)}</span>
          </p>
          <h1 className={`mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl ${kq.mau}`}>{kq.nhan}</h1>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed">{kq.cau}</p>
          {kt.canhBaoBan && <p className="mt-2 font-semibold text-giam">Phiên gần nhất vừa chạm điều kiện bán: {LY_DO[kt.canhBaoBan]}.</p>}
          {kt.hoi != null && kt.hoi <= 0.03 && (kt.phienTuDay ?? 0) >= 3 && (
            <p className="mt-2 text-dung">
              Giá chỉ cách đáy 120 phiên <span className="so">{phanTram(kt.hoi * 100)}</span>. Nếu thủng đáy này, mã sẽ chuyển sang trạng thái đang rơi.
            </p>
          )}
          {thanhKhoanThap && <p className="mt-2 text-giam">Thanh khoản dưới 2 tỷ đồng/phiên nên mã này không nằm trong danh sách quét và kết quả kiểm chứng.</p>}
          <p className="mt-3 text-[12px] text-chu-phu">
            Điểm FL Bắt đáy <span className="so font-semibold text-chu">{kl.diem}/100</span>, chỉ để xếp thứ tự, không phải xác suất tăng giá.
          </p>
        </div>
        <div className="lg:w-72">
          <p className="mb-2 font-semibold">Tra mã khác</p>
          <TraMaBatDay maHienTai={ma} />
        </div>
      </section>

      <KhongKhuyenNghi />

      <div className="grid gap-px overflow-hidden rounded-2xl border border-vien bg-vien sm:grid-cols-2 lg:grid-cols-4">
        <MucGia ten="Giá hiện tại" gia={kt.gia} phu={kt.day != null ? `Đáy 120 phiên ${giaNghin(kt.day)}${kt.phienTuDay != null ? `, cách ${kt.phienTuDay} phiên` : ""}` : undefined} />
        <MucGia ten="Mức cắt lỗ theo quy tắc" gia={kt.catLo} phu={kt.catLo != null ? `${phanTram(tangDoc(kt.catLo))} so với giá hiện tại${kt.lenhMo ? ", theo lệnh đang mở" : ", dưới đáy 0,5 ATR"}` : undefined} />
        <MucGia ten="Giá ứng với P/B rẻ (25%)" gia={gt?.giaRe ?? null} phu={gt?.giaRe ? `${phanTram(tangDoc(gt.giaRe))} so với giá hiện tại` : "Chưa đủ dữ liệu"} />
        <MucGia ten="Giá ứng với P/B thường gặp" gia={gt?.giaThuongGap ?? null} phu={gt?.giaThuongGap ? `${phanTram(tangDoc(gt.giaThuongGap))} so với giá hiện tại, không phải giá mục tiêu` : "Chưa đủ dữ liệu"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DanhSachKiem tieuDe="Bước 1: Có rẻ không?" ds={kl.giaTri} />
        <DanhSachKiem tieuDe="Bước 2: Đã dừng giảm chưa?" ds={kl.thoiDiem} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-vien">
        <h2 className="border-b border-vien px-4 py-2.5 font-semibold">
          Biểu đồ 1 năm
          <span className="ml-2 text-[12px] font-normal text-chu-phu">mũi tên là tín hiệu kỹ thuật theo quy tắc, không xét bước 1</span>
        </h2>
        <div className="p-3">
          <BieuDoBatDay nen={nenVe} moc={moc} vach={vach} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-vien">
        <h2 className="border-b border-vien px-4 py-2.5 font-semibold">
          Tín hiệu kỹ thuật trước đây của {ma}
          {daDong.length > 0 && (
            <span className="ml-2 text-[12px] font-normal text-chu-phu">
              {thang}/{daDong.length} lệnh giả định có lãi, quá ít để kết luận về riêng mã này
            </span>
          )}
        </h2>
        {lichSu.length === 0 ? (
          <p className="px-4 py-6 text-chu-phu">Chưa từng có tín hiệu mua kỹ thuật theo quy tắc.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-vien text-left text-[12px] text-chu-phu">
                  <th className="px-4 py-2 font-medium">Ngày tín hiệu</th>
                  <th className="px-3 py-2 text-right font-medium">Giá mua</th>
                  <th className="px-3 py-2 text-right font-medium">Cắt lỗ ban đầu</th>
                  <th className="px-3 py-2 font-medium">Kết thúc</th>
                  <th className="px-3 py-2 text-right font-medium">Giá bán</th>
                  <th className="px-4 py-2 text-right font-medium">Sau phí</th>
                </tr>
              </thead>
              <tbody>
                {lichSu.map((l) => (
                  <tr key={l.iTin} className="border-b border-vien last:border-b-0">
                    <td className="so px-4 py-1.5">{ngayVN(l.tinHieu)}</td>
                    <td className="so px-3 py-1.5 text-right">{giaNghin(l.giaMua)}</td>
                    <td className="so px-3 py-1.5 text-right">{giaNghin(l.catLo)}</td>
                    <td className="px-3 py-1.5">{LY_DO[l.lyDo]}</td>
                    <td className="so px-3 py-1.5 text-right">{l.giaBan == null ? "—" : giaNghin(l.giaBan)}</td>
                    <td className={`so px-4 py-1.5 text-right ${mauTangGiam(l.lai ?? 0)}`}>{l.lai == null ? "—" : phanTram(l.lai)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
