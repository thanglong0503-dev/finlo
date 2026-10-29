import type { Metadata } from "next";
import { Muc, TrangVanBan } from "@/components/TrangVanBan";
import { EMAIL_LIEN_HE } from "@/lib/menu";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Góp ý, báo lỗi dữ liệu hoặc hợp tác với Finlo.",
};

export default function TrangLienHe() {
  return (
    <TrangVanBan
      duongDan="/lien-he"
      tieuDe="Liên hệ"
      moTa="Finlo được phát triển và cải thiện liên tục dựa trên góp ý của người dùng. Mọi phản hồi đều được đọc."
    >
      <div className="rounded-3xl border border-vien bg-nen-phu p-8">
        <p className="text-chu-phu">Email</p>
        <a href={`mailto:${EMAIL_LIEN_HE}`} className="mt-1 block text-[24px] font-bold break-all text-chu hover:text-nhan">
          {EMAIL_LIEN_HE}
        </a>
        <p className="mt-2 text-[14px] text-chu-phu">Thường phản hồi trong 1–2 ngày làm việc.</p>
      </div>

      <Muc tieuDe="Bạn có thể gửi">
        <ul>
          <li>
            <b>Báo lỗi dữ liệu:</b> mã cổ phiếu, trang đang xem, con số sai và giá trị đúng (nếu biết), kèm ảnh chụp màn hình.
          </li>
          <li>
            <b>Lỗi hiển thị:</b> thiết bị (máy tính/điện thoại), trình duyệt và mô tả ngắn.
          </li>
          <li>
            <b>Góp ý tính năng:</b> bạn muốn Finlo có thêm gì để theo dõi thị trường dễ hơn.
          </li>
          <li>
            <b>Hợp tác:</b> dữ liệu, nội dung, quảng bá (xem trang <a href="/doi-tac" className="text-chu underline">Đối tác</a>).
          </li>
        </ul>
      </Muc>

      <Muc tieuDe="Lưu ý">
        <p>Finlo không tư vấn đầu tư và không trả lời câu hỏi nên mua hay bán mã nào.</p>
      </Muc>
    </TrangVanBan>
  );
}
