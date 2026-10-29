// Lịch sự kiện thị trường: nghỉ lễ, đáo hạn phái sinh, hạn công bố báo cáo tài chính,
// kỳ cơ cấu quỹ ETF ngoại và công bố quan trọng của doanh nghiệp (cổ tức, đại hội cổ đông, kết quả kinh doanh).

import { laNgayGiaoDich, NGAY_NGHI } from "@/lib/lich-nghi";
import type { TinDoanhNghiep } from "@/lib/mofi";

export type LoaiSuKien = "nghi" | "phai-sinh" | "bctc" | "etf" | "co-tuc" | "dai-hoi" | "kqkd";

export type SuKien = { ngay: string; loai: LoaiSuKien; tieuDe: string; ma?: string; duKien?: boolean; ghiChu?: string };

export const LOAI_SU_KIEN: { ma: LoaiSuKien; ten: string; mau: string }[] = [
  { ma: "co-tuc", ten: "Cổ tức & quyền", mau: "#19c26b" },
  { ma: "dai-hoi", ten: "Đại hội cổ đông", mau: "#3b82f6" },
  { ma: "kqkd", ten: "Kết quả kinh doanh", mau: "#a855f7" },
  { ma: "bctc", ten: "Hạn báo cáo tài chính", mau: "#14b8a6" },
  { ma: "phai-sinh", ten: "Đáo hạn phái sinh", mau: "#e3a008" },
  { ma: "etf", ten: "Cơ cấu ETF", mau: "#f97316" },
  { ma: "nghi", ten: "Nghỉ lễ", mau: "#f0506e" },
];

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// Thứ n (1..5) của một ngày trong tuần (0 = Chủ nhật) trong tháng
function thuThuN(nam: number, thang: number, thu: number, n: number) {
  const d = new Date(Date.UTC(nam, thang, 1));
  d.setUTCDate(1 + ((thu - d.getUTCDay() + 7) % 7) + (n - 1) * 7);
  return d;
}

// Lùi về ngày giao dịch gần nhất nếu rơi vào ngày nghỉ
function lui(d: Date) {
  const x = new Date(d);
  for (let i = 0; i < 10 && !laNgayGiaoDich(ymd(x)); i++) x.setUTCDate(x.getUTCDate() - 1);
  return ymd(x);
}

// Sự kiện theo lịch cố định trong khoảng [tu, den] (YYYY-MM-DD)
export function suKienLich(tu: string, den: string): SuKien[] {
  const kq: SuKien[] = [];
  const namDau = Number(tu.slice(0, 4));
  const namCuoi = Number(den.slice(0, 4));
  for (let nam = namDau; nam <= namCuoi; nam++) {
    for (let thang = 0; thang < 12; thang++) {
      // Hợp đồng tương lai VN30: đáo hạn thứ Năm tuần thứ ba của tháng
      kq.push({
        ngay: lui(thuThuN(nam, thang, 4, 3)),
        loai: "phai-sinh",
        tieuDe: `Đáo hạn hợp đồng tương lai VN30 tháng ${thang + 1}`,
        ghiChu: "Thứ Năm tuần thứ ba của tháng; thanh khoản và biến động nhóm VN30 thường tăng.",
      });
      // Quỹ ETF ngoại (FTSE, MarketVector) cơ cấu vào thứ Sáu tuần thứ ba tháng 3, 6, 9, 12
      if (thang % 3 === 2)
        kq.push({
          ngay: lui(thuThuN(nam, thang, 5, 3)),
          loai: "etf",
          tieuDe: "Quỹ ETF ngoại cơ cấu danh mục",
          duKien: true,
          ghiChu: "FTSE Vietnam và VNM ETF thường giao dịch cơ cấu vào phiên này; ngày chính xác theo thông báo của quỹ.",
        });
    }
    // Hạn công bố báo cáo tài chính (Thông tư 96/2020/TT-BTC)
    const hanQuy: [number, number, string][] = [
      [0, 20, `quý 4/${nam - 1}`],
      [3, 20, `quý 1/${nam}`],
      [6, 20, `quý 2/${nam}`],
      [9, 20, `quý 3/${nam}`],
    ];
    for (const [thang, ngay, ky] of hanQuy) {
      kq.push({ ngay: ymd(new Date(Date.UTC(nam, thang, ngay))), loai: "bctc", tieuDe: `Hạn BCTC ${ky} (riêng lẻ)`, ghiChu: "20 ngày sau khi kết thúc quý." });
      kq.push({
        ngay: ymd(new Date(Date.UTC(nam, thang, 30))),
        loai: "bctc",
        tieuDe: `Hạn BCTC ${ky} (hợp nhất)`,
        ghiChu: "Công ty mẹ lập báo cáo hợp nhất: 30 ngày sau khi kết thúc quý.",
      });
    }
    kq.push({ ngay: `${nam}-03-31`, loai: "bctc", tieuDe: `Hạn BCTC năm ${nam - 1} đã kiểm toán`, ghiChu: "90 ngày sau khi kết thúc năm tài chính." });
    kq.push({ ngay: `${nam}-08-14`, loai: "bctc", tieuDe: `Hạn BCTC bán niên ${nam} đã soát xét`, ghiChu: "45 ngày sau khi kết thúc 6 tháng đầu năm." });
  }
  for (const n of NGAY_NGHI)
    kq.push({ ngay: n.ngay, loai: "nghi", tieuDe: `Nghỉ giao dịch: ${n.ten}`, duKien: n.duKien });
  return kq.filter((s) => s.ngay >= tu && s.ngay <= den);
}

// Công bố quan trọng của doanh nghiệp, xếp theo ngày công bố
export function suKienDoanhNghiep(tin: TinDoanhNghiep[]): SuKien[] {
  return tin.flatMap((t): SuKien[] => {
    const loai: LoaiSuKien | null =
      t.loai === "Cổ tức & quyền" || /cổ tức|chia thưởng|phát hành cổ phiếu.*cổ đông hiện hữu|quyền mua/i.test(t.tieuDe)
        ? "co-tuc"
        : /ĐHĐCĐ|đại hội đồng cổ đông|đại hội cổ đông/i.test(t.tieuDe)
          ? "dai-hoi"
          : t.loai === "Kết quả kinh doanh" || /báo cáo tài chính|kết quả kinh doanh|giải trình.*lợi nhuận/i.test(t.tieuDe)
            ? "kqkd"
            : null;
    return loai ? [{ ngay: t.ngay, loai, tieuDe: t.tieuDe, ma: t.ma }] : [];
  });
}
