import type { Metadata } from "next";
import Link from "next/link";
import { Muc, TrangVanBan } from "@/components/TrangVanBan";

export const metadata: Metadata = {
  title: "Finlo MCP",
  description: "Hỏi Claude về chứng khoán Việt Nam, ngân hàng, tiền số bằng dữ liệu của Finlo qua 20 công cụ MCP.",
};

// Trang giới thiệu, chỉ mô tả công cụ. Máy chủ MCP chạy nội bộ: không đăng địa chỉ, cấu hình hay bản cài ở đây.
type CongCu = { ten: string; ma: string; moTa: string; viDu: string };

const NHOM: { ten: string; moTa: string; congCu: CongCu[] }[] = [
  {
    ten: "Tra cứu và giá",
    moTa: "Tìm mã, xem giá, lịch sử giao dịch và chỉ số thị trường.",
    congCu: [
      { ten: "Tìm mã", ma: "tim_ma", moTa: "Tìm mã cổ phiếu theo tên công ty, không cần gõ dấu.", viDu: "Mã của Sữa Việt Nam là gì?" },
      { ten: "Bảng giá", ma: "bang_gia", moTa: "Giá, thay đổi, khối lượng, khối ngoại; lọc theo sàn, sắp xếp tăng/giảm mạnh.", viDu: "10 mã HOSE tăng mạnh nhất hôm nay" },
      { ten: "Thông tin mã", ma: "thong_tin_ma", moTa: "Giá hiện tại, P/E, P/B, ROE, vốn hoá, ngành của một mã.", viDu: "FPT đang có P/E bao nhiêu?" },
      { ten: "Lịch sử giá", ma: "lich_su_gia", moTa: "Giá mở, cao, thấp, đóng cửa và khối lượng theo phiên.", viDu: "Giá HPG 20 phiên gần nhất" },
      { ten: "Chỉ số thị trường", ma: "chi_so_thi_truong", moTa: "VN-INDEX, VN30, HNX, UPCOM: điểm, thay đổi tuần, tháng, năm.", viDu: "VN-INDEX tháng này thế nào?" },
    ],
  },
  {
    ten: "Phân tích",
    moTa: "Các phép tính Finlo dùng trên biểu đồ và bộ lọc, nay hỏi được bằng lời.",
    congCu: [
      { ten: "Phân tích kỹ thuật", ma: "phan_tich_ky_thuat", moTa: "Xu hướng, RSI, MACD, đường trung bình, hỗ trợ và kháng cự.", viDu: "VCB đang ở xu hướng nào?" },
      { ten: "Định giá FL", ma: "dinh_gia_fl", moTa: "Vùng giá rẻ, hợp lý, đắt theo lịch sử P/E và P/B của chính mã đó.", viDu: "FPT đang rẻ hay đắt so với lịch sử?" },
      { ten: "Lọc cổ phiếu", ma: "loc_co_phieu", moTa: "Lọc theo P/E, P/B, ROE, tăng trưởng, cổ tức, vốn hoá.", viDu: "Mã có ROE trên 20% và P/E dưới 10" },
      { ten: "So sánh ngành", ma: "so_sanh_nganh", moTa: "Đặt một mã cạnh các doanh nghiệp cùng ngành và trung vị ngành.", viDu: "So VCB với các ngân hàng khác" },
      { ten: "So sánh mã", ma: "so_sanh_ma", moTa: "Hiệu suất, mức sụt sâu nhất, độ biến động của tối đa 5 mã hoặc chỉ số.", viDu: "So FPT, VCB và VN-INDEX trong 1 năm" },
      { ten: "Giả định đầu tư", ma: "gia_dinh_dau_tu", moTa: "Nếu đã đầu tư từ N năm trước thì nay được bao nhiêu, so với VN-INDEX và gửi tiết kiệm.", viDu: "Bỏ 100 triệu vào FPT từ 5 năm trước thì giờ ra sao?" },
    ],
  },
  {
    ten: "Doanh nghiệp",
    moTa: "Hồ sơ và số liệu từ báo cáo tài chính.",
    congCu: [
      { ten: "Hồ sơ doanh nghiệp", ma: "ho_so_doanh_nghiep", moTa: "Ngành nghề, ban lãnh đạo, cổ đông lớn, lịch sử doanh thu và lợi nhuận.", viDu: "Cổ đông lớn của FPT là ai?" },
      { ten: "Báo cáo tài chính", ma: "bao_cao_tai_chinh", moTa: "Kết quả kinh doanh, cân đối kế toán, lưu chuyển tiền tệ theo quý.", viDu: "Lợi nhuận MWG 4 quý gần nhất" },
      { ten: "Giao dịch nội bộ", ma: "giao_dich_noi_bo", moTa: "Lãnh đạo, cổ đông lớn mua bán cổ phiếu; tổng mua ròng 12 tháng.", viDu: "Lãnh đạo HPG có mua vào gần đây không?" },
      { ten: "Tin doanh nghiệp", ma: "tin_doanh_nghiep", moTa: "Công bố thông tin: cổ tức, đại hội cổ đông, nhân sự.", viDu: "VNM có công bố gì mới?" },
    ],
  },
  {
    ten: "Ngành tài chính",
    moTa: "Tổng hợp từ báo cáo tài chính quý của các ngân hàng và công ty chứng khoán niêm yết.",
    congCu: [
      { ten: "Ngân hàng", ma: "ngan_hang", moTa: "Huy động, cho vay, tăng trưởng tín dụng, nợ xấu, nợ nhóm 2 từng ngân hàng.", viDu: "Ngân hàng nào nợ xấu thấp nhất?" },
      { ten: "Công ty chứng khoán", ma: "cong_ty_chung_khoan", moTa: "Dư nợ cho vay ký quỹ, danh mục tự doanh, doanh thu môi giới.", viDu: "Công ty chứng khoán nào cho vay ký quỹ nhiều nhất?" },
    ],
  },
  {
    ten: "Tin tức, lịch và tiền số",
    moTa: "Bức tranh rộng hơn ngoài từng mã cổ phiếu.",
    congCu: [
      { ten: "Tin báo chí", ma: "tin_bao_chi", moTa: "Tin mới từ CafeF, Vietstock, VnEconomy, gắn mã được nhắc tới.", viDu: "Báo chí nói gì về FPT hôm nay?" },
      { ten: "Lịch sự kiện", ma: "lich_su_kien", moTa: "Nghỉ lễ, đáo hạn phái sinh, hạn báo cáo tài chính, cổ tức, đại hội.", viDu: "Tháng tới có sự kiện gì đáng chú ý?" },
      { ten: "Thị trường tiền số", ma: "thi_truong_tien_so", moTa: "Vốn hoá, tỷ trọng BTC, chỉ số Sợ hãi & Tham lam, đồng tăng giảm mạnh.", viDu: "Tuần này coin nào tăng mạnh nhất?" },
      { ten: "Phái sinh tiền số", ma: "phai_sinh_tien_so", moTa: "Funding, Open Interest, tỷ lệ Long/Short, funding cao nhất toàn thị trường.", viDu: "Funding BTC đang dương hay âm?" },
    ],
  },
];

const TONG = NHOM.reduce((s, n) => s + n.congCu.length, 0);

export default function TrangMcp() {
  return (
    <TrangVanBan
      duongDan="/mcp"
      tieuDe="Hỏi Claude bằng dữ liệu Finlo"
      moTa={`Finlo MCP nối trợ lý AI Claude với dữ liệu của Finlo qua ${TONG} công cụ. Bạn hỏi bằng tiếng Việt thông thường, Claude tự chọn công cụ, lấy số liệu mới nhất rồi trả lời kèm con số.`}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { so: String(TONG), nhan: "công cụ chỉ đọc dữ liệu" },
          { so: "1.500+", nhan: "mã HOSE, HNX, UPCOM" },
          { so: "0", nhan: "thao tác đặt lệnh hay sửa dữ liệu" },
        ].map((o) => (
          <div key={o.nhan} className="rounded-3xl bg-nen-phu p-6">
            <p className="so text-[32px] leading-none font-bold tracking-[-0.03em]">{o.so}</p>
            <p className="mt-2 text-[14px] text-chu-phu">{o.nhan}</p>
          </div>
        ))}
      </div>

      <Muc tieuDe="MCP là gì">
        <p>
          MCP (Model Context Protocol) là chuẩn mở để trợ lý AI dùng được công cụ bên ngoài. Thay vì trả lời theo trí nhớ có thể đã cũ,
          Claude gọi công cụ của Finlo để lấy giá, chỉ số tài chính, tin tức tại thời điểm hỏi.
        </p>
      </Muc>

      <section>
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">Ví dụ một cuộc hỏi</h2>
        <div className="mt-4 space-y-3 rounded-3xl bg-nen-phu p-5 sm:p-6">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-chu px-4 py-2.5 text-nen">
            So sánh FPT, VCB và VN-INDEX trong 1 năm qua, mã nào sụt sâu nhất?
          </div>
          <p className="text-[12px] font-medium tracking-wide text-chu-phu uppercase">Claude dùng công cụ: so_sanh_ma</p>
          <div className="w-fit max-w-[92%] rounded-2xl border border-vien px-4 py-3 text-chu">
            Trong 365 ngày, VN-INDEX tăng khoảng 5%, VCB giảm khoảng 5%, FPT giảm khoảng 42%. FPT cũng có mức sụt sâu nhất từ đỉnh,
            khoảng 45%, và biến động mạnh nhất trong ba mã.
          </div>
          <p className="text-[12px] text-chu-phu">Số liệu minh hoạ tại thời điểm viết trang này.</p>
        </div>
      </section>

      {NHOM.map((n) => (
        <section key={n.ten}>
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">{n.ten}</h2>
          <p className="mt-1 text-chu-phu">{n.moTa}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {n.congCu.map((c) => (
              <div key={c.ma} className="flex flex-col rounded-2xl bg-nen-phu p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="text-[16px] font-semibold">{c.ten}</h3>
                  <code className="text-[12px] text-chu-phu">{c.ma}</code>
                </div>
                <p className="mt-2 text-[14px] text-chu-phu">{c.moTa}</p>
                <p className="mt-auto pt-3 text-[14px] text-chu">
                  <span className="text-nhan">Hỏi thử: </span>
                  {c.viDu}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <Muc tieuDe="Phạm vi sử dụng">
        <ul>
          <li>
            <b>Đang dùng nội bộ.</b> Finlo MCP hiện chạy riêng cho đội ngũ Finlo, chưa mở cho công chúng. Trang này chỉ giới thiệu
            tính năng; Finlo không cung cấp địa chỉ máy chủ hay bản cài đặt công khai.
          </li>
          <li>
            <b>Chỉ đọc.</b> Mọi công cụ chỉ lấy dữ liệu công khai đã có trên Finlo, không đặt lệnh, không truy cập tài khoản chứng khoán.
          </li>
          <li>
            <b>Không phải khuyến nghị.</b> Câu trả lời của AI dựa trên số liệu tham khảo, có thể trễ hoặc sai; hãy tự kiểm tra trước khi
            quyết định đầu tư.
          </li>
        </ul>
      </Muc>

      <div className="flex flex-col items-start gap-4 rounded-3xl border border-vien p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-[20px] font-bold tracking-[-0.02em]">Muốn tích hợp cho tổ chức của bạn?</p>
          <p className="mt-1 text-chu-phu">Công ty chứng khoán, quỹ, đơn vị nội dung có thể liên hệ để trao đổi hợp tác.</p>
        </div>
        <Link href="/doi-tac" className="h-11 shrink-0 rounded-full bg-chu px-6 leading-11 font-semibold text-nen hover:opacity-90">
          Trở thành đối tác
        </Link>
      </div>
    </TrangVanBan>
  );
}
