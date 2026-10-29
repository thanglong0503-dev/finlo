// Phần dùng chung giữa máy chủ và trình duyệt cho trang Cá mập (không import next/cache ở đây)

export const NGUONG_BTC = 100;

export type KieuGiaoDich = "chuyen" | "gom" | "chia";
export type GiaoDichLon = { txid: string; khoi: number | null; luc: number; btc: number; vao: number; ra: number; kieu: KieuGiaoDich };

// Dạng giao dịch đoán theo cấu trúc: gom nhiều đầu vào về 1–2 ví (thường là sàn gom tiền nạp), chia ra rất nhiều ví (thường là sàn trả tiền rút)
export function phanLoai(vao: number, ra: number): KieuGiaoDich {
  if (vao >= 20 && ra <= 2) return "gom";
  if (ra >= 20) return "chia";
  return "chuyen";
}

export function soChuyenThat(diaChiVao: (string | undefined)[], dauRa: { diaChi?: string; sat: number }[]) {
  const vao = new Set(diaChiVao.filter(Boolean));
  return dauRa.filter((o) => !o.diaChi || !vao.has(o.diaChi)).reduce((s, o) => s + o.sat, 0) / 1e8;
}
