import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TraMaBatDay } from "@/components/bat-day/ChungBatDay";
import { KhongKhuyenNghi, KiemChung } from "@/components/bat-day/NoiDungChung";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { KET_LUAN, type MaKetLuan } from "@/lib/bat-day";
import { sma } from "@/lib/chi-bao";
import { diem, giaNghin, mauTangGiam, phanTram } from "@/lib/dinh-dang";
import { layNenChiSo } from "@/lib/mofi";
import { quetBatDay, type TinBan } from "@/lib/quet-bat-day";

export const metadata: Metadata = {
  title: "FL Bắt đáy",
  description: "Tổng hợp cổ phiếu đã giảm sâu, rẻ so với lịch sử và đang có lãi, kèm tín hiệu mua bán kỹ thuật và mức cắt lỗ. Không phải khuyến nghị đầu tư.",
};

export default function TrangBatDay({ searchParams }: PageProps<"/bat-day">) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-8 pb-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="nhan-muc">Phân tích kỹ thuật và định giá</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">FL Bắt đáy</h1>
          <p className="mt-2 max-w-3xl text-chu-phu">
            Mỗi giờ Finlo lọc các mã giảm từ 20% so với đỉnh 1 năm, có P/B thuộc nhóm rẻ nhất 25% lịch sử của chính mã và đang có lãi, rồi xem giá đang rơi, đang giữ đáy hay đã bật lên.
          </p>
        </div>
        <div>
          <p className="mb-2 font-semibold">Mã này bắt đáy được chưa?</p>
          <TraMaBatDay />
        </div>
      </div>
      <KhongKhuyenNghi />
      <Suspense
        fallback={
          <div className="space-y-4">
            <LuoiMo so={6} />
            <BangMo dong={10} />
          </div>
        }
      >
        <NoiDung searchParams={searchParams} />
      </Suspense>
      <KiemChung />
    </div>
  );
}

const NHOM: { k: MaKetLuan; moTa: string }[] = [
  { k: "xac-nhan", moTa: "Vừa vượt đỉnh ngắn hạn" },
  { k: "dang-giu", moTa: "Tín hiệu trước đó còn hiệu lực" },
  { k: "giu-day", moTa: "Không thủng đáy từ 3 phiên" },
  { k: "dang-roi", moTa: "Vừa tạo đáy mới" },
  { k: "da-hoi", moTa: "Hồi hơn 18% từ đáy" },
  { k: "cho-tin-hieu", moTa: "Chưa rõ đáy kỹ thuật" },
];
const LY_DO: Record<string, { ten: string; mau: string }> = {
  "cat-lo": { ten: "Cắt lỗ", mau: "text-giam" },
  "hoa-von": { ten: "Về giá vốn", mau: "text-dung" },
  "chot-loi": { ten: "Chốt lời", mau: "text-tang" },
  "het-gio": { ten: "Hết thời gian", mau: "text-chu-phu" },
};
const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

// Bối cảnh chung: bắt đáy khi cả thị trường đang giảm khó hơn nhiều so với khi một mã giảm riêng lẻ
async function BoiCanh() {
  const nen = (await layNenChiSo("VNINDEX").catch(() => null))?.nen;
  if (!nen || nen.length < 200) return null;
  const dong = nen.map((x) => x.close);
  const i = dong.length - 1;
  const tren50 = dong[i] > (sma(dong, 50)[i] ?? 0);
  const tren200 = dong[i] > (sma(dong, 200)[i] ?? 0);
  const dinh = Math.max(...nen.slice(-252).map((x) => x.high));
  const giam = (dong[i] / dinh - 1) * 100;
  const cau = tren50 && tren200 ? "VN-Index nằm trên MA50 và MA200." : !tren50 && !tren200 ? "VN-Index nằm dưới cả MA50 và MA200, xu hướng chung đang yếu." : tren200 ? "VN-Index dưới MA50 nhưng còn trên MA200." : "VN-Index trên MA50 nhưng còn dưới MA200.";
  return (
    <p className="rounded-2xl bg-nen-phu px-4 py-3">
      <b>Bối cảnh:</b> VN-Index <span className="so font-semibold">{diem(dong[i] / 1000)}</span>, cách đỉnh 1 năm <span className={`so ${mauTangGiam(giam)}`}>{phanTram(giam)}</span>. {cau}
    </p>
  );
}

async function NoiDung({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const kq = await quetBatDay().catch(() => null);
  if (!kq) return <p className="text-chu-phu">Chưa quét được dữ liệu, vui lòng thử lại sau.</p>;

  const vungRe = kq.ds.filter((d) => KET_LUAN[d.ketLuan].vungRe);
  const chon = NHOM.find((n) => n.k === sp.nhom)?.k ?? null;
  const ds = chon ? vungRe.filter((d) => d.ketLuan === chon) : vungRe;
  const dem = (k: MaKetLuan) => vungRe.filter((d) => d.ketLuan === k).length;

  return (
    <>
      <BoiCanh />
      <p className="text-[12px] text-chu-phu">
        Dữ liệu đến phiên {ngayVN(kq.ngay)} · <span className="so">{kq.soMa}</span> mã đủ thanh khoản được quét · <span className="so">{kq.ds.length}</span> mã giảm từ 20% · <span className="so">{vungRe.length}</span> mã đủ điều kiện vùng rẻ
      </p>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vien bg-vien sm:grid-cols-3 lg:grid-cols-7">
        <Link href="/bat-day" scroll={false} className={`p-3 ${chon == null ? "bg-nhan-nhat" : "bg-nen hover:bg-nen-phu"}`}>
          <p className="text-[12px] font-medium">Tất cả vùng rẻ</p>
          <p className="so mt-0.5 text-xl font-bold">{vungRe.length}</p>
          <p className="text-[11px] text-chu-phu">Đủ 3 điều kiện giá trị</p>
        </Link>
        {NHOM.map((n) => (
          <Link key={n.k} href={`/bat-day?nhom=${n.k}`} scroll={false} className={`p-3 ${chon === n.k ? "bg-nhan-nhat" : "bg-nen hover:bg-nen-phu"}`}>
            <p className={`text-[12px] font-medium ${KET_LUAN[n.k].mau}`}>{KET_LUAN[n.k].nhan}</p>
            <p className="so mt-0.5 text-xl font-bold">{dem(n.k)}</p>
            <p className="text-[11px] text-chu-phu">{n.moTa}</p>
          </Link>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-vien">
        <h2 className="border-b border-vien px-4 py-2.5 font-semibold">
          {chon ? KET_LUAN[chon].nhan : "Mã đủ điều kiện vùng rẻ"}
          <span className="ml-2 text-[12px] font-normal text-chu-phu">xếp theo điểm FL Bắt đáy, bấm vào mã để xem chi tiết</span>
        </h2>
        {ds.length === 0 ? (
          <p className="px-4 py-6 text-chu-phu">Hiện không có mã nào ở nhóm này.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-vien text-left text-[12px] text-chu-phu">
                  <th className="px-4 py-2 font-medium">Mã</th>
                  <th className="px-3 py-2 text-right font-medium">Giá</th>
                  <th className="px-3 py-2 text-right font-medium">Hôm nay</th>
                  <th className="px-3 py-2 text-right font-medium">Từ đỉnh 1 năm</th>
                  <th className="px-3 py-2 text-right font-medium">P/B so lịch sử</th>
                  <th className="px-3 py-2 font-medium">Trạng thái</th>
                  <th className="px-3 py-2 text-right font-medium">Mức cắt lỗ</th>
                  <th className="px-3 py-2 text-right font-medium">Giá P/B thường gặp</th>
                  <th className="px-4 py-2 text-right font-medium">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {ds.map((d) => (
                  <tr key={d.ma} className="border-b border-vien last:border-b-0 hover:bg-nen-phu">
                    <td className="px-4 py-2">
                      <Link prefetch={false} href={`/bat-day/${d.ma}`} className="font-semibold hover:text-nhan">
                        {d.ma}
                      </Link>
                      <span className="block max-w-[200px] truncate text-[11px] text-chu-phu">{d.ten}</span>
                    </td>
                    <td className="so px-3 py-2 text-right">{giaNghin(d.gia)}</td>
                    <td className={`so px-3 py-2 text-right ${mauTangGiam(d.phanTram)}`}>{phanTram(d.phanTram)}</td>
                    <td className="so px-3 py-2 text-right text-giam">{phanTram(d.giam * 100)}</td>
                    <td className="so px-3 py-2 text-right">{d.pbDiem == null ? "—" : `${Math.round(d.pbDiem)}%`}</td>
                    <td className={`px-3 py-2 font-medium whitespace-nowrap ${KET_LUAN[d.ketLuan].mau}`}>{KET_LUAN[d.ketLuan].nhan}</td>
                    <td className="so px-3 py-2 text-right">
                      {d.catLo == null ? "—" : giaNghin(d.catLo)}
                      {d.ruiRo != null && <span className="block text-[11px] text-chu-phu">{phanTram(-d.ruiRo * 100)}</span>}
                    </td>
                    <td className="so px-3 py-2 text-right">{d.giaThuongGap == null ? "—" : giaNghin(d.giaThuongGap)}</td>
                    <td className="so px-4 py-2 text-right font-semibold">{d.diem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-vien px-4 py-2 text-[12px] text-chu-phu">
          P/B so lịch sử 10% nghĩa là P/B hôm nay chỉ cao hơn 10% số phiên trong lịch sử của mã. Giá P/B thường gặp chỉ là mức tham khảo, không phải giá mục tiêu.
        </p>
      </section>

      <BangBan ds={kq.tinBan} />
    </>
  );
}

function BangBan({ ds }: { ds: TinBan[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-vien">
      <h2 className="border-b border-vien px-4 py-2.5 font-semibold">
        Tín hiệu bán gần đây
        <span className="ml-2 text-[12px] font-normal text-chu-phu">các lệnh giả định theo tín hiệu kỹ thuật chạm điều kiện bán trong 5 phiên, gồm cả mã ngoài vùng rẻ</span>
      </h2>
      {ds.length === 0 ? (
        <p className="px-4 py-6 text-chu-phu">Không có tín hiệu bán nào trong 5 phiên gần nhất.</p>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="border-b border-vien text-left text-[12px] text-chu-phu">
                <th className="px-4 py-2 font-medium">Mã</th>
                <th className="px-3 py-2 font-medium">Lý do</th>
                <th className="px-3 py-2 font-medium">Ngày</th>
                <th className="px-3 py-2 text-right font-medium">Giá mua giả định</th>
                <th className="px-4 py-2 text-right font-medium">Lãi/lỗ sau phí</th>
              </tr>
            </thead>
            <tbody>
              {ds.map((b) => (
                <tr key={`${b.ma}${b.ngay}`} className="border-b border-vien last:border-b-0 hover:bg-nen-phu">
                  <td className="px-4 py-1.5">
                    <Link prefetch={false} href={`/bat-day/${b.ma}`} className="font-semibold hover:text-nhan">
                      {b.ma}
                    </Link>
                  </td>
                  <td className={`px-3 py-1.5 font-medium ${LY_DO[b.lyDo]?.mau ?? ""}`}>
                    {LY_DO[b.lyDo]?.ten ?? b.lyDo}
                    {!b.daXay && <span className="ml-1 text-[11px] font-normal text-chu-phu">phiên kế tiếp</span>}
                  </td>
                  <td className="so px-3 py-1.5">{ngayVN(b.ngay)}</td>
                  <td className="so px-3 py-1.5 text-right">{giaNghin(b.giaMua)}</td>
                  <td className={`so px-4 py-1.5 text-right ${mauTangGiam(b.lai ?? 0)}`}>{b.lai == null ? "—" : phanTram(b.lai)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
