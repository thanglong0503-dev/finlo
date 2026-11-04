// Kiểu dữ liệu của Dòng tiền khối ngoại và Bản tin cuối phiên. Tính mỗi ngày bởi scripts/quet-ngay.ts,
// website chỉ đọc src/data/dong-tien-ngoai.json và src/data/ban-tin.json nên không tốn lượt gọi Mofi.

export type DongTienNganh = { k: string; ten: string; rong: number[] }; // triệu đồng, mỗi phần tử là một phiên
export type DongTienMa = { ma: string; ten: string; nganh: string | null; gia: number; phanTram: number; rong: number[] };

export type KetQuaDongTien = {
  ngay: string;
  soMa: number;
  cacNgay: string[]; // cũ đến mới
  tongMua: number[];
  tongBan: number[];
  nganh: DongTienNganh[];
  ma: DongTienMa[];
};

export type ChiSoBanTin = { ma: string; ten: string; diem: number; thayDoi: number; phanTram: number; giaTri: number };
export type NganhBanTin = { ten: string; phanTram: number };
export type MaBanTin = { ma: string; gia: number; phanTram: number; giaTri: number };
export type NgoaiMa = { ma: string; rong: number };
export type TinHieuBanTin = { k: string; ten: string; huong: "tang" | "giam" | "trung"; so: number; ma: string[] };

export type BanTin = {
  ngay: string;
  tieuDe: string;
  doan: string[];
  chiSo: ChiSoBanTin[];
  doRong: { tang: number; giam: number; dung: number; tran: number; san: number };
  giaTri: number; // đồng
  soVoiTb: number | null; // % so với trung bình các phiên trước
  nganhTang: NganhBanTin[];
  nganhGiam: NganhBanTin[];
  maTang: MaBanTin[];
  maGiam: MaBanTin[];
  maGiaTri: MaBanTin[];
  ngoai: { mua: number; ban: number; muaRong: NgoaiMa[]; banRong: NgoaiMa[] }; // triệu đồng
  tinHieu: TinHieuBanTin[] | null; // null: phiên cũ, lúc đó chưa lưu kết quả quét
};

export type KetQuaBanTin = { ds: BanTin[] }; // mới đến cũ

export const ngayNgan = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
export const ngayDayDu = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;

// Số phiên mua (dương) hoặc bán (âm) ròng liên tiếp tính đến phiên cuối
export function chuoiLienTiep(rong: number[]) {
  const n = rong.length;
  const dau = Math.sign(rong[n - 1] ?? 0);
  if (!dau) return 0;
  let dem = 0;
  for (let i = n - 1; i >= 0 && Math.sign(rong[i]) === dau; i--) dem++;
  return dem * dau;
}
