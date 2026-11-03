// Phần dùng chung của FL Bắt đáy: lời nhắc miễn trừ và bảng kiểm chứng
import type { DieuKien } from "@/lib/bat-day";
import { THONG_KE_BAT_DAY as TK } from "@/lib/bat-day";
import { mauTangGiam, phanTram } from "@/lib/dinh-dang";

export function KhongKhuyenNghi() {
  return (
    <p className="rounded-2xl border border-dung/40 bg-dung/10 px-4 py-3 leading-relaxed">
      <b>Không phải khuyến nghị đầu tư.</b> Đây là kết quả máy tính theo quy tắc cố định, không xét tình hình tài chính hay khẩu vị rủi ro của riêng bạn và có thể sai. Mọi
      quyết định mua bán do bạn tự cân nhắc và tự chịu trách nhiệm.
    </p>
  );
}

export function DanhSachKiem({ tieuDe, ds }: { tieuDe: string; ds: DieuKien[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-vien">
      <h2 className="flex items-center justify-between border-b border-vien px-4 py-2.5 font-semibold">
        {tieuDe}
        <span className="so text-[12px] font-normal text-chu-phu">
          {ds.reduce((s, d) => s + d.diem, 0)}/{ds.reduce((s, d) => s + d.toiDa, 0)} điểm
        </span>
      </h2>
      <ul>
        {ds.map((d) => (
          <li key={d.ten} className="flex gap-3 border-b border-vien px-4 py-2.5 last:border-b-0">
            <svg viewBox="0 0 16 16" width="16" height="16" className={`mt-0.5 shrink-0 ${d.dat ? "text-tang" : "text-chu-phu"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-label={d.dat ? "Đạt" : "Chưa đạt"}>
              {d.dat ? <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />}
            </svg>
            <span className="min-w-0">
              <span className="font-medium">{d.ten}</span>
              <span className="block text-[12px] text-chu-phu">{d.chiTiet}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const O = ({ x, dau = true }: { x: number; dau?: boolean }) => <span className={`so ${dau ? mauTangGiam(x) : ""}`}>{dau ? phanTram(x) : `${x.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`}</span>;

// Quy tắc từng đúng sai ra sao: hiện cả phần không tốt
export function KiemChung() {
  const hang = [
    { ten: "Lãi trung bình", k: "tb" as const, dau: true },
    { ten: "Lãi trung vị (lệnh ở giữa)", k: "tv" as const, dau: true },
    { ten: "Tỷ lệ có lãi", k: "duong" as const, dau: false },
    { ten: "10% lần tệ nhất lỗ từ", k: "xau10" as const, dau: true },
    { ten: "So với VN-Index cùng kỳ", k: "vuot" as const, dau: true },
    { ten: "Tỷ lệ thắng VN-Index", k: "thangVni" as const, dau: false },
  ];
  return (
    <section id="kiem-chung" className="scroll-mt-20">
      <h2 className="text-xl font-bold tracking-[-0.03em]">Quy tắc này từng đúng sai ra sao</h2>
      <p className="mt-1 max-w-3xl text-chu-phu">
        Chạy lại trên lịch sử, không nhìn trước tương lai: {TK.phamVi}, đo ngày {TK.ngayDo}. Quá khứ không bảo đảm tương lai.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {TK.sauPhien.map((p) => (
          <div key={p.phien} className="overflow-x-auto rounded-2xl border border-vien">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b border-vien text-left text-[12px] text-chu-phu">
                  <th className="px-4 py-2 font-medium">Giữ {p.phien} phiên</th>
                  <th className="px-3 py-2 text-right font-medium">Mọi mã</th>
                  <th className="px-3 py-2 text-right font-medium">Vùng rẻ</th>
                  <th className="px-3 py-2 text-right font-medium">Rẻ + tín hiệu mua</th>
                </tr>
              </thead>
              <tbody>
                {hang.map((h) => (
                  <tr key={h.k} className="border-b border-vien last:border-b-0">
                    <td className="px-4 py-1.5">{h.ten}</td>
                    <td className="px-3 py-1.5 text-right"><O x={p.moiMa[h.k]} dau={h.dau} /></td>
                    <td className="bg-nen-phu px-3 py-1.5 text-right font-semibold"><O x={p.vungRe[h.k]} dau={h.dau} /></td>
                    <td className="px-3 py-1.5 text-right"><O x={p.xacNhan[h.k]} dau={h.dau} /></td>
                  </tr>
                ))}
                <tr className="text-[12px] text-chu-phu">
                  <td className="px-4 py-1.5">Số lần đo</td>
                  <td className="so px-3 py-1.5 text-right">{p.moiMa.n.toLocaleString("vi-VN")}</td>
                  <td className="so px-3 py-1.5 text-right">{p.vungRe.n.toLocaleString("vi-VN")}</td>
                  <td className="so px-3 py-1.5 text-right">{p.xacNhan.n.toLocaleString("vi-VN")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-2xl border border-vien">
          <table className="w-full">
            <thead>
              <tr className="border-b border-vien text-left text-[12px] text-chu-phu">
                <th className="px-4 py-2 font-medium">Giữ 60 phiên, theo năm</th>
                <th className="px-3 py-2 text-right font-medium">Vùng rẻ</th>
                <th className="px-3 py-2 text-right font-medium">Mọi mã</th>
              </tr>
            </thead>
            <tbody>
              {TK.theoNam.map((y) => (
                <tr key={y.nam} className="border-b border-vien last:border-b-0">
                  <td className="so px-4 py-1.5">{y.nam}</td>
                  <td className="px-3 py-1.5 text-right font-semibold"><O x={y.vungRe} /></td>
                  <td className="px-3 py-1.5 text-right"><O x={y.moiMa} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 leading-relaxed">
          <p>
            <b>Vùng rẻ có ích, nhưng không chắc thắng.</b> Lãi trung bình cao hơn hẳn mọi mã, song vẫn có năm âm, gồm cả 2024 và 2026, và cũng chỉ thắng VN-Index dưới một nửa số lần.
          </p>
          <p>
            <b>Tín hiệu mua kỹ thuật không làm tăng lãi.</b> Mua theo tín hiệu kèm cắt lỗ qua <span className="so">{TK.lenhCatLo.n}</span> lệnh giả định: trung bình <O x={TK.lenhCatLo.tb} /> mỗi lệnh sau
            phí, thắng <O x={TK.lenhCatLo.thang} dau={false} />. Lệnh thắng trung bình <O x={TK.lenhCatLo.thangTb} />, lệnh thua trung bình <O x={TK.lenhCatLo.thuaTb} />.
          </p>
          <p>
            <b>Cắt lỗ giới hạn rủi ro, có giá phải trả.</b> Lệnh tệ nhất khi có cắt lỗ là <O x={TK.lenhCatLo.teNhat} />, còn không cắt lỗ từng tới <O x={TK.teNhatKhongCatLo.xacNhan} />.
          </p>
          <p className="text-[12px] text-chu-phu">
            Giới hạn của phép đo: chỉ gồm mã còn niêm yết nên kết quả có thể đẹp hơn thực tế; các lần đo chồng lên nhau và tập trung vào giai đoạn thị trường giảm; giá trị sổ sách tính theo số cổ phiếu hiện tại. Điểm FL Bắt đáy chỉ để xếp thứ tự, không phải xác suất.
          </p>
        </div>
      </div>
    </section>
  );
}
