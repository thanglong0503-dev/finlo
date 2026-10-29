import type { Metadata } from "next";
import Link from "next/link";
import { PhaiSinhTienSo } from "@/components/PhaiSinhTienSo";

export const metadata: Metadata = {
  title: "Phái sinh tiền số",
  description: "Funding rate, Open Interest, tỷ lệ Long/Short, lực mua bán chủ động và thanh lý trực tiếp trên Binance Futures.",
};

const GIAI_THICH = [
  {
    ten: "Funding rate",
    noiDung:
      "Phí hai phe trả cho nhau mỗi kỳ để giá hợp đồng bám giá giao ngay. Dương: phe Long trả phí, thị trường nghiêng về mua. Dương cao kéo dài thường là dấu hiệu quá hưng phấn, dễ có cú giảm quét Long.",
  },
  {
    ten: "Open Interest",
    noiDung:
      "Tổng giá trị hợp đồng đang mở. Giá tăng cùng OI tăng: tiền mới vào mở vị thế. Giá tăng mà OI giảm: chủ yếu do phe Short đóng lệnh. OI tăng nhanh khi giá đi ngang: đòn bẩy đang tích tụ.",
  },
  {
    ten: "Tỷ lệ Long/Short",
    noiDung:
      "Đông tài khoản Long chưa chắc giá sẽ tăng; khi đám đông nghiêng hẳn một phía, thị trường hay đi ngược lại. So với vị thế của top trader để xem nhóm vốn lớn có cùng phía không.",
  },
  {
    ten: "Thanh lý",
    noiDung:
      "Vị thế bị sàn đóng cưỡng bức khi lỗ hết ký quỹ. Thanh lý dồn dập một phía thường xảy ra ở cuối một cú sập hoặc bật mạnh, đôi khi đánh dấu điểm đảo chiều ngắn hạn.",
  },
];

export default function TrangPhaiSinh() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/tai-san-so" className="text-[13px] text-chu-phu hover:text-chu">
        ← Tài sản số
      </Link>
      <h1 className="mt-2 text-[32px] leading-[1.2] font-bold tracking-[-0.035em] sm:text-[40px]">Phái sinh tiền số</h1>
      <p className="mt-1 max-w-3xl text-chu-phu">
        Đòn bẩy trên thị trường đang ở mức nào: funding, Open Interest, tỷ lệ Long/Short và thanh lý theo thời gian thực từ Binance
        Futures, sàn phái sinh tiền số lớn nhất.
      </p>
      <Link href="/lich-su-kien?nhom=quoc-te" className="mt-3 inline-block text-[14px] font-semibold text-nhan hover:underline">
        Lịch họp FED, CPI Mỹ, đáo hạn quyền chọn và halving →
      </Link>

      <PhaiSinhTienSo />

      <section className="mt-10">
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">Đọc các chỉ số thế nào</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {GIAI_THICH.map((g) => (
            <div key={g.ten} className="rounded-2xl border border-vien p-5">
              <h3 className="font-semibold">{g.ten}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-chu-phu">{g.noiDung}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-chu-phu">
          Nguồn: Binance Futures, trình duyệt của bạn lấy trực tiếp và làm mới mỗi phút. Giao dịch phái sinh có đòn bẩy rủi ro rất cao;
          thông tin chỉ để tham khảo, không phải khuyến nghị đầu tư.
        </p>
      </section>
    </div>
  );
}
