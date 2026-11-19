import type { Metadata } from "next";
import { BangXepHang, type CotXH, type DongXH } from "@/components/fin-rating/BangXepHang";
import duLieu from "@/data/fin-rating.json";
import { TRUC, type KetQuaFinRating } from "@/lib/fin-rating";

const kq = duLieu as unknown as KetQuaFinRating;
const iDinhGia = TRUC.findIndex((t) => t.ma === "dg");

// Chỉ xếp hạng khi mô hình có đủ căn cứ: từ 3 phương pháp trở lên và giá trị không quá xa giá
const SO_PP_TOI_THIEU = 3;
const BOI_TOI_DA = 3;
const BOI_TOI_THIEU = 0.25;

export const metadata: Metadata = {
  title: "Xếp hạng định giá — Giá so với giá trị ước tính",
  description: "Xếp hạng cổ phiếu theo khoảng cách giữa giá thị trường và giá trị ước tính của mô hình định giá Finlo (DCF, thu nhập thặng dư, bội số lịch sử, P/E ngành). Kết quả mô hình, không phải khuyến nghị.",
};

const ngayVN = (giay: number) => new Date(giay * 1000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export default function TrangXepHangDinhGia() {
  const tenNganh = Object.fromEntries(Object.entries(kq.nganh).map(([k, v]) => [k, v.ten]));
  const coGia = kq.ds.filter((d) => d.giaTri != null && d.giaTri > 0);
  const hopLe = coGia.filter((d) => d.soPp >= SO_PP_TOI_THIEU && d.giaTri! / d.gia <= BOI_TOI_DA && d.giaTri! / d.gia >= BOI_TOI_THIEU);
  const dong: DongXH[] = hopLe.map((d) => ({
    ma: d.ma,
    ten: d.ten,
    san: d.san,
    nganh: d.nganh,
    so: {
      tiemNang: (d.giaTri! / d.gia - 1) * 100,
      giaTri: d.giaTri,
      thap: d.giaTriThap,
      cao: d.giaTriCao,
      gia: d.gia,
      pe: d.pe,
      pb: d.pb,
      soPp: d.soPp,
      dg: d.truc[iDinhGia],
      diem: d.diem,
      gtgd: d.giaTri20,
    },
  }));
  const cot: CotXH[] = [
    { khoa: "tiemNang", nhan: "Chênh lệch", kieu: "pt-dau", goiY: "Giá trị ước tính so với giá; dương là giá đang thấp hơn giá trị mô hình" },
    { khoa: "giaTri", nhan: "Giá trị ước tính", kieu: "gia" },
    { khoa: "thap", nhan: "Vùng thấp", kieu: "gia" },
    { khoa: "cao", nhan: "Vùng cao", kieu: "gia" },
    { khoa: "gia", nhan: "Giá", kieu: "gia" },
    { khoa: "pe", nhan: "P/E", kieu: "lan" },
    { khoa: "pb", nhan: "P/B", kieu: "lan" },
    { khoa: "soPp", nhan: "Số PP", kieu: "so", goiY: "Số phương pháp định giá được tính vào giá trị tổng hợp" },
    { khoa: "dg", nhan: "Điểm định giá", kieu: "diem", goiY: "Trục Định giá của Fin Rating" },
    { khoa: "diem", nhan: "Fin Rating", kieu: "diem" },
  ];
  const thanhKhoan = hopLe.filter((d) => d.giaTri20 >= 1e9);
  const duoiThap = thanhKhoan.filter((d) => d.giaTriThap != null && d.gia < d.giaTriThap).length;
  const trenCao = thanhKhoan.filter((d) => d.giaTriCao != null && d.gia > d.giaTriCao).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-8 pb-12">
      <div>
        <p className="nhan-muc">Tìm cơ hội</p>
        <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Xếp hạng định giá</h1>
        <p className="mt-2 max-w-3xl text-chu-phu">
          Giá thị trường so với giá trị ước tính của mô hình định giá Finlo, cùng mô hình ở trang Phân tích của từng mã: DCF hoặc thu nhập thặng dư, P/E, P/B, EV/EBITDA theo lịch sử, P/E ngành và chiết khấu cổ tức. Số liệu theo phiên {ngayVN(kq.ngay)}, cập nhật mỗi tuần.
        </p>
      </div>

      <p className="rounded-2xl border border-dung/40 bg-nen-phu px-4 py-3 text-[14px]">
        Đây là kết quả mô hình trên số liệu quá khứ với giả định mặc định, không phải khuyến nghị mua bán. Chênh lệch lớn thường có lý do: lợi nhuận đột biến một lần, doanh nghiệp đang gặp khó, hoặc ngành chu kỳ ở đỉnh. Hãy mở trang Phân tích của mã để xem từng phương pháp và tự chỉnh giả định.
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Mã đủ điều kiện xếp hạng</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{hopLe.length.toLocaleString("vi-VN")}</p>
          <p className="text-[12px] text-chu-phu">từ {SO_PP_TOI_THIEU} phương pháp trở lên</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Giá dưới cận thấp</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{duoiThap}</p>
          <p className="text-[12px] text-chu-phu">mã giao dịch từ 1 tỷ/phiên</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Giá trên cận cao</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{trenCao}</p>
          <p className="text-[12px] text-chu-phu">mã giao dịch từ 1 tỷ/phiên</p>
        </div>
        <div className="rounded-2xl bg-nen-phu p-4">
          <p className="text-chu-phu">Không xếp hạng</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums">{(coGia.length - hopLe.length).toLocaleString("vi-VN")}</p>
          <p className="text-[12px] text-chu-phu">thiếu phương pháp hoặc lệch quá xa giá</p>
        </div>
      </div>

      <BangXepHang dong={dong} cot={cot} sapXepDau="tiemNang" tenNganh={tenNganh} duoiLienKet="/phan-tich" thanhKhoanDau={1e9} />

      <p className="max-w-4xl text-[13px] text-chu-phu">
        Bảng bỏ qua mã có dưới {SO_PP_TOI_THIEU} phương pháp tính được, và mã có giá trị ước tính cao hơn {BOI_TOI_DA} lần hoặc thấp hơn {BOI_TOI_THIEU * 100}% giá: ở các mức đó mô hình thường đang đọc sai số liệu (tái cấu trúc, lợi nhuận bất thường) hơn là giá thật sự rẻ hay đắt. Dữ liệu từ Mofi.
      </p>
    </div>
  );
}
