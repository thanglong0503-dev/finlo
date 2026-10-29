import type { Metadata } from "next";
import Link from "next/link";
import { Muc, TrangVanBan } from "@/components/TrangVanBan";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "Finlo là nền tảng theo dõi chứng khoán, kim loại quý và tài sản số miễn phí cho nhà đầu tư cá nhân Việt Nam.",
};

const TINH_NANG = [
  { ten: "Bảng giá và tổng quan thị trường", moTa: "Hơn 1.500 mã HOSE, HNX, UPCOM, chỉ số, độ rộng, khối ngoại, bản đồ ngành.", href: "/bang-gia" },
  { ten: "Phân tích từng mã", moTa: "Hồ sơ doanh nghiệp, báo cáo tài chính, phân tích kỹ thuật, so sánh ngành, giao dịch nội bộ, giả định đầu tư.", href: "/co-phieu/FPT" },
  { ten: "Biểu đồ kỹ thuật", moTa: "Hơn 30 chỉ báo có tham số chỉnh được, bộ chỉ báo riêng FL và các bộ mẫu bật một chạm.", href: "/bieu-do" },
  { ten: "Bộ lọc, so sánh, lịch sự kiện", moTa: "Lọc theo định giá và tăng trưởng, chồng nhiều mã trên một biểu đồ, lịch cổ tức và đáo hạn.", href: "/bo-loc" },
  { ten: "Tài sản khác", moTa: "Tài sản số theo thời gian thực từ Binance, giá vàng các thương hiệu lớn.", href: "/tai-san-so" },
  { ten: "Ứng dụng cài được", moTa: "Cài Finlo lên máy tính và điện thoại như một ứng dụng riêng, không cần kho ứng dụng.", href: "/#cai-app" },
];

export default function TrangGioiThieu() {
  return (
    <TrangVanBan
      duongDan="/gioi-thieu"
      tieuDe="Về Finlo"
      moTa="Finlo là nền tảng theo dõi đa lớp tài sản cho nhà đầu tư cá nhân Việt Nam: chứng khoán, kim loại quý và tài sản số trên cùng một màn hình, miễn phí và không cần tài khoản."
    >
      <Muc tieuDe="Finlo làm gì">
        <div className="grid gap-3 sm:grid-cols-2">
          {TINH_NANG.map((t) => (
            <Link key={t.ten} href={t.href} className="rounded-2xl border border-vien bg-nen-phu p-5 hover:border-nhan/50">
              <p className="font-semibold text-chu">{t.ten}</p>
              <p className="mt-1 text-[14px]">{t.moTa}</p>
            </Link>
          ))}
        </div>
      </Muc>

      <Muc tieuDe="Nguyên tắc">
        <ul>
          <li>
            <b>Miễn phí, không cần đăng ký.</b> Mọi tính năng dùng được ngay.
          </li>
          <li>
            <b>Riêng tư.</b> Danh mục theo dõi, lựa chọn chỉ báo và giao diện lưu ngay trên trình duyệt của bạn, không gửi lên máy chủ.
          </li>
          <li>
            <b>Minh bạch cách tính.</b> Mỗi chỉ báo và con số đều có giải thích; chỉ báo định giá chỉ dùng báo cáo đã công bố tại từng thời
            điểm.
          </li>
          <li>
            <b>Thông tin, không phải lời khuyên.</b> Finlo cung cấp dữ liệu và công cụ; quyết định đầu tư là của bạn.
          </li>
        </ul>
      </Muc>

      <Muc tieuDe="Nguồn dữ liệu">
        <ul>
          <li>Giá chứng khoán, chỉ số, báo cáo tài chính, tin doanh nghiệp, giao dịch nội bộ, lãi suất: kho dữ liệu Mofi (data.mofi.vn).</li>
          <li>Tài sản số: Binance, cập nhật theo thời gian thực.</li>
          <li>Giá vàng: tổng hợp từ các thương hiệu lớn và giá thế giới.</li>
        </ul>
        <p>Bảng giá cổ phiếu cập nhật mỗi phút trong giờ giao dịch nên có thể chậm hơn bảng điện của công ty chứng khoán vài chục giây.</p>
      </Muc>
    </TrangVanBan>
  );
}
