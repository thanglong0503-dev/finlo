import type { Metadata } from "next";
import Link from "next/link";
import { BangXepHang, type CotXH, type DongXH } from "@/components/fin-rating/BangXepHang";
import duLieu from "@/data/fin-rating.json";
import { TRUC, type KetQuaFinRating } from "@/lib/fin-rating";

const kq = duLieu as unknown as KetQuaFinRating;
const iCoTuc = TRUC.findIndex((t) => t.ma === "ct");
// Trên mức này thường là số hợp nhất gồm cổ tức trả cho cổ đông thiểu số hoặc chia dồn nhiều đợt: tách riêng để đối chiếu
const TY_SUAT_NGHI_VAN = 15;

export const metadata: Metadata = {
  title: "Cổ phiếu cổ tức — Xếp hạng tỷ suất và độ đều đặn",
  description: "Xếp hạng cổ phiếu trả cổ tức tiền mặt theo tỷ suất, số năm trả đều trong 5 năm, tỷ lệ chi trả trên lợi nhuận và điểm Fin Rating.",
};

const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const pt = (x: number) => `${x.toLocaleString("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;

export default function TrangCoTuc() {
  const tenNganh = Object.fromEntries(Object.entries(kq.nganh).map(([k, v]) => [k, v.ten]));
  const coTra = kq.ds.filter((d) => d.coTucCp > 0 && d.gia > 0);
  const tra = coTra.filter((d) => (d.coTucCp / d.gia) * 100 <= TY_SUAT_NGHI_VAN);
  const nghiVan = coTra.filter((d) => (d.coTucCp / d.gia) * 100 > TY_SUAT_NGHI_VAN && d.giaTri20 >= 1e9).sort((a, b) => b.coTucCp / b.gia - a.coTucCp / a.gia);
  const dong: DongXH[] = tra.map((d) => ({
    ma: d.ma,
    ten: d.ten,
    san: d.san,
    nganh: d.nganh,
    so: {
      tySuat: (d.coTucCp / d.gia) * 100,
      coTucCp: d.coTucCp,
      soNamTra: d.soNamTra,
      chiTra: d.chiTra,
      ct: d.truc[iCoTuc],
      diem: d.diem,
      gia: d.gia,
      gtgd: d.giaTri20,
    },
  }));
  const cot: CotXH[] = [
    { khoa: "tySuat", nhan: "Tỷ suất", kieu: "pt", goiY: "Cổ tức tiền mặt đã trả 4 quý gần nhất chia giá" },
    { khoa: "coTucCp", nhan: "Cổ tức/cp (đồng)", kieu: "so" },
    { khoa: "soNamTra", nhan: "Năm trả", kieu: "nam", goiY: "Số năm có trả cổ tức tiền mặt trong 5 năm gần nhất" },
    { khoa: "chiTra", nhan: "Chi trả/lãi", kieu: "pt", goiY: "Cổ tức tiền mặt trên lợi nhuận 4 quý" },
    { khoa: "ct", nhan: "Điểm cổ tức", kieu: "diem", goiY: "Trục Cổ tức và cổ đông của Fin Rating" },
    { khoa: "diem", nhan: "Fin Rating", kieu: "diem" },
    { khoa: "gia", nhan: "Giá", kieu: "gia" },
  ];
  const deu = tra.filter((d) => d.soNamTra >= 5);
  const thanhKhoan = tra.filter((d) => d.giaTri20 >= 1e9).map((d) => (d.coTucCp / d.gia) * 100).sort((a, b) => a - b);
  const trungVi = thanhKhoan.length ? thanhKhoan[Math.floor(thanhKhoan.length / 2)] : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-8 pb-12">
      <div>
        <p className="nhan-muc">Tìm cơ hội</p>
        <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Cổ phiếu cổ tức</h1>
        <p className="mt-2 max-w-3xl text-chu-phu">
          Các mã trả cổ tức tiền mặt, xếp theo tỷ suất, độ đều đặn trong 5 năm và mức chi trả so với lợi nhuận. Chi trả quá 100% lợi nhuận nghĩa là đang chia cả lãi tích luỹ, khó giữ lâu. Số liệu theo phiên {ngayVN(kq.ngay)}, cập nhật mỗi tuần.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Mã trả cổ tức tiền mặt</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{coTra.length.toLocaleString("vi-VN")}</p>
          <p className="text-[12px] text-chu-phu">trong {kq.soMa.toLocaleString("vi-VN")} mã được chấm</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Trả đều 5/5 năm</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{deu.length.toLocaleString("vi-VN")}</p>
          <p className="text-[12px] text-chu-phu">mã</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Tỷ suất trung vị</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{trungVi != null ? pt(trungVi) : "—"}</p>
          <p className="text-[12px] text-chu-phu">mã giao dịch từ 1 tỷ/phiên</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Tỷ suất từ 6% trở lên</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{thanhKhoan.filter((x) => x >= 6).length}</p>
          <p className="text-[12px] text-chu-phu">mã giao dịch từ 1 tỷ/phiên</p>
        </div>
      </div>

      <BangXepHang
        dong={dong}
        cot={cot}
        sapXepDau="tySuat"
        tenNganh={tenNganh}
        thanhKhoanDau={1e9}
        locSo={{
          khoa: "soNamTra",
          nhan: "Số năm trả",
          macDinh: 4,
          muc: [
            { gt: 0, nhan: "Mọi số năm trả" },
            { gt: 3, nhan: "Trả từ 3/5 năm" },
            { gt: 4, nhan: "Trả từ 4/5 năm" },
            { gt: 5, nhan: "Trả đủ 5/5 năm" },
          ],
        }}
      />

      {nghiVan.length > 0 && (
        <div className="rounded-2xl bg-nen-phu p-4 text-[14px]">
          <p className="font-semibold">Cần đối chiếu trước khi dùng</p>
          <p className="mt-1 text-chu-phu">
            Các mã sau có tỷ suất tính ra trên {TY_SUAT_NGHI_VAN}% nên không đưa vào bảng xếp hạng. Thường là do chia dồn nhiều đợt trong 4 quý hoặc con số hợp nhất gồm cả cổ tức công ty con trả cho cổ đông thiểu số.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {nghiVan.map((d) => (
              <Link key={d.ma} href={`/co-phieu/${d.ma}/phan-tich`} prefetch={false} className="rounded-full border border-vien px-3 py-1 text-[13px] hover:text-nhan">
                <span className="font-semibold">{d.ma}</span> <span className="text-chu-phu tabular-nums">{pt((d.coTucCp / d.gia) * 100)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-4xl space-y-2 text-[13px] text-chu-phu">
        <p>
          Tỷ suất tính bằng tổng cổ tức tiền mặt trên báo cáo lưu chuyển tiền tệ 4 quý gần nhất chia cho số cổ phiếu và giá. Số cổ phiếu đã được điều chỉnh theo các đợt thưởng, chia cổ phiếu trong năm. Nên đối chiếu thêm với{" "}
          <Link href="/lich-su-kien" className="font-semibold text-chu hover:text-nhan">
            lịch chốt quyền
          </Link>{" "}
          trước khi dùng.
        </p>
        <p>Cổ tức đã trả không đảm bảo năm sau trả tương tự. Không phải khuyến nghị đầu tư. Dữ liệu từ Mofi.</p>
      </div>
    </div>
  );
}
