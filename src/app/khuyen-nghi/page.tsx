import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangBaoCao, MAU_NHOM, mau, ptDau, so } from "@/components/BangKhuyenNghi";
import { BangDiemCtck, BaoCaoTheoThang, DoChinhXac, type DiemCtck, type ThangKN } from "@/components/BieuDoKhuyenNghi";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { giaNghin } from "@/lib/dinh-dang";
import {
  BAO_CAO,
  CAP_NHAT,
  CAT_LO,
  KY_HAN,
  TEN_NHOM,
  TEN_TRANG_THAI,
  maNoiBat,
  nhomCua,
  theoCtck,
  thongKe,
  type TrangThai,
} from "@/lib/khuyen-nghi";
import { layBangGia } from "@/lib/mofi";

export const metadata: Metadata = {
  title: "Khuyến nghị của công ty chứng khoán",
  description: "Tổng hợp báo cáo khuyến nghị mua, bán cổ phiếu của các CTCK và chấm điểm độ chính xác theo giá thực tế.",
};

export default function TrangKhuyenNghi({ searchParams }: PageProps<"/khuyen-nghi">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12">
      <p className="nhan-muc">Báo cáo phân tích</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">Khuyến nghị của công ty chứng khoán</h1>
      <p className="mt-2 max-w-3xl text-chu-phu">
        Mỗi báo cáo được chấm theo giá thực tế sau ngày phát hành: vào ở giá mở cửa phiên kế tiếp, <b>đạt</b> khi giá chạm
        mục tiêu, <b>cắt lỗ</b> khi đi ngược {CAT_LO}%, quá {Math.round(KY_HAN / 30)} tháng thì tính lãi lỗ tại thời điểm đó.
      </p>
      <Suspense
        fallback={
          <div className="mt-6">
            <LuoiMo so={4} />
            <BangMo dong={10} />
          </div>
        }
      >
        <NoiDung searchParams={searchParams} />
      </Suspense>
    </div>
  );
}


const SO_DONG = 50;

function The({ nhan, gt, phu }: { nhan: string; gt: string; phu?: string }) {
  return (
    <div className="bg-nen p-4">
      <p className="text-[12px] text-chu-phu">{nhan}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{gt}</p>
      {phu && <p className="mt-0.5 text-[11px] text-chu-phu">{phu}</p>}
    </div>
  );
}

async function NoiDung({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const mot = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const loc = { ma: mot("ma").toUpperCase().trim(), ctck: mot("ctck"), kn: mot("kn"), tt: mot("tt") };
  const trang = Math.max(1, Number(mot("trang")) || 1);

  if (!BAO_CAO.length) return <p className="mt-6 text-chu-phu">Chưa có dữ liệu báo cáo.</p>;

  const tong = thongKe(BAO_CAO);
  const xepHang = theoCtck();
  const coDiem = xepHang.filter((x) => x.diem != null);
  const dsCtck = [...xepHang].sort((a, b) => a.ctck.localeCompare(b.ctck));
  const bangGia = await layBangGia().catch(() => null);
  const giaNay = new Map(bangGia?.coPhieu.map((c) => [c.ma, c.gia]) ?? []);
  const noiBat = maNoiBat();
  const diemBD: DiemCtck[] = coDiem.map((x) => ({
    ctck: x.ctck,
    diem: x.diem!,
    daKet: x.daKet,
    dat: x.dat,
    catLo: x.catLo,
    hetHan: x.hetHan,
    tyLeDat: x.tyLeDat ?? 0,
    vuot: x.vuotChiSoTB ?? 0,
  }));
  // Số khuyến nghị theo tháng (bỏ báo cáo chỉ cập nhật, không có khuyến nghị)
  const theoThang = new Map<string, ThangKN>();
  for (const b of BAO_CAO) {
    const n = nhomCua(b);
    if (!n) continue;
    const k = b.ngay.slice(0, 7);
    const t = theoThang.get(k) ?? { thang: `${k.slice(5)}/${k.slice(2, 4)}`, mua: 0, giu: 0, ban: 0 };
    t[n]++;
    theoThang.set(k, t);
  }
  const thangBD = [...theoThang.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, t]) => t);

  const loc_ = BAO_CAO.filter(
    (b) =>
      (!loc.ma || b.ma === loc.ma) &&
      (!loc.ctck || b.ctck === loc.ctck) &&
      (!loc.kn || nhomCua(b) === loc.kn) &&
      (!loc.tt || b.kq?.trangThai === loc.tt),
  );
  const tongTrang = Math.max(1, Math.ceil(loc_.length / SO_DONG));
  const dong = loc_.slice((trang - 1) * SO_DONG, trang * SO_DONG);
  const tkLoc = loc.ma || loc.ctck ? thongKe(loc_) : null;
  const url = (them: Record<string, string | number>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...loc, ...them })) if (v && !(k === "trang" && String(v) === "1")) q.set(k, String(v));
    const s = q.toString();
    return `/khuyen-nghi${s ? `?${s}` : ""}#danh-sach`;
  };

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vien bg-vien md:grid-cols-4">
        <The nhan="Báo cáo doanh nghiệp" gt={tong.soBao.toLocaleString("vi-VN")} phu={`${xepHang.length} công ty chứng khoán`} />
        <The nhan="Tỷ lệ đạt mục tiêu" gt={`${so(tong.tyLeDat, 0)}%`} phu={`trên ${tong.daKet.toLocaleString("vi-VN")} khuyến nghị đã kết thúc`} />
        <The nhan="Lãi lỗ bình quân" gt={ptDau(tong.loiNhuanTB)} phu={`vượt VN-Index ${ptDau(tong.vuotChiSoTB)}`} />
        <The nhan="Thời gian tới mục tiêu" gt={tong.soNgayDatTB != null ? `${so(tong.soNgayDatTB, 0)} ngày` : "—"} phu={`upside bình quân ${ptDau(tong.upsideTB)}`} />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-[-0.03em]">Xếp hạng công ty chứng khoán</h2>
        <p className="mt-1 text-[13px] text-chu-phu">
          Điểm = 60% tỷ lệ đạt mục tiêu + 40% mức vượt VN-Index; chỉ xếp hạng CTCK có từ 10 khuyến nghị mua/bán đã kết thúc.
        </p>
        {diemBD.length > 1 && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <BangDiemCtck ds={diemBD} />
            <div className="grid content-start gap-3">
              <DoChinhXac ds={diemBD} />
              {thangBD.length > 2 && <BaoCaoTheoThang ds={thangBD} />}
            </div>
          </div>
        )}
        <div className="mt-3 overflow-x-auto rounded-2xl border border-vien">
          <table className="w-full min-w-[760px] text-[13px] tabular-nums">
            <thead className="text-chu-phu">
              <tr className="border-b border-vien">
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">CTCK</th>
                <th className="px-3 py-2 text-right font-medium">Điểm</th>
                <th className="px-3 py-2 text-right font-medium">Báo cáo</th>
                <th className="px-3 py-2 text-right font-medium">Đã kết thúc</th>
                <th className="px-3 py-2 text-right font-medium">Đạt</th>
                <th className="px-3 py-2 text-right font-medium">Cắt lỗ</th>
                <th className="px-3 py-2 text-right font-medium">Lãi lỗ TB</th>
                <th className="px-3 py-2 text-right font-medium">Vượt VN-Index</th>
                <th className="px-3 py-2 text-right font-medium">Upside TB</th>
              </tr>
            </thead>
            <tbody>
              {coDiem.map((x, i) => (
                <tr key={x.ctck} className="border-b border-vien last:border-0 hover:bg-nen-phu">
                  <td className="px-3 py-2 text-chu-phu">{i + 1}</td>
                  <td className="px-3 py-2 font-semibold">
                    <Link href={url({ ctck: x.ctck, ma: "", trang: 1 })} className="hover:text-nhan">
                      {x.ctck}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex items-center gap-2">
                      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-nen-noi sm:inline-block">
                        <span className="block h-full bg-nhan" style={{ width: `${x.diem}%` }} />
                      </span>
                      <b>{x.diem}</b>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{x.soBao}</td>
                  <td className="px-3 py-2 text-right">{x.daKet}</td>
                  <td className="px-3 py-2 text-right text-tang">{so(x.tyLeDat, 0)}%</td>
                  <td className="px-3 py-2 text-right text-giam">{x.daKet ? `${so((x.catLo / x.daKet) * 100, 0)}%` : "—"}</td>
                  <td className={`px-3 py-2 text-right ${mau(x.loiNhuanTB)}`}>{ptDau(x.loiNhuanTB)}</td>
                  <td className={`px-3 py-2 text-right ${mau(x.vuotChiSoTB)}`}>{ptDau(x.vuotChiSoTB)}</td>
                  <td className="px-3 py-2 text-right text-chu-phu">{ptDau(x.upsideTB)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {noiBat.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold tracking-[-0.03em]">Được nhiều CTCK khuyến nghị nhất (90 ngày)</h2>
          <p className="mt-1 text-[13px] text-chu-phu">Mỗi CTCK tính báo cáo mới nhất; giá mục tiêu là trung vị các CTCK.</p>
          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-vien bg-vien md:grid-cols-3 lg:grid-cols-4">
            {noiBat.map((x) => {
              const gia = giaNay.get(x.ma);
              const conLai = gia && x.giaTV ? (x.giaTV / gia - 1) * 100 : null;
              return (
                <Link key={x.ma} href={url({ ma: x.ma, ctck: "", trang: 1 })} className="bg-nen p-4 hover:bg-nen-phu">
                  <p className="flex items-baseline justify-between">
                    <b className="text-[15px]">{x.ma}</b>
                    <span className="text-[11px] text-chu-phu">{x.ds.length} CTCK</span>
                  </p>
                  <p className="mt-1 text-[13px] tabular-nums">
                    Mục tiêu {x.giaTV ? giaNghin(x.giaTV) : "—"}
                    {gia ? <span className="text-chu-phu"> · giá {giaNghin(gia)}</span> : null}
                  </p>
                  <p className={`text-[12px] tabular-nums ${mau(conLai)}`}>Còn {ptDau(conLai)} tới mục tiêu</p>
                  <p className="mt-1.5 flex gap-1 text-[11px]">
                    {(["mua", "giu", "ban"] as const).map((n) =>
                      x.dem[n] ? (
                        <span key={n} className={`rounded-full px-1.5 ${MAU_NHOM[n]}`}>
                          {TEN_NHOM[n]} {x.dem[n]}
                        </span>
                      ) : null,
                    )}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section id="danh-sach" className="mt-10 scroll-mt-28">
        <h2 className="text-xl font-bold tracking-[-0.03em]">Danh sách báo cáo</h2>
        <form action="/khuyen-nghi" className="mt-3 flex flex-wrap gap-2 text-[13px]">
          <input
            name="ma"
            defaultValue={loc.ma}
            placeholder="Mã cổ phiếu"
            maxLength={6}
            className="h-9 w-32 rounded-full border border-vien bg-nen px-4 uppercase outline-none focus:border-nhan"
          />
          <select name="ctck" defaultValue={loc.ctck} className="h-9 rounded-full border border-vien bg-nen px-3 outline-none">
            <option value="">Mọi CTCK</option>
            {dsCtck.map((x) => (
              <option key={x.ctck} value={x.ctck}>
                {x.ctck}
              </option>
            ))}
          </select>
          <select name="kn" defaultValue={loc.kn} className="h-9 rounded-full border border-vien bg-nen px-3 outline-none">
            <option value="">Mọi khuyến nghị</option>
            {(["mua", "giu", "ban"] as const).map((n) => (
              <option key={n} value={n}>
                {TEN_NHOM[n]}
              </option>
            ))}
          </select>
          <select name="tt" defaultValue={loc.tt} className="h-9 rounded-full border border-vien bg-nen px-3 outline-none">
            <option value="">Mọi kết quả</option>
            {(Object.keys(TEN_TRANG_THAI) as TrangThai[]).map((t) => (
              <option key={t} value={t}>
                {TEN_TRANG_THAI[t]}
              </option>
            ))}
          </select>
          <button className="h-9 rounded-full bg-chu px-5 font-semibold text-nen">Lọc</button>
          {(loc.ma || loc.ctck || loc.kn || loc.tt) && (
            <Link href="/khuyen-nghi#danh-sach" className="flex h-9 items-center px-2 text-chu-phu hover:text-chu">
              Xoá lọc
            </Link>
          )}
        </form>

        {tkLoc && (
          <p className="mt-3 text-[13px] text-chu-phu">
            {[loc.ma, loc.ctck].filter(Boolean).join(" · ")}: {tkLoc.soBao} báo cáo · đạt mục tiêu {so(tkLoc.tyLeDat, 0)}% trên{" "}
            {tkLoc.daKet} đã kết thúc · lãi lỗ bình quân <span className={mau(tkLoc.loiNhuanTB)}>{ptDau(tkLoc.loiNhuanTB)}</span>
            {tkLoc.diem != null && <> · điểm <b className="text-chu">{tkLoc.diem}</b></>}
          </p>
        )}

        <BangBaoCao ds={dong} giaNay={giaNay} />

        <div className="mt-4 flex items-center justify-between text-[13px] text-chu-phu">
          <span>
            {loc_.length.toLocaleString("vi-VN")} báo cáo · trang {trang}/{tongTrang}
          </span>
          <span className="flex gap-2">
            {trang > 1 && (
              <Link href={url({ trang: trang - 1 })} className="rounded-full border border-vien px-4 py-1.5 hover:text-chu">
                ← Trước
              </Link>
            )}
            {trang < tongTrang && (
              <Link href={url({ trang: trang + 1 })} className="rounded-full border border-vien px-4 py-1.5 hover:text-chu">
                Sau →
              </Link>
            )}
          </span>
        </div>
        <p className="mt-6 text-[11px] text-chu-phu">
          Nguồn báo cáo: trang Báo cáo phân tích của Vietstock, mở bài gốc để đọc đầy đủ. Upside tính bằng giá mục tiêu so với giá đóng
          cửa thật ngày phát hành (lịch sử giá CafeF); diễn biến sau đó dùng giá đã điều chỉnh cổ tức, chia tách. Báo cáo không ghi rõ khuyến nghị thì suy theo giá mục tiêu (cao hơn giá
          10% trở lên là Mua). Cập nhật {CAP_NHAT ? new Date(CAP_NHAT).toLocaleDateString("vi-VN") : "—"}. Chỉ để tham khảo, không phải
          khuyến nghị đầu tư.
        </p>
      </section>
    </>
  );
}
