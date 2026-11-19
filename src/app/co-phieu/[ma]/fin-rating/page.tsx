import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Radar } from "@/components/fin-rating/Radar";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { ThuatNgu } from "@/components/ThuatNgu";
import duLieu from "@/data/fin-rating.json";
import chiTietTho from "@/data/fin-rating-chi-tiet.json";
import { THUAT_NGU_CHI_TIEU } from "@/lib/thuat-ngu";
import { CHI_TIEU, TEN_LOAI, TRUC, apDung, xepLoai, type ChiTieu, type ChiTietFinRating, type KetQuaFinRating } from "@/lib/fin-rating";

const kq = duLieu as unknown as KetQuaFinRating;
const chiTiet = chiTietTho as unknown as ChiTietFinRating;

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]/fin-rating">): Promise<Metadata> {
  const ma = (await params).ma.toUpperCase();
  return {
    title: `${ma} — Fin Rating`,
    description: `Điểm Fin Rating của ${ma} từ 1 đến 10 theo 7 trục: tăng trưởng, sinh lời, chất lượng lợi nhuận, sức khoẻ tài chính, định giá, cổ tức, xu hướng giá; so với ngành và toàn thị trường.`,
  };
}

export default function TrangFinRating({ params }: PageProps<"/co-phieu/[ma]/fin-rating">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <Suspense
        fallback={
          <>
            <LuoiMo so={2} cot="lg:grid-cols-2" />
            <BangMo dong={8} />
          </>
        }
      >
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

const so = (x: number | null | undefined, le = 2) =>
  x == null || !Number.isFinite(x) ? "—" : x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le });
const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const mauDiem = (v: number | null | undefined) => (v == null ? "" : v >= 6.5 ? "text-tang" : v >= 4.5 ? "text-dung" : "text-giam");

function giaTriChiTieu(c: ChiTieu, x: number) {
  switch (c.donVi) {
    case "%":
      return `${so(x, 1)}%`;
    case "x":
      return c.k === "phuLai" && x >= 100 ? "Không vay" : `${so(x, 2)} lần`;
    case "diem":
      return `${so(x, 0)}/9`;
    case "nam":
      return `${so(x, 0)}/5 năm`;
    case "quy":
      return `${so(x, 0)}/4 quý`;
    default:
      return `${x > 0 ? "+" : x < 0 ? "−" : ""}${so(Math.abs(x), 1)} điểm %`;
  }
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const d = kq.ds.find((x) => x.ma === ma);
  if (!d)
    return (
      <div className="rounded-3xl border border-vien p-6">
        <h1 className="text-xl font-bold">{ma} chưa có Fin Rating</h1>
        <p className="mt-2 max-w-2xl text-chu-phu">
          Fin Rating chỉ chấm các cổ phiếu có từ 8 quý báo cáo tài chính, 130 phiên giao dịch trở lên và đủ số liệu cho ít nhất 5 trong 7 trục. Quỹ ETF, chứng quyền và mã mới niêm yết thường chưa đủ điều kiện.
        </p>
        <Link href="/fin-rating" className="mt-4 inline-flex h-11 items-center rounded-full bg-chu px-6 font-semibold text-nen hover:bg-nhan hover:text-white">
          Xem bảng xếp hạng Fin Rating
        </Link>
      </div>
    );

  const nh = d.nganh ? kq.nganh[d.nganh] : null;
  const cungNganh = d.nganh ? kq.ds.filter((x) => x.nganh === d.nganh) : [];
  const hangNganh = cungNganh.findIndex((x) => x.ma === ma) + 1;
  const hon = Math.round((1 - d.hang / kq.soMa) * 100);
  const loai = xepLoai(d.diem);
  const ct = chiTiet[ma] ?? {};

  // Nhận định: vị trí toàn thị trường, so với ngành, trục mạnh nhất và yếu nhất
  const coTruc = TRUC.map((t, i) => ({ t, v: d.truc[i] })).filter((x): x is { t: (typeof TRUC)[number]; v: number } => x.v != null);
  const xep = [...coTruc].sort((a, b) => b.v - a.v);
  const manh = xep.slice(0, 2).filter((x) => x.v >= 5.5);
  const yeu = xep.slice(-2).filter((x) => x.v < 5).reverse();
  const lech = nh ? d.diem - nh.diem : 0;
  const nhanDinh = [
    `${ma} đạt ${so(d.diem)}/10, xếp hạng ${d.hang.toLocaleString("vi-VN")}/${kq.soMa.toLocaleString("vi-VN")} mã, cao hơn ${hon}% số cổ phiếu được chấm.`,
    nh
      ? `So với ngành ${nh.ten} (${nh.soMa} mã, bình quân ${so(nh.diem)}), ${ma} ${lech > 0.5 ? "cao hơn rõ" : lech < -0.5 ? "thấp hơn" : "ở mức tương đương"} và đứng thứ ${hangNganh}/${nh.soMa} trong ngành.`
      : "",
    manh.length ? `Điểm mạnh: ${manh.map((x) => `${x.t.ten.toLowerCase()} (${so(x.v)})`).join(", ")}.` : "",
    yeu.length ? `Cần lưu ý: ${yeu.map((x) => `${x.t.ten.toLowerCase()} (${so(x.v)})`).join(", ")}.` : "",
  ].filter(Boolean);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="nhan-muc">Bộ chỉ số độc quyền của Finlo</p>
          <h1 className="mt-1 text-2xl leading-tight font-bold tracking-[-0.03em] sm:text-3xl">Fin Rating {ma}</h1>
        </div>
        <Link href="/fin-rating" className="text-[14px] font-semibold text-chu-phu hover:text-chu">
          Bảng xếp hạng toàn thị trường →
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="rounded-3xl border border-vien p-5">
          <div className="grid grid-cols-[1.1fr_1fr] gap-3">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-nhan px-3 py-5 text-[#04140b]">
              <p className="text-[34px] leading-none font-bold tabular-nums">
                {so(d.diem)}
                <span className="text-[20px]">/10</span>
              </p>
              <p className="mt-2 text-[14px] font-semibold">Fin Rating</p>
            </div>
            <div className="flex flex-col justify-center gap-2 rounded-2xl bg-nen-phu px-4 py-3 text-[13px]">
              <div>
                <p className="text-chu-phu">Xếp loại</p>
                <p className={`text-[16px] font-bold ${loai.mau}`}>{loai.ten}</p>
              </div>
              <div>
                <p className="text-chu-phu">Kỳ chấm điểm</p>
                <p className="font-semibold tabular-nums">{ngayVN(kq.ngay)}</p>
              </div>
            </div>
          </div>

          <table className="mt-4 w-full text-[14px]">
            <thead>
              <tr className="border-b border-vien text-[12px] text-chu-phu">
                <th className="py-2 text-left font-medium">Trục</th>
                <th className="py-2 pl-3 text-right leading-tight font-medium">{ma}</th>
                <th className="py-2 pl-3 text-right leading-tight font-medium">TB ngành</th>
                <th className="py-2 pl-3 text-right leading-tight font-medium">TB thị trường</th>
              </tr>
            </thead>
            <tbody>
              {TRUC.map((t, i) => (
                <tr key={t.ma} className="border-b border-vien last:border-b-0">
                  <td className="py-2.5 pr-2">
                    <a href={`#truc-${t.ma}`} className="hover:text-nhan">
                      {t.ten}
                    </a>
                  </td>
                  <td className={`py-2.5 text-right font-bold tabular-nums ${mauDiem(d.truc[i])}`}>{so(d.truc[i])}</td>
                  <td className="py-2.5 text-right text-chu-phu tabular-nums">{so(nh?.tb[i])}</td>
                  <td className="py-2.5 text-right text-chu-phu tabular-nums">{so(kq.thiTruong[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 rounded-3xl border border-vien p-5">
          <Radar
            nhan={TRUC.map((t) => t.ngan)}
            moTa={`Biểu đồ 7 trục Fin Rating của ${ma} so với bình quân ngành và thị trường`}
            chuoi={[
              { ten: ma, gt: d.truc, mau: "var(--nhan)", to: true },
              ...(nh ? [{ ten: nh.ten, gt: nh.tb, mau: "var(--san-gia)" }] : []),
              { ten: "TB thị trường", gt: kq.thiTruong, mau: "var(--chu-phu)", dut: true },
            ]}
          />
          <div className="space-y-1.5 rounded-2xl bg-nen-phu p-4 text-[15px] leading-relaxed">
            {nhanDinh.map((c) => (
              <p key={c}>{c}</p>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold tracking-[-0.03em]">Điểm từng chỉ tiêu</h2>
        <p className="mt-1 max-w-3xl text-chu-phu">
          Mỗi chỉ tiêu được xếp hạng phần trăm: thanh càng dài, {ma} càng tốt hơn nhiều mã. Sinh lời, chất lượng và sức khoẻ chỉ so với các {TEN_LOAI[d.loai] ?? "doanh nghiệp"} khác; các trục còn lại so với toàn thị trường.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {TRUC.map((t, i) => {
            const ds = CHI_TIEU.filter((c) => c.truc === t.ma && apDung(c, d.loai));
            return (
              <div key={t.ma} id={`truc-${t.ma}`} className="scroll-mt-28 rounded-2xl bg-nen-phu p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-bold">{t.ten}</h3>
                  <p className={`text-lg font-bold tabular-nums ${mauDiem(d.truc[i])}`}>{d.truc[i] != null ? `${so(d.truc[i])}/10` : "Chưa đủ số liệu"}</p>
                </div>
                <p className="mt-0.5 text-[12px] text-chu-phu">
                  {t.moTa}. Trọng số {t.trongSo}%.
                </p>
                <ul className="mt-3 space-y-2.5">
                  {ds.map((c) => {
                    const x = ct[c.k];
                    const p = x?.[1];
                    return (
                      <li key={c.k}>
                        <div className="flex justify-between gap-3 text-[13px]">
                          <span>{THUAT_NGU_CHI_TIEU[c.k] ? <ThuatNgu slug={THUAT_NGU_CHI_TIEU[c.k]}>{c.ten}</ThuatNgu> : c.ten}</span>
                          <span className="shrink-0 font-semibold tabular-nums">{x ? giaTriChiTieu(c, x[0]) : "—"}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-vien">
                            {p != null && <div className={`h-full rounded-full ${p >= 60 ? "bg-tang" : p >= 40 ? "bg-dung" : "bg-giam"}`} style={{ width: `${Math.max(2, p)}%` }} />}
                          </div>
                          <span className="w-16 shrink-0 text-right text-[11px] text-chu-phu tabular-nums">{p != null ? `hơn ${p}%` : x ? "nhóm nhỏ" : "thiếu số"}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {nh && cungNganh.length > 1 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold tracking-[-0.03em]">Cùng ngành {nh.ten}</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-vien">
            <table className="w-full min-w-[720px] text-[14px]">
              <thead>
                <tr className="border-b border-vien text-[12px] text-chu-phu">
                  <th className="px-3 py-2.5 text-left font-medium">Mã</th>
                  <th className="px-3 py-2.5 text-right font-medium">Fin Rating</th>
                  {TRUC.map((t) => (
                    <th key={t.ma} className="px-3 py-2.5 text-right font-medium">
                      {t.ngan}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cungNganh.slice(0, 12).map((x) => (
                  <tr key={x.ma} className={`border-b border-vien last:border-b-0 ${x.ma === ma ? "bg-nen-phu" : ""}`}>
                    <td className="px-3 py-2">
                      <Link href={`/co-phieu/${x.ma}/fin-rating`} prefetch={false} className="font-semibold hover:text-nhan">
                        {x.ma}
                      </Link>
                    </td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${mauDiem(x.diem)}`}>{so(x.diem)}</td>
                    {x.truc.map((v, j) => (
                      <td key={j} className={`px-3 py-2 text-right tabular-nums ${mauDiem(v)}`}>
                        {so(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cungNganh.length > 12 && <p className="mt-2 text-[12px] text-chu-phu">12 mã điểm cao nhất trong {cungNganh.length} mã của ngành.</p>}
        </section>
      )}

      <p className="mt-8 max-w-4xl text-[13px] text-chu-phu">
        Fin Rating là điểm do Finlo tự tính trên số liệu quá khứ, chấm lại mỗi tuần; không phải khuyến nghị mua bán. Điểm cao nghĩa là mã tốt hơn phần lớn thị trường ở các chỉ tiêu được chọn, không đảm bảo giá sẽ tăng.{" "}
        <Link href="/fin-rating#cach-cham" className="font-semibold text-chu hover:text-nhan">
          Xem cách chấm điểm
        </Link>
        . Dữ liệu từ Mofi.
      </p>
    </>
  );
}
