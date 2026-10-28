// Định dạng số theo kiểu Việt Nam: 1.234,56

const so = (toiDa: number, toiThieu = 0) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: toiDa, minimumFractionDigits: toiThieu });

const so2 = so(2, 2);
const so0 = so(0);

// Giá cổ phiếu hiển thị theo nghìn đồng: 241000 -> "241,00"
export const giaNghin = (vnd: number) => so2.format(vnd / 1000);

export const diem = (x: number) => so2.format(x);

export const usd = (x: number) => so0.format(x);

export const phanTram = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${so2.format(Math.abs(x))}%`;

export const thayDoi = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${so2.format(Math.abs(x))}`;

export function khoiLuong(x: number) {
  if (x >= 1e6) return `${so2.format(x / 1e6)} tr`;
  if (x >= 1e3) return `${so0.format(x / 1e3)} N`;
  return so0.format(x);
}

export const tyDong = (vnd: number) =>
  vnd >= 1e9 ? `${so0.format(vnd / 1e9)} tỷ` : `${so0.format(vnd / 1e6)} tr`;

// Vốn hoá: từ 1.000 tỷ trở lên viết gọn "1,86 nghìn tỷ"
export const vonHoa = (vnd: number | null) =>
  vnd == null ? "—" : vnd >= 1e12 ? `${so2.format(vnd / 1e12)} nghìn tỷ` : tyDong(vnd);

export const soNguyen = (x: number) => so0.format(x);
// Lớp màu theo chiều tăng/giảm
export const mauTangGiam = (x: number) => (x > 0 ? "text-tang" : x < 0 ? "text-giam" : "text-dung");
