// Định dạng gói giá trực tiếp, dùng chung cho máy chủ (lib/tram-gia.ts) và trình duyệt (lib/gia-truc-tiep.ts).
// Mỗi phút chỉ gửi những mã có số liệu đổi, mỗi mã một mảng ngắn để gói nhỏ.

import type { BangGia, CoPhieu, Phien } from "@/lib/mofi";

export type DongGia = [
  ma: string,
  gia: number,
  thayDoi: number,
  phanTram: number,
  khoiLuong: number,
  giaTri: number,
  vonHoa: number | null,
  thamChieu: number | null,
  tran: number | null,
  giaSan: number | null,
  giaTB: number | null,
  nnMua: number | null,
  nnBan: number | null,
  muaCD: number | null,
  banCD: number | null,
];

// toanBo: gói đủ mọi mã (gửi khi trình duyệt mới kết nối và đang giữ số liệu cũ hơn), ngược lại chỉ là phần đổi
export type GoiGia = { phien: Phien; capNhat: string; toanBo: boolean; doi: DongGia[] };

const lamTron = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100);

export const maHoaDong = (cp: CoPhieu): DongGia => [
  cp.ma,
  cp.gia,
  cp.thayDoi,
  lamTron(cp.phanTram) ?? 0,
  cp.khoiLuong,
  cp.giaTri,
  cp.vonHoa == null ? null : Math.round(cp.vonHoa),
  cp.thamChieu,
  cp.tran,
  cp.giaSan,
  cp.giaTB,
  cp.nnMua,
  cp.nnBan,
  cp.muaCD,
  cp.banCD,
];

// Áp gói mới lên bảng đang hiện; mã không có trong gói giữ nguyên
export function apDungGoi(bang: BangGia, goi: GoiGia): BangGia {
  const moi = new Map(goi.doi.map((d) => [d[0], d]));
  const coPhieu = bang.coPhieu.map((cp) => {
    const d = moi.get(cp.ma);
    if (!d) return cp;
    const [, gia, thayDoi, phanTram, khoiLuong, giaTri, vonHoa, thamChieu, tran, giaSan, giaTB, nnMua, nnBan, muaCD, banCD] = d;
    return { ...cp, gia, thayDoi, phanTram, khoiLuong, giaTri, vonHoa, thamChieu, tran, giaSan, giaTB, nnMua, nnBan, muaCD, banCD };
  });
  return { capNhat: goi.capNhat, phien: goi.phien, coPhieu };
}
