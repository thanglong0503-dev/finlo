import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { SoSanhClient } from "@/components/SoSanhClient";
import { taoDongLoc, type DongLoc } from "@/lib/bo-loc";
import { layBangGia, layNganh, layTaiChinhToanThiTruong } from "@/lib/mofi";
import { dinhDangCot } from "@/lib/so-sanh";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]/so-sanh">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — So sánh ngành` };
}

export default function TrangSoSanh({ params }: PageProps<"/co-phieu/[ma]/so-sanh">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <Suspense
        fallback={
          <>
            <LuoiMo so={6} cot="md:grid-cols-3" />
            <BangMo dong={10} />
          </>
        }
      >
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

const trungViCua = (ds: (number | null)[]) => {
  const s = ds.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const g = Math.floor(s.length / 2);
  return s.length % 2 ? s[g] : (s[g - 1] + s[g]) / 2;
};

// Chỉ tiêu có thẻ xếp hạng; "thapTot": giá trị thấp hơn là tốt hơn (định giá rẻ hơn, nợ ít hơn)
const XEP_HANG: { khoa: keyof DongLoc; nhan: string; donVi: "%" | "x" | "pt"; thapTot?: boolean; giaiThich: string }[] = [
  { khoa: "pe", nhan: "P/E", donVi: "x", thapTot: true, giaiThich: "Thấp hơn là rẻ hơn" },
  { khoa: "pb", nhan: "P/B", donVi: "x", thapTot: true, giaiThich: "Thấp hơn là rẻ hơn" },
  { khoa: "roe", nhan: "ROE", donVi: "%", giaiThich: "Hiệu quả trên vốn chủ" },
  { khoa: "tangLN", nhan: "Tăng trưởng LN", donVi: "pt", giaiThich: "4 quý so với cùng kỳ" },
  { khoa: "bienRong", nhan: "Biên LN ròng", donVi: "%", giaiThich: "Lợi nhuận / doanh thu" },
  { khoa: "coTuc", nhan: "Tỷ suất cổ tức", donVi: "%", giaiThich: "Tiền mặt 4 quý / giá" },
];

const SO_MA_TOI_DA = 30;

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const [bangGia, tc, nganh] = await Promise.all([layBangGia(), layTaiChinhToanThiTruong(), layNganh()]);
  const khoa = nganh.maNganh[ma];
  if (!khoa) return <p className="text-chu-phu">{ma} chưa được xếp vào rổ ngành nào để so sánh.</p>;

  const cungNganh = bangGia.coPhieu.filter((c) => nganh.maNganh[c.ma] === khoa);
  const tatCa = taoDongLoc(cungNganh, tc, nganh);
  // Ngành đông mã: lấy các mã vốn hoá lớn nhất, luôn giữ mã đang xem
  const theoVon = [...tatCa].sort((a, b) => (b.vonHoa ?? 0) - (a.vonHoa ?? 0));
  const dong = theoVon.slice(0, SO_MA_TOI_DA);
  const ban = tatCa.find((d) => d.ma === ma);
  if (ban && !dong.includes(ban)) dong.push(ban);

  // Trung vị tính trên toàn bộ ngành, không chỉ các mã đang hiện
  const trungVi: Partial<Record<keyof DongLoc, number | null>> = {};
  for (const k of ["phanTram", "vonHoa", "pe", "pb", "roe", "roa", "tangLN", "tangDT", "bienRong", "noVon", "coTuc"] as const)
    trungVi[k] = trungViCua(tatCa.map((d) => d[k]));
  // P/E âm hoặc quá cao làm méo trung vị: chỉ lấy mã có lãi
  trungVi.pe = trungViCua(tatCa.map((d) => (d.pe != null && d.pe > 0 && d.pe < 200 ? d.pe : null)));

  const vonNganh = tatCa.reduce((s, d) => s + (d.vonHoa ?? 0), 0);
  const hangVon = theoVon.findIndex((d) => d.ma === ma) + 1;

  const the = XEP_HANG.map((x) => {
    const gt = ban ? (ban[x.khoa] as number | null) : null;
    const hopLe = tatCa
      .map((d) => d[x.khoa] as number | null)
      .filter((v): v is number => v != null && Number.isFinite(v) && (x.khoa !== "pe" || v > 0));
    const sx = [...hopLe].sort((a, b) => (x.thapTot ? a - b : b - a));
    const hang = gt != null && (x.khoa !== "pe" || gt > 0) ? sx.findIndex((v) => v === gt) + 1 : 0;
    return { ...x, gt, tv: trungVi[x.khoa] ?? null, hang, tong: sx.length };
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="nhan-muc">So sánh ngành</p>
          <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">
            {ma} trong rổ{" "}
            <Link href={`/nganh/${khoa}`} className="text-nhan hover:underline">
              {nganh.ten[khoa]}
            </Link>
          </h2>
        </div>
        <p className="text-[12px] text-chu-phu tabular-nums">
          {tatCa.length} mã · vốn hoá ngành {dinhDangCot(vonNganh, "vh")}
          {hangVon > 0 && ` · ${ma} lớn thứ ${hangVon}`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px border border-vien bg-vien md:grid-cols-3 lg:grid-cols-6">
        {the.map((t) => {
          // Vị trí trên thước: 0 là tốt nhất ngành, 100 là kém nhất
          const viTri = t.hang > 0 && t.tong > 1 ? ((t.hang - 1) / (t.tong - 1)) * 100 : null;
          const tot = t.gt != null && t.tv != null && (t.thapTot ? t.gt < t.tv : t.gt > t.tv);
          return (
            <div key={t.khoa} className="bg-nen p-4">
              <p className="text-chu-phu">{t.nhan}</p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${t.gt == null || t.tv == null ? "" : tot ? "text-tang" : "text-giam"}`}>
                {dinhDangCot(t.gt, t.donVi)}
              </p>
              <p className="text-[12px] text-chu-phu tabular-nums">Trung vị {dinhDangCot(t.tv, t.donVi)}</p>
              <div className="relative mt-3 h-1 bg-nen-phu">
                {viTri != null && (
                  <span
                    className="absolute -top-1 h-3 w-0.5 -translate-x-1/2 bg-nhan"
                    style={{ left: `${Math.min(99, Math.max(1, 100 - viTri))}%` }}
                  />
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-chu-phu tabular-nums">
                {t.hang > 0 ? `Hạng ${t.hang}/${t.tong}` : "Chưa xếp hạng"} · {t.giaiThich}
              </p>
            </div>
          );
        })}
      </div>

      <SoSanhClient ma={ma} dong={dong} trungVi={trungVi} />
      <p className="mt-3 text-[11px] text-chu-phu">
        {tatCa.length > SO_MA_TOI_DA ? `Hiện ${dong.length} mã vốn hoá lớn nhất trong ${tatCa.length} mã của ngành. ` : ""}
        Chỉ số tính trên báo cáo 4 quý gần nhất và giá hiện tại; trung vị P/E chỉ gồm các mã có lãi. Thước xếp hạng: phải là
        tốt hơn trong ngành.
      </p>
    </>
  );
}
