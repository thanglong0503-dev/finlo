import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import duLieu from "@/data/fin-rating.json";
import chiTietTho from "@/data/fin-rating-chi-tiet.json";
import { CHI_TIEU, type ChiTietFinRating, type KetQuaFinRating } from "@/lib/fin-rating";
import { NHOM_THUAT_NGU, THUAT_NGU, timThuatNgu, type ThuatNgu } from "@/lib/thuat-ngu";

const kq = duLieu as unknown as KetQuaFinRating;
const chiTiet = chiTietTho as unknown as ChiTietFinRating;

export function generateStaticParams() {
  return THUAT_NGU.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/thuat-ngu/[slug]">): Promise<Metadata> {
  const t = timThuatNgu((await params).slug);
  if (!t) return {};
  return { title: `${t.ten} là gì? — Từ điển đầu tư`, description: t.ngan };
}

const so = (x: number, le: number) => x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le });
const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

// Ví dụ bằng số liệu thật từ lần chấm Fin Rating gần nhất
function viDu(t: ThuatNgu) {
  if (!t.vd) return null;
  const { ma, k, nhan } = t.vd;
  const d = kq.ds.find((x) => x.ma === ma);
  if (!d) return null;
  if (k === "pe" || k === "pb") {
    const x = d[k];
    return x != null ? { ma, cau: `${nhan} của ${ma} là ${so(x, 2)} lần, với giá ${so(d.gia / 1000, 2)} nghìn đồng.`, hang: null } : null;
  }
  const x = chiTiet[ma]?.[k];
  if (!x) return null;
  const c = CHI_TIEU.find((y) => y.k === k);
  const gt =
    c?.donVi === "%" ? `${so(x[0], 1)}%` : c?.donVi === "x" ? `${so(x[0], 2)} lần` : c?.donVi === "diem" ? `${so(x[0], 0)}/9 điểm` : c?.donVi === "pv" ? `${x[0] > 0 ? "+" : ""}${so(x[0], 1)} điểm %` : so(x[0], 2);
  return { ma, cau: `${nhan} của ${ma} là ${gt}.`, hang: x[1] };
}

export default async function TrangMotThuatNgu({ params }: PageProps<"/thuat-ngu/[slug]">) {
  const t = timThuatNgu((await params).slug);
  if (!t) notFound();
  const nhom = NHOM_THUAT_NGU.find((n) => n.k === t.nhom);
  const vd = viDu(t);
  const lienQuan = (t.lienQuan ?? []).map(timThuatNgu).filter((x): x is ThuatNgu => !!x);
  const cungNhom = THUAT_NGU.filter((x) => x.nhom === t.nhom && x.slug !== t.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12">
      <Link href="/thuat-ngu" className="text-chu-phu hover:text-chu">
        ← Từ điển thuật ngữ
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_280px]">
        <article>
          <p className="nhan-muc">{nhom?.ten}</p>
          <h1 className="mt-1 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">{t.ten}</h1>
          {t.day && <p className="mt-1 text-chu-phu">{t.day}</p>}
          <p className="mt-4 text-lg leading-relaxed">{t.ngan}</p>
          <div className="mt-4 space-y-3 leading-relaxed text-chu-phu">
            {t.giaiThich.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {t.congThuc && (
            <div className="mt-5 rounded-2xl bg-nen-phu p-4">
              <p className="text-[12px] text-chu-phu">Công thức</p>
              <p className="mt-1 font-semibold">{t.congThuc}</p>
            </div>
          )}
          <div className="mt-4 rounded-2xl border border-vien p-4">
            <p className="text-[12px] text-chu-phu">Cách đọc</p>
            <p className="mt-1">{t.cachDoc}</p>
          </div>
          {vd && (
            <div className="mt-4 rounded-2xl border border-nhan/40 bg-nen-phu p-4">
              <p className="text-[12px] text-chu-phu">Ví dụ thực tế, dữ liệu phiên {ngayVN(kq.ngay)}</p>
              <p className="mt-1">
                {vd.cau}
                {vd.hang != null ? ` Mức này tốt hơn ${vd.hang}% số mã cùng nhóm trong Fin Rating.` : ""}
              </p>
              <Link href={`/co-phieu/${vd.ma}/fin-rating`} prefetch={false} className="mt-2 inline-block text-[14px] font-semibold text-nhan hover:underline">
                Xem Fin Rating {vd.ma} →
              </Link>
            </div>
          )}
          {lienQuan.length > 0 && (
            <div className="mt-6">
              <p className="font-semibold">Thuật ngữ liên quan</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lienQuan.map((x) => (
                  <Link key={x.slug} href={`/thuat-ngu/${x.slug}`} prefetch={false} className="rounded-full bg-nen-noi px-4 py-1.5 text-[13px] font-semibold hover:bg-vien">
                    {x.ten}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
        <aside className="lg:pt-10">
          <p className="font-semibold">Cùng nhóm</p>
          <ul className="mt-2 space-y-1.5 text-[14px]">
            {cungNhom.map((x) => (
              <li key={x.slug}>
                <Link href={`/thuat-ngu/${x.slug}`} prefetch={false} className="text-chu-phu hover:text-chu">
                  {x.ten}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
