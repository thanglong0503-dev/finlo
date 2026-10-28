import type { ChuoiViMo } from "@/lib/mofi";

// Kỳ của chuỗi vĩ mô -> ngày cho biểu đồ: "2025" -> 2025-01-01, "2026Q3" -> 2026-07-01, "2026M09" -> 2026-09-01
export function kyThanhNgay(ky: string): string {
  const quy = ky.match(/^(\d{4})Q([1-4])$/);
  if (quy) return `${quy[1]}-${String((Number(quy[2]) - 1) * 3 + 1).padStart(2, "0")}-01`;
  const thang = ky.match(/^(\d{4})M(\d{2})$/);
  if (thang) return `${thang[1]}-${thang[2]}-01`;
  if (/^\d{4}$/.test(ky)) return `${ky}-01-01`;
  return ky;
}

// Nhãn kỳ dễ đọc: "2026Q3" -> "Q3/2026", "2026M09" -> "T9/2026", "2026-10-27" -> "27/10/2026"
export function nhanKy(ky: string): string {
  const quy = ky.match(/^(\d{4})Q([1-4])$/);
  if (quy) return `Q${quy[2]}/${quy[1]}`;
  const thang = ky.match(/^(\d{4})M(\d{2})$/);
  if (thang) return `T${Number(thang[2])}/${thang[1]}`;
  const ngay = ky.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ngay) return `${ngay[3]}/${ngay[2]}/${ngay[1]}`;
  return ky;
}

// Các điểm có giá trị (bỏ ô trống)
export function diemCo(c: ChuoiViMo) {
  return c.ky.flatMap((ky, i) => (c.gt[i] == null ? [] : [{ ky, gt: c.gt[i] as number }]));
}

export function giaTriCuoi(c: ChuoiViMo) {
  const d = diemCo(c);
  return { cuoi: d[d.length - 1] ?? null, truoc: d[d.length - 2] ?? null };
}

// Giá trị theo đơn vị của chuỗi: % giữ 2 số lẻ; USD lớn rút gọn tỷ/triệu
export function dinhDangViMo(gt: number, donVi: string): string {
  const so = (x: number, le = 2) => x.toLocaleString("vi-VN", { maximumFractionDigits: le });
  if (donVi === "%") return `${so(gt)}%`;
  if (donVi === "triệu USD" && Math.abs(gt) >= 1000) return `${so(gt / 1000, 1)} tỷ USD`;
  if (/lượt/i.test(donVi) && Math.abs(gt) >= 1e6) return `${so(gt / 1e6, 2)} triệu lượt`;
  if (/VND\/USD/.test(donVi)) return `${so(gt, 0)} đ`;
  if (/USD/i.test(donVi) && Math.abs(gt) >= 1e9) return `${so(gt / 1e9, 1)} tỷ USD`;
  if (/USD/i.test(donVi) && Math.abs(gt) >= 1e6) return `${so(gt / 1e6, 1)} triệu USD`;
  if (/người/i.test(donVi) && Math.abs(gt) >= 1e6) return `${so(gt / 1e6, 1)} triệu người`;
  return `${so(gt)}${donVi ? ` ${donVi}` : ""}`;
}
