// Sự kiện lớn gắn thẳng lên biểu đồ giá: khoảng khủng hoảng (vùng xám) và tin quan trọng một ngày (mốc nhỏ).
// Ngày theo giờ Việt Nam. Cổ phiếu hiện sự kiện Việt Nam + thế giới; tiền số hiện sự kiện thế giới + tiền số.

export type PhamViSuKien = "vn" | "the-gioi" | "tien-so";

export type SuKienBieuDo = {
  tu: string; // yyyy-mm-dd
  den?: string; // có ngày kết thúc: vẽ thành vùng xám
  ten: string;
  chu: string; // chữ ngắn trên mốc
  moTa: string;
  phamVi: PhamViSuKien;
};

export const SU_KIEN_BIEU_DO: SuKienBieuDo[] = [
  // ---- Khoảng khủng hoảng / thiên nga đen ----
  {
    tu: "2008-09-15",
    den: "2009-02-24",
    ten: "Khủng hoảng tài chính toàn cầu",
    chu: "2008",
    moTa: "Lehman Brothers phá sản kéo theo khủng hoảng tín dụng toàn cầu; VN-Index chạm đáy 235 điểm ngày 24/02/2009.",
    phamVi: "the-gioi",
  },
  {
    tu: "2018-04-10",
    den: "2018-07-05",
    ten: "Căng thẳng thương mại Mỹ – Trung",
    chu: "Thương chiến",
    moTa: "Mỹ – Trung áp thuế qua lại; VN-Index rơi từ đỉnh 1.204 điểm về quanh 890 điểm.",
    phamVi: "vn",
  },
  {
    tu: "2020-01-30",
    den: "2020-03-24",
    ten: "Đại dịch COVID-19",
    chu: "COVID",
    moTa: "WHO ban bố tình trạng khẩn cấp toàn cầu; thị trường thế giới sụp đổ tháng 3/2020, VN-Index về 660 điểm, Bitcoin mất một nửa giá trong hai ngày 12–13/3.",
    phamVi: "the-gioi",
  },
  {
    tu: "2021-05-12",
    den: "2021-07-20",
    ten: "Tesla dừng nhận BTC, Trung Quốc cấm đào",
    chu: "Cấm đào",
    moTa: "Tesla ngừng nhận thanh toán Bitcoin, Trung Quốc siết khai thác và giao dịch; BTC giảm hơn 50% từ đỉnh tháng 4.",
    phamVi: "tien-so",
  },
  {
    tu: "2022-04-04",
    den: "2022-11-16",
    ten: "Khủng hoảng trái phiếu, lãi suất tăng",
    chu: "2022",
    moTa: "Loạt vụ bắt lãnh đạo doanh nghiệp, đóng băng trái phiếu doanh nghiệp và lãi suất tăng mạnh; VN-Index giảm gần 40% từ đỉnh 1.524 điểm.",
    phamVi: "vn",
  },
  {
    tu: "2022-05-07",
    den: "2022-05-13",
    ten: "Sụp đổ LUNA / UST",
    chu: "LUNA",
    moTa: "Stablecoin UST mất neo, LUNA về gần 0; khoảng 40 tỷ USD bốc hơi, kéo cả thị trường tiền số lao dốc.",
    phamVi: "tien-so",
  },
  {
    tu: "2022-06-12",
    den: "2022-06-18",
    ten: "Celsius, Three Arrows Capital vỡ nợ",
    chu: "Celsius",
    moTa: "Celsius đóng băng rút tiền, quỹ 3AC mất khả năng thanh toán; BTC rơi xuống dưới 18.000 USD.",
    phamVi: "tien-so",
  },
  {
    tu: "2022-11-06",
    den: "2022-11-21",
    ten: "Sàn FTX sụp đổ",
    chu: "FTX",
    moTa: "Lộ lỗ hổng tài chính, sàn FTX dừng rút tiền và phá sản; BTC về quanh 15.500 USD, đáy của chu kỳ.",
    phamVi: "tien-so",
  },
  {
    tu: "2025-04-03",
    den: "2025-04-09",
    ten: "Mỹ áp thuế đối ứng",
    chu: "Thuế 46%",
    moTa: "Mỹ công bố thuế đối ứng, Việt Nam chịu 46%; VN-Index mất gần 18% trong 4 phiên trước khi Mỹ hoãn áp thuế 90 ngày.",
    phamVi: "the-gioi",
  },
  {
    tu: "2025-10-10",
    den: "2025-10-11",
    ten: "Thanh lý kỷ lục trên thị trường tiền số",
    chu: "Thanh lý",
    moTa: "Mỹ dọa tăng thuế với Trung Quốc, khoảng 19 tỷ USD vị thế đòn bẩy bị thanh lý trong một ngày, lớn nhất lịch sử.",
    phamVi: "tien-so",
  },

  // ---- Tin quan trọng một ngày ----
  { tu: "2014-02-24", ten: "Mt. Gox dừng giao dịch", chu: "Mt. Gox", moTa: "Sàn Bitcoin lớn nhất thời đó dừng hoạt động, mất khoảng 850.000 BTC.", phamVi: "tien-so" },
  { tu: "2015-08-24", ten: "Thứ Hai đen tối Trung Quốc", chu: "TQ", moTa: "Chứng khoán Trung Quốc giảm 8,5% trong một phiên sau khi phá giá nhân dân tệ.", phamVi: "the-gioi" },
  { tu: "2016-06-24", ten: "Brexit", chu: "Brexit", moTa: "Anh bỏ phiếu rời Liên minh châu Âu, thị trường toàn cầu giảm mạnh.", phamVi: "the-gioi" },
  { tu: "2012-11-28", ten: "Bitcoin halving lần 1", chu: "Halving", moTa: "Phần thưởng mỗi khối giảm từ 50 xuống 25 BTC.", phamVi: "tien-so" },
  { tu: "2016-07-09", ten: "Bitcoin halving lần 2", chu: "Halving", moTa: "Phần thưởng mỗi khối giảm từ 25 xuống 12,5 BTC.", phamVi: "tien-so" },
  { tu: "2017-12-17", ten: "Đỉnh Bitcoin 2017", chu: "Đỉnh", moTa: "BTC chạm gần 20.000 USD rồi giảm hơn 80% trong năm 2018.", phamVi: "tien-so" },
  { tu: "2020-03-16", ten: "Fed hạ lãi suất về 0%", chu: "Fed 0%", moTa: "Fed hạ khẩn cấp lãi suất về 0–0,25% và bơm tiền không giới hạn.", phamVi: "the-gioi" },
  { tu: "2020-05-11", ten: "Bitcoin halving lần 3", chu: "Halving", moTa: "Phần thưởng mỗi khối giảm từ 12,5 xuống 6,25 BTC.", phamVi: "tien-so" },
  { tu: "2022-03-17", ten: "Fed bắt đầu tăng lãi suất", chu: "Fed tăng", moTa: "Fed tăng lãi suất lần đầu kể từ 2018, mở đầu chu kỳ thắt chặt mạnh nhất 40 năm.", phamVi: "the-gioi" },
  { tu: "2022-03-29", ten: "Bắt Chủ tịch FLC", chu: "FLC", moTa: "Ông Trịnh Văn Quyết bị bắt vì thao túng giá cổ phiếu, nhóm cổ phiếu đầu cơ giảm sàn hàng loạt.", phamVi: "vn" },
  { tu: "2022-09-15", ten: "Ethereum The Merge", chu: "Merge", moTa: "Ethereum chuyển sang cơ chế Proof of Stake.", phamVi: "tien-so" },
  { tu: "2022-10-08", ten: "Vụ Vạn Thịnh Phát", chu: "VTP", moTa: "Bà Trương Mỹ Lan bị bắt, rút tiền ở SCB, niềm tin thị trường trái phiếu và chứng khoán lao dốc.", phamVi: "vn" },
  { tu: "2023-03-10", ten: "Ngân hàng SVB sụp đổ", chu: "SVB", moTa: "Silicon Valley Bank phá sản, lo ngại khủng hoảng ngân hàng Mỹ lan rộng.", phamVi: "the-gioi" },
  { tu: "2024-01-11", ten: "Quỹ ETF Bitcoin giao ngay", chu: "ETF BTC", moTa: "Các quỹ ETF Bitcoin giao ngay bắt đầu giao dịch tại Mỹ, dòng tiền tổ chức đổ vào.", phamVi: "tien-so" },
  { tu: "2024-04-20", ten: "Bitcoin halving lần 4", chu: "Halving", moTa: "Phần thưởng mỗi khối giảm từ 6,25 xuống 3,125 BTC.", phamVi: "tien-so" },
  { tu: "2024-07-23", ten: "Quỹ ETF Ethereum giao ngay", chu: "ETF ETH", moTa: "Các quỹ ETF Ethereum giao ngay bắt đầu giao dịch tại Mỹ.", phamVi: "tien-so" },
  { tu: "2024-09-19", ten: "Fed hạ lãi suất lần đầu", chu: "Fed giảm", moTa: "Fed hạ 0,5 điểm %, lần giảm đầu tiên sau 4 năm.", phamVi: "the-gioi" },
  { tu: "2024-11-06", ten: "Bầu cử Tổng thống Mỹ", chu: "Bầu cử", moTa: "Ông Donald Trump thắng cử; Bitcoin vượt đỉnh cũ, USD tăng mạnh.", phamVi: "the-gioi" },
  { tu: "2025-03-06", ten: "Mỹ lập Quỹ dự trữ Bitcoin", chu: "Dự trữ BTC", moTa: "Sắc lệnh lập Quỹ dự trữ Bitcoin chiến lược của Mỹ.", phamVi: "tien-so" },
  { tu: "2025-05-05", ten: "Vận hành hệ thống KRX", chu: "KRX", moTa: "Sở Giao dịch TP.HCM chuyển sang hệ thống giao dịch mới KRX.", phamVi: "vn" },
  { tu: "2025-10-08", ten: "FTSE nâng hạng Việt Nam", chu: "Nâng hạng", moTa: "FTSE Russell công bố nâng Việt Nam lên thị trường mới nổi thứ cấp, hiệu lực từ 9/2026.", phamVi: "vn" },
];

// 0 giờ ngày đó theo giờ Việt Nam (giây UTC), cùng mốc với nến ngày của Finlo
export const lucNgayVN = (ngay: string) => {
  const [y, m, d] = ngay.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 1000 - 7 * 3600;
};

export const suKienCuaNguon = (nguon: "ck" | "ts") =>
  SU_KIEN_BIEU_DO.filter((s) => s.phamVi === "the-gioi" || s.phamVi === (nguon === "ck" ? "vn" : "tien-so"));
