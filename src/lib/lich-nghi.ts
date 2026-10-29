// Lịch nghỉ giao dịch của thị trường chứng khoán Việt Nam (HOSE, HNX, UPCOM) và giờ phiên.
// Cập nhật danh sách mỗi năm khi Sở giao dịch công bố lịch nghỉ chính thức.

export type NgayNghi = { ngay: string; ten: string; duKien?: boolean };

export const NGAY_NGHI: NgayNghi[] = [
  // 2026
  { ngay: "2026-01-01", ten: "Tết Dương lịch" },
  { ngay: "2026-02-16", ten: "Tết Nguyên đán" },
  { ngay: "2026-02-17", ten: "Tết Nguyên đán" },
  { ngay: "2026-02-18", ten: "Tết Nguyên đán" },
  { ngay: "2026-02-19", ten: "Tết Nguyên đán" },
  { ngay: "2026-02-20", ten: "Tết Nguyên đán" },
  { ngay: "2026-04-27", ten: "Giỗ Tổ Hùng Vương (nghỉ bù)" },
  { ngay: "2026-04-30", ten: "Ngày Thống nhất" },
  { ngay: "2026-05-01", ten: "Quốc tế Lao động" },
  { ngay: "2026-09-01", ten: "Quốc khánh" },
  { ngay: "2026-09-02", ten: "Quốc khánh" },
  // 2027 (dự kiến theo Bộ luật Lao động, chờ Sở giao dịch công bố)
  { ngay: "2027-01-01", ten: "Tết Dương lịch", duKien: true },
  { ngay: "2027-02-04", ten: "Tết Nguyên đán", duKien: true },
  { ngay: "2027-02-05", ten: "Tết Nguyên đán", duKien: true },
  { ngay: "2027-02-08", ten: "Tết Nguyên đán", duKien: true },
  { ngay: "2027-02-09", ten: "Tết Nguyên đán", duKien: true },
  { ngay: "2027-02-10", ten: "Tết Nguyên đán", duKien: true },
  { ngay: "2027-04-16", ten: "Giỗ Tổ Hùng Vương", duKien: true },
  { ngay: "2027-04-30", ten: "Ngày Thống nhất", duKien: true },
  { ngay: "2027-05-03", ten: "Quốc tế Lao động (nghỉ bù)", duKien: true },
  { ngay: "2027-09-02", ten: "Quốc khánh", duKien: true },
  { ngay: "2027-09-03", ten: "Quốc khánh", duKien: true },
];

const THEO_NGAY = new Map(NGAY_NGHI.map((n) => [n.ngay, n]));

// Ngày (YYYY-MM-DD) theo giờ Việt Nam của một thời điểm (giây)
export const ngayVN = (giay: number) => new Date((giay + 7 * 3600) * 1000).toISOString().slice(0, 10);

export const ngayNghiCua = (ymd: string) => THEO_NGAY.get(ymd) ?? null;

// Ngày có giao dịch: thứ Hai–thứ Sáu và không phải ngày nghỉ lễ
export function laNgayGiaoDich(ymd: string) {
  const thu = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return thu !== 0 && thu !== 6 && !THEO_NGAY.has(ymd);
}

// Ngày giao dịch kế tiếp sau ngày ymd
export function ngayGiaoDichKe(ymd: string) {
  const d = new Date(`${ymd}T00:00:00Z`);
  for (let i = 0; i < 30; i++) {
    d.setUTCDate(d.getUTCDate() + 1);
    const s = d.toISOString().slice(0, 10);
    if (laNgayGiaoDich(s)) return s;
  }
  return ymd;
}

// Đang trong khung giờ có dữ liệu phiên mới (09:00–15:00, có biên vài phút để lấy ảnh chụp cuối)
export function dangTrongGioGiaoDich(ms = Date.now()) {
  const giay = Math.floor(ms / 1000);
  if (!laNgayGiaoDich(ngayVN(giay))) return false;
  const phut = Math.floor(((giay + 7 * 3600) % 86400) / 60);
  return phut >= 8 * 60 + 55 && phut <= 15 * 60 + 5;
}
