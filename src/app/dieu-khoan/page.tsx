import type { Metadata } from "next";
import { Muc, TrangVanBan } from "@/components/TrangVanBan";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều khoản sử dụng và chính sách quyền riêng tư của Finlo.",
};

export default function TrangDieuKhoan() {
  return (
    <TrangVanBan
      duongDan="/dieu-khoan"
      tieuDe="Điều khoản sử dụng"
      moTa="Khi dùng Finlo (finlo.id.vn và ứng dụng cài từ trang này), bạn đồng ý với các điều khoản dưới đây. Cập nhật lần cuối: tháng 10/2026."
    >
      <Muc tieuDe="1. Không phải khuyến nghị đầu tư">
        <p>
          Mọi số liệu, biểu đồ, chỉ báo, tín hiệu và nhận định trên Finlo chỉ nhằm mục đích <b>cung cấp thông tin và tham khảo</b>. Finlo
          không phải công ty chứng khoán hay đơn vị tư vấn đầu tư, không đưa ra khuyến nghị mua, bán hay nắm giữ bất kỳ tài sản nào.
        </p>
        <p>Bạn tự chịu trách nhiệm với quyết định đầu tư của mình. Kết quả trong quá khứ không bảo đảm cho kết quả trong tương lai.</p>
      </Muc>

      <Muc tieuDe="2. Dữ liệu và độ chính xác">
        <ul>
          <li>Dữ liệu được tổng hợp từ các nguồn bên thứ ba (Mofi, Binance, các thương hiệu vàng) và có thể chậm, thiếu hoặc sai sót.</li>
          <li>Giá cổ phiếu cập nhật theo chu kỳ khoảng một phút trong giờ giao dịch, không phải theo thời gian thực.</li>
          <li>Lịch sự kiện, lịch nghỉ lễ có mục ghi &quot;dự kiến&quot; cần đối chiếu với thông báo chính thức của Sở giao dịch và doanh nghiệp.</li>
          <li>Finlo không bảo đảm dịch vụ luôn hoạt động liên tục, không gián đoạn.</li>
        </ul>
      </Muc>

      <Muc tieuDe="3. Quyền riêng tư">
        <ul>
          <li>Finlo không yêu cầu tài khoản và không thu thập họ tên, số điện thoại hay email của bạn.</li>
          <li>
            Danh mục theo dõi, chỉ báo đang bật, tham số chỉ báo và giao diện sáng/tối được lưu trong <b>bộ nhớ trình duyệt của bạn</b>{" "}
            (localStorage). Xoá dữ liệu trang web trong trình duyệt là xoá hết các lựa chọn này.
          </li>
          <li>Finlo không dùng cookie quảng cáo hay theo dõi bạn sang trang web khác.</li>
          <li>Máy chủ lưu trữ (Vercel) có thể ghi nhật ký kỹ thuật như địa chỉ IP và thời điểm truy cập để vận hành và chống lạm dụng.</li>
        </ul>
      </Muc>

      <Muc tieuDe="4. Sử dụng hợp lý">
        <ul>
          <li>
            Không dùng bot, script hay công cụ tự động để thu thập, sao chép hoặc phân phối lại dữ liệu từ Finlo (kể cả qua các đường dẫn
            /api), và không dùng dữ liệu của Finlo để huấn luyện mô hình AI. Finlo có thể chặn truy cập vi phạm mà không cần báo trước.
          </li>
          <li>Muốn dùng dữ liệu cho sản phẩm hoặc tổ chức của bạn, vui lòng liên hệ qua trang Đối tác.</li>
          <li>Không sao chép giao diện, thương hiệu Finlo (tên, logo FL) để giả mạo hoặc dùng cho mục đích thương mại khi chưa được đồng ý.</li>
          <li>Dữ liệu gốc thuộc quyền của các nhà cung cấp tương ứng.</li>
        </ul>
      </Muc>

      <Muc tieuDe="5. Giới hạn trách nhiệm">
        <p>
          Finlo và người vận hành không chịu trách nhiệm cho bất kỳ thiệt hại, thua lỗ trực tiếp hay gián tiếp nào phát sinh từ việc sử
          dụng hoặc không thể sử dụng thông tin, công cụ trên Finlo.
        </p>
      </Muc>

      <Muc tieuDe="6. Thay đổi điều khoản">
        <p>Điều khoản có thể được cập nhật theo thời gian; phiên bản mới có hiệu lực khi đăng trên trang này.</p>
      </Muc>
    </TrangVanBan>
  );
}
