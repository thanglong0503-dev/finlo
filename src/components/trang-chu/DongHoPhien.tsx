"use client";

import { useSyncExternalStore } from "react";

// Lịch phiên HOSE theo giờ Việt Nam (phút tính từ 0h). Chưa tính ngày nghỉ lễ.
const LICH = [
  { tu: 0, den: 9 * 60, ten: "Chờ mở cửa", mo: false },
  { tu: 9 * 60, den: 9 * 60 + 15, ten: "ATO", mo: true },
  { tu: 9 * 60 + 15, den: 11 * 60 + 30, ten: "Khớp lệnh liên tục", mo: true },
  { tu: 11 * 60 + 30, den: 13 * 60, ten: "Nghỉ trưa", mo: false },
  { tu: 13 * 60, den: 14 * 60 + 30, ten: "Khớp lệnh liên tục", mo: true },
  { tu: 14 * 60 + 30, den: 14 * 60 + 45, ten: "ATC", mo: true },
  { tu: 14 * 60 + 45, den: 24 * 60, ten: "Đã đóng cửa", mo: false },
];

const dangKy = (goi: () => void) => {
  const id = setInterval(goi, 1000);
  return () => clearInterval(id);
};
const giayHienTai = () => Math.floor(Date.now() / 1000);

const hai = (n: number) => String(n).padStart(2, "0");

// Trạng thái phiên và đồng hồ đếm ngược tới mốc kế tiếp; trước khi trình duyệt chạy thì để trống
export function DongHoPhien() {
  const giay = useSyncExternalStore(dangKy, giayHienTai, () => null);
  if (giay == null) return <span className="so text-chu-phu">--:--:--</span>;

  // Đổi sang giờ Việt Nam (UTC+7) bằng phép cộng để không phụ thuộc múi giờ của máy
  const vn = new Date((giay + 7 * 3600) * 1000);
  const thu = vn.getUTCDay();
  const giayTrongNgay = vn.getUTCHours() * 3600 + vn.getUTCMinutes() * 60 + vn.getUTCSeconds();
  const cuoiTuan = thu === 0 || thu === 6;

  let ten: string;
  let mo = false;
  let conLai: number;
  let moc: string;
  if (cuoiTuan) {
    ten = "Nghỉ cuối tuần";
    const soNgay = thu === 6 ? 2 : 1;
    conLai = soNgay * 86400 - giayTrongNgay + 9 * 3600;
    moc = "mở cửa thứ Hai";
  } else {
    const phut = Math.floor(giayTrongNgay / 60);
    const i = LICH.findIndex((x) => phut >= x.tu && phut < x.den);
    const p = LICH[i];
    ten = p.ten;
    mo = p.mo;
    if (i === LICH.length - 1) {
      conLai = (thu === 5 ? 3 : 1) * 86400 - giayTrongNgay + 9 * 3600;
      moc = thu === 5 ? "mở cửa thứ Hai" : "mở cửa ngày mai";
    } else {
      conLai = p.den * 60 - giayTrongNgay;
      moc = `đến ${LICH[i + 1].ten === "Đã đóng cửa" ? "đóng cửa" : LICH[i + 1].ten}`;
    }
  }
  const gio = Math.floor(conLai / 3600);
  const dongHo =
    gio >= 24 ? `${Math.floor(gio / 24)} ngày ${gio % 24} giờ` : `${hai(gio)}:${hai(Math.floor((conLai % 3600) / 60))}:${hai(conLai % 60)}`;

  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className={`h-2 w-2 ${mo ? "cham-song bg-tang" : "bg-chu-phu"}`} />
      <span className="font-semibold">{ten}</span>
      <span className="text-chu-phu">
        <span className={gio >= 24 ? "" : "so"}>{dongHo}</span> {moc}
      </span>
    </span>
  );
}
