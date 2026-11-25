// Kết luận Finlo: gộp mọi bộ phân tích của website thành hai danh sách chọn lọc.
//  - Tích sản: doanh nghiệp tốt (Fin Rating, sinh lời, chất lượng, sức khoẻ) ở mức giá chưa đắt, để nắm giữ dài.
//  - Đầu cơ: mã đang có đà và tín hiệu ngắn hạn (xu hướng, tín hiệu kỹ thuật, FL Bắt đáy, khối ngoại), nền tảng không quá yếu.
// Mỗi mã kèm nhận định của từng nguồn: nguồn nào ủng hộ, nguồn nào cảnh báo. Quy tắc cố định, không phải khuyến nghị.

import batDayTho from "@/data/bat-day.json";
import chiTietTho from "@/data/fin-rating-chi-tiet.json";
import dongTienTho from "@/data/dong-tien-ngoai.json";
import finRatingTho from "@/data/fin-rating.json";
import tinHieuTho from "@/data/quet-tin-hieu.json";
import { KET_LUAN, type MaKetLuan } from "@/lib/bat-day";
import type { DongTienMa } from "@/lib/cuoi-phien";
import { type ChiTietFinRating, type DongRating, type KetQuaFinRating } from "@/lib/fin-rating";
import { BAO_CAO, nhomCua } from "@/lib/khuyen-nghi";
import type { DongBatDay } from "@/lib/quet-bat-day";
import { LOAI, type DongQuet } from "@/lib/quet-tin-hieu";

const fr = finRatingTho as unknown as KetQuaFinRating;
const chiTiet = chiTietTho as unknown as ChiTietFinRating;
const batDay = new Map((batDayTho as unknown as { ds: DongBatDay[] }).ds.map((d) => [d.ma, d]));
const tinHieu = new Map((tinHieuTho as unknown as { ds: DongQuet[] }).ds.map((d) => [d.ma, d]));
const dongTien = dongTienTho as unknown as { ngay: string; ma: DongTienMa[] };
const ngoai = new Map(dongTien.ma.map((d) => [d.ma, d]));

const CHENH_TIN_DUOC = 80; // % chênh giữa giá trị (mô hình hoặc mục tiêu CTCK) và giá còn đáng tin

// Thứ tự trục trong Fin Rating: tt, sl, cl, sk, dg, ct, xh
const T = { tt: 0, sl: 1, cl: 2, sk: 3, dg: 4, ct: 5, xh: 6 } as const;

export type HuongNhanDinh = "tot" | "xau" | "trung";
export type NhanDinh = { nguon: string; huong: HuongNhanDinh; cau: string; href?: string };
export type MaKetLuanFinlo = {
  ma: string;
  ten: string;
  san: string;
  nganh: string | null;
  gia: number;
  giaTri20: number;
  diemTichSan: number;
  diemDauCo: number;
  dongThuan: { tot: number; xau: number };
  nhanDinh: NhanDinh[];
  finRating: number;
};

const so = (x: number, le = 1) => x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le });
const pt = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${so(Math.abs(x))}%`;
const ty = (trieu: number) => `${so(Math.abs(trieu) / 1000, 0)} tỷ`;

// Báo cáo CTCK 180 ngày tính đến mốc dữ liệu; mỗi CTCK lấy báo cáo mới nhất có giá mục tiêu
function ctck(ma: string, moc: string) {
  const tu = new Date(Date.parse(moc) - 180 * 86400_000).toISOString().slice(0, 10);
  const daCo = new Set<string>();
  const ds = BAO_CAO.filter((b) => b.ma === ma && b.ngay >= tu && b.ngay <= moc && b.gia)
    .sort((a, b) => b.ngay.localeCompare(a.ngay))
    .filter((b) => (daCo.has(b.ctck) ? false : (daCo.add(b.ctck), true)));
  const dem = { mua: 0, giu: 0, ban: 0 };
  for (const b of ds) {
    const n = nhomCua(b);
    if (n) dem[n]++;
  }
  const gia = ds.map((b) => b.gia!).sort((a, b) => a - b);
  return { so: ds.length, dem, giaTV: gia.length ? gia[Math.floor(gia.length / 2)] : null };
}

// Số phiên liên tiếp mua (dương) hoặc bán (âm) ròng tính đến phiên gần nhất
function chuoi(rong: number[]) {
  let n = 0;
  for (let i = rong.length - 1; i >= 0; i--) {
    if (rong[i] > 0 && n >= 0) n++;
    else if (rong[i] < 0 && n <= 0) n--;
    else break;
  }
  return n;
}

function danhGia(d: DongRating, giaNay: number, moc: string): MaKetLuanFinlo {
  const nd: NhanDinh[] = [];
  const truc = (k: keyof typeof T) => d.truc[T[k]];
  const ct = chiTiet[d.ma] ?? {};
  const xep = (x: number, tot: number, xau: number): HuongNhanDinh => (x >= tot ? "tot" : x < xau ? "xau" : "trung");

  // 1. Fin Rating tổng và các trục nền tảng
  const hon = Math.round((1 - d.hang / fr.soMa) * 100);
  nd.push({ nguon: "Fin Rating", huong: xep(d.diem, 6.5, 4.5), cau: `${so(d.diem, 2)}/10, cao hơn ${hon}% số mã được chấm`, href: `/co-phieu/${d.ma}/fin-rating` });
  const nenTang = [
    { k: "sl" as const, ten: "sinh lời" },
    { k: "cl" as const, ten: "chất lượng lợi nhuận" },
    { k: "sk" as const, ten: "sức khoẻ tài chính" },
    { k: "tt" as const, ten: "tăng trưởng" },
  ].map((x) => ({ ...x, v: truc(x.k) }));
  const manh = nenTang.filter((x) => x.v != null && x.v >= 7);
  const yeu = nenTang.filter((x) => x.v != null && x.v < 4);
  if (manh.length) nd.push({ nguon: "Nền tảng doanh nghiệp", huong: "tot", cau: `Mạnh về ${manh.map((x) => `${x.ten} (${so(x.v!, 1)})`).join(", ")}`, href: `/co-phieu/${d.ma}/fin-rating` });
  if (yeu.length) nd.push({ nguon: "Nền tảng doanh nghiệp", huong: "xau", cau: `Yếu về ${yeu.map((x) => `${x.ten} (${so(x.v!, 1)})`).join(", ")}`, href: `/co-phieu/${d.ma}/fin-rating` });

  // 2. Mô hình định giá, theo giá hiện tại
  let chenh: number | null = null;
  if (d.giaTri && d.soPp >= 3 && d.giaTri / giaNay <= 3 && d.giaTri / giaNay >= 0.25) {
    chenh = (d.giaTri / giaNay - 1) * 100;
    // Chênh quá lớn thường do lợi nhuận bất thường hoặc tái cấu trúc: ghi nhận nhưng không coi là điểm cộng
    const quaXa = chenh > CHENH_TIN_DUOC;
    nd.push({
      nguon: "Định giá",
      huong: quaXa ? "trung" : xep(chenh, 15, -15),
      cau: `Giá trị ước tính ${so(d.giaTri / 1000, 2)}, ${chenh >= 0 ? "cao hơn" : "thấp hơn"} giá ${so(Math.abs(chenh))}% (${d.soPp} phương pháp)${quaXa ? "; chênh quá lớn nên chưa tính là điểm cộng, cần xem lại từng phương pháp" : ""}`,
      href: `/co-phieu/${d.ma}/phan-tich`,
    });
  }

  // 3. Cổ tức
  const tySuat = d.coTucCp > 0 ? (d.coTucCp / giaNay) * 100 : 0;
  if (tySuat >= 5 && tySuat <= 15 && d.soNamTra >= 4) nd.push({ nguon: "Cổ tức", huong: "tot", cau: `Tỷ suất ${so(tySuat)}%, trả tiền mặt ${d.soNamTra}/5 năm`, href: "/co-phieu-co-tuc" });

  // 4. Xu hướng giá
  const xh = truc("xh");
  const ma200 = ct.giaMa200?.[0];
  if (xh != null)
    nd.push({
      nguon: "Xu hướng giá",
      huong: xep(xh, 6.5, 3.5),
      cau: `Điểm xu hướng ${so(xh)}${ma200 != null ? `, giá ${ma200 >= 0 ? "trên" : "dưới"} MA200 ${so(Math.abs(ma200))}%` : ""}${ct.lech6t ? `, ${ct.lech6t[0] >= 0 ? "hơn" : "kém"} VN-Index ${so(Math.abs(ct.lech6t[0]))} điểm % trong 6 tháng` : ""}`,
      href: `/co-phieu/${d.ma}/ky-thuat`,
    });

  // 5. FL Bắt đáy
  const bd = batDay.get(d.ma);
  let batDayTot = false;
  if (bd && KET_LUAN[bd.ketLuan as MaKetLuan]?.vungRe) {
    const k = bd.ketLuan as MaKetLuan;
    batDayTot = k === "xac-nhan" || k === "dang-giu";
    nd.push({ nguon: "FL Bắt đáy", huong: batDayTot ? "tot" : k === "dang-roi" ? "xau" : "trung", cau: `${KET_LUAN[k].nhan}; giá cách đỉnh 1 năm ${pt(bd.giam * 100)}`, href: `/bat-day/${d.ma}` });
  } else if (bd?.ketLuan === "dang-lo") nd.push({ nguon: "FL Bắt đáy", huong: "xau", cau: KET_LUAN["dang-lo"].nhan, href: `/bat-day/${d.ma}` });

  // 6. Tín hiệu kỹ thuật phiên gần nhất
  const th = tinHieu.get(d.ma);
  let tinTang = 0;
  if (th) {
    const ds = Object.keys(th.chiTiet).map((k) => LOAI.find((l) => l.k === k)).filter((l): l is (typeof LOAI)[number] => !!l);
    tinTang = ds.filter((l) => l.huong === "tang").length - ds.filter((l) => l.huong === "giam").length;
    if (ds.length) nd.push({ nguon: "Tín hiệu kỹ thuật", huong: tinTang > 0 ? "tot" : tinTang < 0 ? "xau" : "trung", cau: ds.map((l) => l.ten).join(", "), href: "/quet-tin-hieu" });
  }

  // 7. Khối ngoại 10 phiên
  const ng = ngoai.get(d.ma);
  let ngoaiTot = false;
  if (ng) {
    const r10 = ng.rong.slice(-10).reduce((s, x) => s + x, 0);
    const c = chuoi(ng.rong);
    if (Math.abs(r10) >= 1000) {
      ngoaiTot = r10 > 0 && c >= 2;
      nd.push({
        nguon: "Khối ngoại",
        huong: r10 > 0 && c >= 0 ? "tot" : r10 < 0 && c <= 0 ? "xau" : "trung",
        cau: `${r10 > 0 ? "Mua" : "Bán"} ròng ${ty(r10)} trong 10 phiên${Math.abs(c) >= 2 ? `, ${c > 0 ? "mua" : "bán"} ${Math.abs(c)} phiên liên tiếp` : ""}`,
        href: "/dong-tien-ngoai",
      });
    }
  }

  // 8. Công ty chứng khoán
  const kn = ctck(d.ma, moc);
  let ctckTot = false;
  if (kn.so) {
    const lech = kn.giaTV ? (kn.giaTV / giaNay - 1) * 100 : null;
    // Giá mục tiêu cao hơn giá quá xa thường là báo cáo chưa điều chỉnh theo đợt chia, thưởng cổ phiếu
    const lechTin = lech != null && lech <= CHENH_TIN_DUOC;
    ctckTot = kn.dem.mua > kn.dem.ban + kn.dem.giu && lechTin && lech! >= 10;
    const xau = kn.dem.ban > kn.dem.mua || (lech != null && lech < 0);
    nd.push({
      nguon: "Công ty chứng khoán",
      huong: ctckTot ? "tot" : xau ? "xau" : "trung",
      cau: `${kn.so} CTCK trong 6 tháng: ${kn.dem.mua} mua, ${kn.dem.giu} nắm giữ, ${kn.dem.ban} bán${kn.giaTV && lech != null ? `; giá mục tiêu trung vị ${so(kn.giaTV / 1000, 2)} (${pt(lech)})` : ""}${lech != null && !lechTin ? "; mục tiêu xa giá bất thường, có thể chưa điều chỉnh theo chia cổ phiếu" : ""}`,
      href: "/khuyen-nghi",
    });
  }

  // ---- Điểm tích sản: chất lượng là chính, định giá là phụ, có thưởng/phạt nhỏ từ CTCK và cổ tức
  const v = (x: number | null, mac = 5) => x ?? mac;
  let tichSan = 0.3 * d.diem + 0.2 * v(truc("sl")) + 0.15 * v(truc("cl")) + 0.1 * v(truc("sk")) + 0.15 * v(truc("dg")) + 0.1 * v(truc("ct"));
  if (ctckTot) tichSan += 0.3;
  if (chenh != null && chenh < -15) tichSan -= 0.5;
  if (xh != null && xh < 3) tichSan -= 0.3;

  // ---- Điểm đầu cơ: đà giá và tín hiệu ngắn hạn là chính
  let dauCo = 0.45 * v(xh) + 0.15 * v(truc("tt")) + 0.15 * d.diem;
  dauCo += Math.max(-1, Math.min(2, tinTang)) * 0.5;
  if (batDayTot) dauCo += 1;
  if (ngoaiTot) dauCo += 0.7;
  if (ctckTot) dauCo += 0.3;

  return {
    ma: d.ma,
    ten: d.ten,
    san: d.san,
    nganh: d.nganh,
    gia: giaNay,
    giaTri20: d.giaTri20,
    diemTichSan: Math.round(tichSan * 100) / 100,
    diemDauCo: Math.round(dauCo * 100) / 100,
    dongThuan: { tot: nd.filter((x) => x.huong === "tot").length, xau: nd.filter((x) => x.huong === "xau").length },
    nhanDinh: nd,
    finRating: d.diem,
  };
}

export const DIEU_KIEN_TICH_SAN = [
  "Giá trị giao dịch bình quân từ 3 tỷ đồng/phiên",
  "Fin Rating từ 6,5 và sinh lời từ 6, sức khoẻ tài chính và chất lượng lợi nhuận từ 5",
  "Không đắt hơn 15% so với giá trị ước tính của mô hình định giá (nếu tính được)",
  "Số nguồn ủng hộ nhiều hơn số nguồn cảnh báo",
];
export const DIEU_KIEN_DAU_CO = [
  "Giá trị giao dịch bình quân từ 10 tỷ đồng/phiên",
  "Fin Rating từ 5 để tránh doanh nghiệp quá yếu",
  "Có ít nhất 2 tín hiệu ngắn hạn: điểm xu hướng từ 6,5, tín hiệu kỹ thuật tăng, FL Bắt đáy có tín hiệu mua, khối ngoại mua ròng liên tiếp, giá trên MA50",
  "Số nguồn ủng hộ nhiều hơn số nguồn cảnh báo",
];

export function ketLuanFinlo(giaMoi: Map<string, number>, soMa = 10) {
  const moc = dongTien.ngay;
  const ds = fr.ds.map((d) => ({ d, k: danhGia(d, giaMoi.get(d.ma) ?? d.gia, moc) }));

  const tichSan = ds
    .filter(({ d, k }) => {
      const t = d.truc;
      const chenh = k.nhanDinh.find((x) => x.nguon === "Định giá");
      return (
        d.giaTri20 >= 3e9 &&
        d.diem >= 6.5 &&
        (t[T.sl] ?? 0) >= 6 &&
        (t[T.sk] ?? 5) >= 5 &&
        (t[T.cl] ?? 5) >= 5 &&
        chenh?.huong !== "xau" &&
        k.dongThuan.tot > k.dongThuan.xau
      );
    })
    .sort((a, b) => b.k.diemTichSan - a.k.diemTichSan)
    .slice(0, soMa)
    .map((x) => x.k);
  // Mỗi mã chỉ nằm ở một danh sách: đã hợp tích sản thì không lặp lại ở đầu cơ
  const daChon = new Set(tichSan.map((x) => x.ma));

  const dauCo = ds
    .filter(({ d, k }) => {
      const ct = chiTiet[d.ma] ?? {};
      const tin = [
        (d.truc[T.xh] ?? 0) >= 6.5,
        k.nhanDinh.some((x) => x.nguon === "Tín hiệu kỹ thuật" && x.huong === "tot"),
        k.nhanDinh.some((x) => x.nguon === "FL Bắt đáy" && x.huong === "tot"),
        k.nhanDinh.some((x) => x.nguon === "Khối ngoại" && x.huong === "tot"),
        (ct.giaMa50?.[0] ?? -1) > 0,
      ].filter(Boolean).length;
      return d.giaTri20 >= 1e10 && d.diem >= 5 && tin >= 2 && k.dongThuan.tot > k.dongThuan.xau && !daChon.has(d.ma);
    })
    .sort((a, b) => b.k.diemDauCo - a.k.diemDauCo)
    .slice(0, soMa)
    .map((x) => x.k);

  return { tichSan, dauCo, ngayFr: fr.ngay, ngayNgay: moc, soMa: fr.soMa, tenNganh: Object.fromEntries(Object.entries(fr.nganh).map(([k, v]) => [k, v.ten])) };
}
