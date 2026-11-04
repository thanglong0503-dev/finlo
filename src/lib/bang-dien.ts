// Bảng điện rổ VN30: đọc ảnh chụp theo phút của Mofi. Dùng được cả ở trình duyệt lẫn server.
// Mỗi phút Mofi ghi hai loại file: realtime/bang/<ngày>/<HHMM>.json (giá, khối lượng) và
// realtime/sau/<ngày>/<sàn>/<HHMM>.json (3 bước giá mua bán, khối lượng nước ngoài).

export const GOC_MOFI = "https://data.mofi.vn";

export type BangTho = {
  ngay: string;
  hhmm: string;
  dot: string;
  ma: string[];
  san: string[];
  gia: number[];
  tc: number[];
  tran: number[];
  gsan: number[];
  cao: number[];
  thap: number[];
  kl: number[];
  gt: number[];
  nnM: number[];
  nnB: number[];
  room: number[];
  klK: number[];
  tb: number[];
};

export type SauTho = { hhmm: string; ma: string[]; mua: number[]; ban: number[]; nnMua: number[]; nnBan: number[] };

export type DongBang = {
  san: string;
  gia: number;
  tc: number;
  tran: number;
  gsan: number;
  cao: number;
  thap: number;
  kl: number;
  gt: number;
  nnM: number;
  nnB: number;
  room: number;
  klK: number;
  tb: number;
};
export type DongSau = { mua: number[]; ban: number[]; nnMua: number; nnBan: number };

export type AnhBang = { ngay: string; hhmm: string; dot: string; dong: Record<string, DongBang> };
export type AnhSau = { hhmm: string; dong: Record<string, DongSau> };

// Chỉ giữ các mã trong rổ: file gốc có toàn bộ thị trường
export function docBang(t: BangTho, ro: string[]): AnhBang {
  const dong: AnhBang["dong"] = {};
  for (const ma of ro) {
    const i = t.ma.indexOf(ma);
    if (i < 0) continue;
    dong[ma] = {
      san: t.san[i],
      // Đầu phiên ATO chưa khớp thì giá = 0: giữ giá tham chiếu
      gia: t.gia[i] > 0 ? t.gia[i] : t.tc[i],
      tc: t.tc[i],
      tran: t.tran[i],
      gsan: t.gsan[i],
      cao: t.cao[i],
      thap: t.thap[i],
      kl: t.kl[i],
      gt: t.gt[i],
      nnM: t.nnM[i],
      nnB: t.nnB[i],
      room: t.room[i],
      klK: t.klK[i],
      tb: t.tb[i],
    };
  }
  return { ngay: t.ngay, hhmm: t.hhmm, dot: t.dot, dong };
}

// mua, ban là mảng phẳng: mỗi mã 6 số [giá 1, KL 1, giá 2, KL 2, giá 3, KL 3]
export function docSau(t: SauTho, ro: string[]): AnhSau {
  const dong: AnhSau["dong"] = {};
  for (const ma of ro) {
    const i = t.ma.indexOf(ma);
    if (i < 0) continue;
    dong[ma] = { mua: t.mua.slice(i * 6, i * 6 + 6), ban: t.ban.slice(i * 6, i * 6 + 6), nnMua: t.nnMua[i], nnBan: t.nnBan[i] };
  }
  return { hhmm: t.hhmm, dong };
}

export const hhmmCua = (phut: number) => `${String(Math.floor(phut / 60)).padStart(2, "0")}${String(phut % 60).padStart(2, "0")}`;
export const phutCua = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(2));

// Màu của một mức giá theo bảng điện: trần tím, sàn xanh lam, tham chiếu vàng, trên xanh, dưới đỏ
export function mauMucGia(gia: number, d: Pick<DongBang, "tc" | "tran" | "gsan">) {
  if (!gia) return "";
  if (d.tran > 0 && gia >= d.tran) return "text-tran";
  if (d.gsan > 0 && gia <= d.gsan) return "text-san-gia";
  if (gia === d.tc) return "text-dung";
  return gia > d.tc ? "text-tang" : "text-giam";
}

// "100", "109,1 ng", "2,28 tr" cho vừa cột hẹp
export function klGon(x: number) {
  if (!x) return "";
  if (x >= 1e6) return `${(x / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} tr`;
  if (x >= 1e3) return `${(x / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ng`;
  return String(Math.round(x));
}
