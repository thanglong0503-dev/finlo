// Quét tín hiệu kỹ thuật cho các mã thanh khoản cao: quá mua/quá bán RSI, giao cắt MA, vượt/thủng MA200,
// đỉnh/đáy 52 tuần, khối lượng đột biến, MACD cắt tín hiệu và mẫu hình nến phiên gần nhất.
// Chạy mỗi ngày một lần bởi scripts/quet-ngay.ts, website chỉ đọc src/data/quet-tin-hieu.json.

import { macd, rsi, sma, type NenCB } from "@/lib/chi-bao";
import { mauHinhNen } from "@/lib/ky-thuat-them";
import { ghepNenPhien, layBangGia, layNenKhongCache } from "@/lib/mofi";

export type LoaiTinHieu =
  | "rsi-qua-ban"
  | "rsi-qua-mua"
  | "ma-cat-len"
  | "ma-cat-xuong"
  | "vuot-ma200"
  | "thung-ma200"
  | "dinh-52t"
  | "day-52t"
  | "kl-dot-bien"
  | "macd-cat-len"
  | "macd-cat-xuong"
  | "nen-tang"
  | "nen-giam";

export const LOAI: { k: LoaiTinHieu; ten: string; huong: "tang" | "giam" | "trung"; moTa: string }[] = [
  { k: "rsi-qua-ban", ten: "RSI quá bán", huong: "tang", moTa: "RSI 14 dưới 30" },
  { k: "rsi-qua-mua", ten: "RSI quá mua", huong: "giam", moTa: "RSI 14 trên 70" },
  { k: "ma-cat-len", ten: "MA20 cắt lên MA50", huong: "tang", moTa: "Giao cắt vàng trong 3 phiên gần nhất" },
  { k: "ma-cat-xuong", ten: "MA20 cắt xuống MA50", huong: "giam", moTa: "Giao cắt tử thần trong 3 phiên gần nhất" },
  { k: "vuot-ma200", ten: "Vượt MA200", huong: "tang", moTa: "Đóng cửa vượt lên MA200 trong 3 phiên gần nhất" },
  { k: "thung-ma200", ten: "Thủng MA200", huong: "giam", moTa: "Đóng cửa xuống dưới MA200 trong 3 phiên gần nhất" },
  { k: "dinh-52t", ten: "Đỉnh 52 tuần", huong: "tang", moTa: "Giá cao nhất phiên vượt đỉnh 250 phiên trước" },
  { k: "day-52t", ten: "Đáy 52 tuần", huong: "giam", moTa: "Giá thấp nhất phiên thủng đáy 250 phiên trước" },
  { k: "kl-dot-bien", ten: "Khối lượng đột biến", huong: "trung", moTa: "Khối lượng phiên gấp 2 lần trở lên trung bình 20 phiên" },
  { k: "macd-cat-len", ten: "MACD cắt lên", huong: "tang", moTa: "MACD cắt lên đường tín hiệu trong 3 phiên gần nhất" },
  { k: "macd-cat-xuong", ten: "MACD cắt xuống", huong: "giam", moTa: "MACD cắt xuống đường tín hiệu trong 3 phiên gần nhất" },
  { k: "nen-tang", ten: "Mẫu hình nến tăng", huong: "tang", moTa: "Nhấn chìm, búa, sao mai… ở phiên gần nhất" },
  { k: "nen-giam", ten: "Mẫu hình nến giảm", huong: "giam", moTa: "Nhấn chìm, sao băng, sao hôm… ở phiên gần nhất" },
];

export type DongQuet = {
  ma: string;
  ten: string;
  san: string;
  gia: number;
  phanTram: number;
  giaTriTb20: number; // đồng
  rsi: number | null;
  chiTiet: Record<string, string>; // loại tín hiệu → mô tả ngắn
};

const SO_MA = 400;
const GIA_TRI_TOI_THIEU = 2e9; // 2 tỷ đồng/phiên bình quân 20 phiên
const SO_PHIEN_CAT = 3;

// Phiên gần nhất (trong SO_PHIEN_CAT) mà a cắt b theo hướng cho trước; trả về số phiên trước, 0 là hôm nay
function catTrong(a: (number | null)[], b: (number | null)[], len: boolean) {
  const n = a.length;
  for (let i = n - 1; i >= Math.max(1, n - SO_PHIEN_CAT); i--) {
    const [x0, y0, x1, y1] = [a[i - 1], b[i - 1], a[i], b[i]];
    if (x0 == null || y0 == null || x1 == null || y1 == null) continue;
    if (len ? x0 <= y0 && x1 > y1 : x0 >= y0 && x1 < y1) return n - 1 - i;
  }
  return null;
}

const phienTruoc = (k: number) => (k === 0 ? "phiên gần nhất" : `${k} phiên trước`);

function quetMot(nen: NenCB[]) {
  const n = nen.length;
  if (n < 60) return null;
  const dong = nen.map((x) => x.close);
  const c = nen[n - 1];
  const ct: Record<string, string> = {};
  const r = rsi(dong)[n - 1];
  if (r != null && r < 30) ct["rsi-qua-ban"] = `RSI ${r.toFixed(1)}`;
  if (r != null && r > 70) ct["rsi-qua-mua"] = `RSI ${r.toFixed(1)}`;

  const m20 = sma(dong, 20);
  const m50 = sma(dong, 50);
  let k = catTrong(m20, m50, true);
  if (k != null) ct["ma-cat-len"] = phienTruoc(k);
  k = catTrong(m20, m50, false);
  if (k != null) ct["ma-cat-xuong"] = phienTruoc(k);

  if (n >= 201) {
    const m200 = sma(dong, 200);
    k = catTrong(dong, m200, true);
    if (k != null && c.close > m200[n - 1]!) ct["vuot-ma200"] = phienTruoc(k);
    k = catTrong(dong, m200, false);
    if (k != null && c.close < m200[n - 1]!) ct["thung-ma200"] = phienTruoc(k);
  }

  if (n >= 251) {
    const truoc = nen.slice(-251, -1);
    const dinh = Math.max(...truoc.map((x) => x.high));
    const day = Math.min(...truoc.map((x) => x.low));
    if (c.high > dinh) ct["dinh-52t"] = `đỉnh cũ ${(dinh / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}`;
    if (c.low < day) ct["day-52t"] = `đáy cũ ${(day / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}`;
  }

  const kl20 = nen.slice(-21, -1).reduce((s, x) => s + x.volume, 0) / 20;
  if (kl20 > 0 && c.volume >= 2 * kl20) ct["kl-dot-bien"] = `gấp ${(c.volume / kl20).toFixed(1).replace(".", ",")} lần`;

  const md = macd(dong);
  k = catTrong(md.duong, md.tin, true);
  if (k != null) ct["macd-cat-len"] = phienTruoc(k);
  k = catTrong(md.duong, md.tin, false);
  if (k != null) ct["macd-cat-xuong"] = phienTruoc(k);

  for (const mh of mauHinhNen(nen.slice(-20), 1)) {
    if (mh.huong === "tang") ct["nen-tang"] = mh.ten;
    if (mh.huong === "giam") ct["nen-giam"] = mh.ten;
  }

  const giaTriTb20 = nen.slice(-20).reduce((s, x) => s + x.volume * x.close, 0) / 20;
  return { ct, r, giaTriTb20 };
}

export async function quetTinHieu() {
  const bang = await layBangGia();
  const ung = bang.coPhieu.filter((cp) => cp.ma.length === 3 && cp.gia > 0).slice(0, SO_MA);
  const kq: DongQuet[] = [];
  let ngay = 0;
  // Tải theo lô để không dồn hàng trăm kết nối cùng lúc tới Mofi
  for (let i = 0; i < ung.length; i += 16) {
    await Promise.all(
      ung.slice(i, i + 16).map(async (cp) => {
        const tho = await layNenKhongCache(cp.ma).catch(() => null);
        if (!tho?.length) return;
        const nen = ghepNenPhien(tho, bang.phien?.ngay, { gia: cp.gia, kl: cp.khoiLuong });
        const q = quetMot(nen.slice(-400));
        if (!q || q.giaTriTb20 < GIA_TRI_TOI_THIEU) return;
        ngay = Math.max(ngay, nen[nen.length - 1].time);
        kq.push({
          ma: cp.ma,
          ten: cp.ten,
          san: cp.san,
          gia: cp.gia,
          phanTram: cp.phanTram,
          giaTriTb20: q.giaTriTb20,
          rsi: q.r,
          chiTiet: q.ct,
        });
      }),
    );
  }
  kq.sort((a, b) => b.giaTriTb20 - a.giaTriTb20);
  // Chỉ lưu mã có tín hiệu: trang không hiện các mã còn lại
  return { ngay, soMa: kq.length, ds: kq.filter((d) => Object.keys(d.chiTiet).length > 0) };
}

export type KetQuaQuetTinHieu = Awaited<ReturnType<typeof quetTinHieu>>;
