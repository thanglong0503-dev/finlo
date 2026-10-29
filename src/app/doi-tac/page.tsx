import type { Metadata } from "next";
import { Muc, TrangVanBan } from "@/components/TrangVanBan";
import { EMAIL_LIEN_HE } from "@/lib/menu";
import { FormDoiTac } from "./FormDoiTac";

export const metadata: Metadata = {
  title: "Đối tác",
  description: "Hợp tác cùng Finlo về dữ liệu, nội dung, quảng bá và tích hợp AI.",
};

const HINH_THUC = [
  { ten: "Dữ liệu", moTa: "Cung cấp hoặc trao đổi dữ liệu thị trường, báo cáo phân tích, chỉ số riêng." },
  { ten: "Nội dung", moTa: "Bài phân tích, bản tin, video giáo dục đầu tư hiển thị kèm ghi nguồn." },
  { ten: "Quảng bá", moTa: "Giới thiệu sản phẩm tài chính phù hợp tới nhà đầu tư cá nhân, gắn nhãn rõ ràng." },
  { ten: "Tích hợp AI", moTa: "Dùng Finlo MCP hoặc dữ liệu Finlo trong trợ lý AI nội bộ của tổ chức." },
];

export default function TrangDoiTac() {
  return (
    <TrangVanBan
      duongDan="/doi-tac"
      tieuDe="Cùng Finlo phục vụ nhà đầu tư Việt Nam"
      moTa="Finlo tìm đối tác chung mục tiêu: giúp nhà đầu tư cá nhân tiếp cận dữ liệu rõ ràng, minh bạch, dễ hiểu."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {HINH_THUC.map((h, i) => (
          <div key={h.ten} className="rounded-3xl bg-nen-phu p-6">
            <p className="so text-[13px] font-semibold text-nhan">0{i + 1}</p>
            <h2 className="mt-2 text-[20px] font-bold tracking-[-0.02em]">{h.ten}</h2>
            <p className="mt-2 text-[14px] text-chu-phu">{h.moTa}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">Gửi đề xuất hợp tác</h2>
        <p className="mt-1 text-chu-phu">
          Điền vài dòng, Finlo sẽ soạn sẵn email gửi tới <b className="text-chu">{EMAIL_LIEN_HE}</b>. Bạn xem lại rồi bấm gửi trong
          ứng dụng thư của mình.
        </p>
        <FormDoiTac email={EMAIL_LIEN_HE} hinhThuc={HINH_THUC.map((h) => h.ten)} />
      </section>

      <Muc tieuDe="Nguyên tắc hợp tác">
        <ul>
          <li>Nội dung tài trợ luôn được gắn nhãn, tách bạch với dữ liệu thị trường.</li>
          <li>Finlo không nhận quảng bá cam kết lợi nhuận, đa cấp hay sản phẩm không được cấp phép.</li>
          <li>Dữ liệu người dùng không được chia sẻ cho đối tác.</li>
        </ul>
      </Muc>
    </TrangVanBan>
  );
}
