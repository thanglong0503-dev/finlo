// Cấu trúc menu: nhóm -> trang. Dùng chung cho header (client), footer (server) và ô tra cứu.
// Thêm trang mới chỉ cần thêm vào một nhóm, header không dài thêm.

export type TrangMenu = { href: string; nhan: string; moTa: string; tuKhoa?: string };
export type NhomMenu = { ten: string; trang: TrangMenu[] };

export const NHOM_MENU: NhomMenu[] = [
  {
    ten: "Thị trường",
    trang: [
      { href: "/", nhan: "Tổng quan", moTa: "Chỉ số, độ rộng, mã nổi bật hôm nay", tuKhoa: "trang chu tong quan hom nay" },
      { href: "/chi-so", nhan: "Chỉ số", moTa: "VN-INDEX, VN30, HNX… và P/E toàn thị trường", tuKhoa: "vnindex vn30 hnx upcom pe thi truong" },
      { href: "/nganh", nhan: "Ngành", moTa: "Bản đồ nhiệt 34 ngành, P/E ngành", tuKhoa: "nganh heatmap ban do nhiet" },
      { href: "/ngan-hang", nhan: "Ngân hàng", moTa: "Huy động, cho vay, nợ xấu từng ngân hàng", tuKhoa: "ngan hang tin dung huy dong no xau ldr" },
      { href: "/cong-ty-chung-khoan", nhan: "Công ty chứng khoán", moTa: "Cho vay ký quỹ, tự doanh, môi giới", tuKhoa: "cong ty chung khoan margin cho vay ky quy tu doanh moi gioi" },
      { href: "/vi-mo", nhan: "Lãi suất & Vĩ mô", moTa: "Lãi suất tiết kiệm, liên ngân hàng, GDP, CPI", tuKhoa: "lai suat tiet kiem gdp cpi lam phat ty gia vi mo" },
      { href: "/bao-chi", nhan: "Tin báo chí", moTa: "CafeF, Vietstock, VnEconomy, gắn mã liên quan", tuKhoa: "tin tuc bao chi cafef vietstock phan tich" },
      { href: "/tin-tuc", nhan: "Tin công bố", moTa: "Cổ tức, giao dịch cổ đông lớn, nhân sự", tuKhoa: "tin tuc cong bo co tuc" },
      { href: "/lich-su-kien", nhan: "Lịch sự kiện", moTa: "Nghỉ lễ, cổ tức, đại hội; họp FED, CPI Mỹ, halving", tuKhoa: "lich su kien co tuc dai hoi dao han nghi le fed fomc cpi lai suat halving quyen chon crypto" },
    ],
  },
  {
    ten: "Chứng khoán",
    trang: [
      { href: "/bang-gia", nhan: "Bảng giá", moTa: "1.525 mã, trần/sàn, khối ngoại, cập nhật mỗi phút", tuKhoa: "bang gia co phieu hose hnx" },
      { href: "/bieu-do", nhan: "Biểu đồ kỹ thuật", moTa: "Chỉ báo kỹ thuật và chỉ báo riêng FL của Finlo", tuKhoa: "bieu do chart chi bao ky thuat" },
      { href: "/bieu-do/nhieu", nhan: "Nhiều biểu đồ", moTa: "Xem cùng lúc tới 6 mã cổ phiếu, tiền số", tuKhoa: "nhieu bieu do multi chart so sanh luoi" },
      { href: "/bo-loc", nhan: "Bộ lọc cổ phiếu", moTa: "Lọc theo P/E, P/B, ROE, tăng trưởng, cổ tức", tuKhoa: "bo loc loc co phieu screener pe roe" },
      { href: "/khuyen-nghi", nhan: "Khuyến nghị CTCK", moTa: "Báo cáo mua/bán của các công ty chứng khoán, chấm điểm theo giá thực tế", tuKhoa: "khuyen nghi bao cao phan tich ctck gia muc tieu target mua ban" },
      { href: "/so-sanh", nhan: "So sánh mã", moTa: "Chồng tối đa 5 mã và chỉ số theo % thay đổi", tuKhoa: "so sanh nhieu ma hieu suat compare" },
    ],
  },
  {
    ten: "Tài sản khác",
    trang: [
      { href: "/tai-san-so", nhan: "Tài sản số", moTa: "Bitcoin, Ethereum, sổ lệnh realtime", tuKhoa: "tien so crypto bitcoin btc eth" },
      { href: "/tai-san-so/phai-sinh", nhan: "Phái sinh tiền số", moTa: "Funding, Open Interest, Long/Short, thanh lý", tuKhoa: "phai sinh futures funding open interest long short thanh ly liquidation" },
      { href: "/tai-san-so/ca-map", nhan: "Theo dõi cá mập", moTa: "Bitcoin chuyển lớn, lệnh lớn trên Binance", tuKhoa: "ca map whale vi lon giao dich lon bitcoin dong tien" },
      { href: "/kim-loai-quy", nhan: "Kim loại quý", moTa: "Giá vàng SJC, nhẫn trơn theo thương hiệu", tuKhoa: "vang sjc kim loai quy pnj" },
    ],
  },
  {
    ten: "Finlo",
    trang: [
      { href: "/gioi-thieu", nhan: "Giới thiệu", moTa: "Finlo là gì, dữ liệu lấy từ đâu", tuKhoa: "gioi thieu ve finlo" },
      { href: "/mcp", nhan: "Finlo MCP", moTa: "Hỏi Claude bằng dữ liệu Finlo: 22 công cụ", tuKhoa: "mcp claude ai tro ly cong cu" },
      { href: "/doi-tac", nhan: "Đối tác", moTa: "Hợp tác dữ liệu, nội dung, quảng bá", tuKhoa: "doi tac hop tac partner quang cao" },
      { href: "/lien-he", nhan: "Liên hệ", moTa: "Góp ý, báo lỗi dữ liệu", tuKhoa: "lien he email gop y bao loi" },
    ],
  },
];

// Hộp thư chung của Finlo, dùng cho trang Liên hệ, Đối tác và chân trang
export const EMAIL_LIEN_HE = "finlo.admin@gmail.com";

export const MENU: TrangMenu[] = NHOM_MENU.flatMap((n) => n.trang);
