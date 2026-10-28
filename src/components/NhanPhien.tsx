import type { Phien } from "@/lib/mofi";

// Tên đợt giao dịch theo ảnh chụp bảng giá
const TEN_DOT: Record<string, string> = {
  ATO: "Phiên mở cửa (ATO)",
  LO: "Khớp lệnh liên tục",
  Break: "Nghỉ trưa",
  ATC: "Phiên đóng cửa (ATC)",
  PT: "Giao dịch thoả thuận",
  C: "Đã đóng cửa",
  PRE: "Đã đóng cửa",
};

const DANG_GIAO_DICH = new Set(["ATO", "LO", "ATC"]);

// "● Khớp lệnh liên tục · dữ liệu 14:30 28/10" — chấm xanh nhấp nháy khi đang khớp lệnh
export function NhanPhien({ phien }: { phien: Phien | null }) {
  if (!phien) return <span className="text-chu-phu">Giá cuối ngày</span>;
  const dang = DANG_GIAO_DICH.has(phien.dot);
  const [, thang, ngay] = phien.ngay.split("-");
  return (
    <span className="inline-flex items-center gap-1.5 text-chu-phu">
      <span className={`h-1.5 w-1.5 ${dang ? "cham-song bg-nhan" : phien.dot === "Break" ? "bg-dung" : "bg-chu-phu"}`} />
      <span className={dang ? "font-medium text-nhan" : ""}>{TEN_DOT[phien.dot] ?? phien.dot}</span>
      <span>
        · dữ liệu {phien.gio} {ngay}/{thang}
      </span>
    </span>
  );
}
