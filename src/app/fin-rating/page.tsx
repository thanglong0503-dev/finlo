import type { Metadata } from "next";
import Link from "next/link";
import { BangXepHang, type CotXH, type DongXH } from "@/components/fin-rating/BangXepHang";
import { TraMaRating } from "@/components/fin-rating/TraMaRating";
import duLieu from "@/data/fin-rating.json";
import { CHI_TIEU, TEN_LOAI, TRUC, type KetQuaFinRating } from "@/lib/fin-rating";

const kq = duLieu as unknown as KetQuaFinRating;

export const metadata: Metadata = {
  title: "Fin Rating — Chấm điểm cổ phiếu từ 1 đến 10",
  description: "Bộ chỉ số độc quyền của Finlo: chấm điểm hơn 1.000 cổ phiếu theo 7 trục tăng trưởng, sinh lời, chất lượng lợi nhuận, sức khoẻ tài chính, định giá, cổ tức và xu hướng giá; so với ngành và toàn thị trường.",
};

const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const so = (x: number | null | undefined) => (x == null ? "—" : x.toLocaleString("vi-VN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }));

export default function TrangFinRating() {
  const tenNganh = Object.fromEntries(Object.entries(kq.nganh).map(([k, v]) => [k, v.ten]));
  const dong: DongXH[] = kq.ds.map((d) => ({
    ma: d.ma,
    ten: d.ten,
    san: d.san,
    nganh: d.nganh,
    so: { diem: d.diem, ...Object.fromEntries(TRUC.map((t, i) => [t.ma, d.truc[i]])), gia: d.gia, gtgd: d.giaTri20 },
  }));
  const cot: CotXH[] = [
    { khoa: "diem", nhan: "Fin Rating", kieu: "diem" },
    ...TRUC.map((t) => ({ khoa: t.ma, nhan: t.ngan, kieu: "diem" as const, goiY: t.ten })),
    { khoa: "gia", nhan: "Giá", kieu: "gia", goiY: "Giá lúc chấm điểm, nghìn đồng" },
  ];
  const nganh = Object.values(kq.nganh)
    .filter((n) => n.soMa >= 3)
    .sort((a, b) => b.diem - a.diem);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pt-8 pb-12">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="nhan-muc">Bộ chỉ số độc quyền của Finlo</p>
          <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Fin Rating</h1>
          <p className="mt-2 max-w-3xl text-chu-phu">
            Chấm điểm {kq.soMa.toLocaleString("vi-VN")} cổ phiếu từ 1 đến 10 theo 7 trục, mỗi chỉ tiêu xếp hạng so với toàn thị trường hoặc cùng loại hình doanh nghiệp. Chấm lại mỗi tuần, lần gần nhất theo dữ liệu phiên {ngayVN(kq.ngay)}.
          </p>
        </div>
        <div>
          <p className="mb-2 font-semibold">Tra điểm một mã</p>
          <TraMaRating />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {TRUC.map((t, i) => (
          <div key={t.ma} className="rounded-2xl bg-nen-phu p-3">
            <p className="text-[12px] text-chu-phu">{t.ten}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{so(kq.thiTruong[i])}</p>
            <p className="text-[11px] text-chu-phu">TB thị trường · trọng số {t.trongSo}%</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-bold tracking-[-0.03em]">Bảng xếp hạng</h2>
        <p className="mt-1 mb-3 text-[14px] text-chu-phu">Mặc định chỉ hiện mã có giá trị giao dịch bình quân 20 phiên từ 1 tỷ đồng, vì mã ít giao dịch dễ có số liệu méo. Bấm vào mã để xem chi tiết từng chỉ tiêu.</p>
        <BangXepHang dong={dong} cot={cot} sapXepDau="diem" tenNganh={tenNganh} duoiLienKet="/fin-rating" thanhKhoanDau={1e9} />
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-[-0.03em]">Điểm bình quân theo ngành</h2>
        <div className="mt-3 grid gap-x-8 gap-y-2 md:grid-cols-2">
          {nganh.map((n) => (
            <div key={n.ten} className="flex items-center gap-3 text-[14px]">
              <span className="w-44 shrink-0 truncate" title={n.ten}>
                {n.ten}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-nen-phu">
                <div className="h-full rounded-full bg-nhan" style={{ width: `${(n.diem / 10) * 100}%` }} />
              </div>
              <span className="w-10 text-right font-semibold tabular-nums">{so(n.diem)}</span>
              <span className="w-12 text-right text-[12px] text-chu-phu tabular-nums">{n.soMa} mã</span>
            </div>
          ))}
        </div>
      </section>

      <section id="cach-cham" className="scroll-mt-28">
        <h2 className="text-xl font-bold tracking-[-0.03em]">Cách chấm điểm</h2>
        <div className="mt-2 max-w-4xl space-y-2 text-chu-phu">
          <p>
            Mỗi chỉ tiêu được xếp hạng phần trăm: mã tốt nhất gần 100, kém nhất gần 0. Với chỉ tiêu càng thấp càng tốt (nợ vay, nợ xấu, P/E…), thứ hạng được đảo lại. Điểm một trục bằng 1 cộng 9 lần thứ hạng bình quân của các chỉ tiêu trong trục, nên nằm từ 1 đến 10.
          </p>
          <p>
            Sinh lời, chất lượng lợi nhuận và sức khoẻ tài chính chỉ so trong cùng loại hình ({Object.values(TEN_LOAI).join(", ")}), vì ROA 1,5% là cao với ngân hàng nhưng thấp với doanh nghiệp thường. Định giá, tăng trưởng, cổ tức và xu hướng giá so với toàn thị trường.
          </p>
          <p>Fin Rating là bình quân có trọng số của các trục; một mã cần đủ số liệu cho ít nhất 5 trong 7 trục mới được chấm.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {TRUC.map((t) => (
            <div key={t.ma} className="rounded-2xl bg-nen-phu p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold">{t.ten}</h3>
                <span className="text-[13px] text-chu-phu">Trọng số {t.trongSo}%</span>
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] text-chu-phu">
                {CHI_TIEU.filter((c) => c.truc === t.ma).map((c) => (
                  <li key={c.k}>
                    {c.ten}
                    {c.loai ? ` (${c.loai.map((l) => TEN_LOAI[l]).join(", ")})` : ""}
                    {c.tot === "thap" ? ", càng thấp càng tốt" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-4xl text-[13px] text-chu-phu">
          Fin Rating là điểm do Finlo tự tính trên số liệu quá khứ, không phải khuyến nghị mua bán. Điểm phản ánh vị trí tương đối của một mã so với thị trường ở thời điểm chấm, không đảm bảo giá sẽ tăng. Xem thêm{" "}
          <Link href="/thuat-ngu" className="font-semibold text-chu hover:text-nhan">
            từ điển thuật ngữ
          </Link>
          . Dữ liệu từ Mofi.
        </p>
      </section>
    </div>
  );
}
