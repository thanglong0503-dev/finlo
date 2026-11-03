// FL Bắt đáy: bộ quy tắc cố định chạy trên nến ngày. Không dự báo giá, chỉ trả lời "theo quy tắc thì mã đang ở đâu".
// Mỗi phiên chỉ dùng dữ liệu tới phiên đó, nên có thể chạy lại trên lịch sử để biết quy tắc từng đúng sai ra sao.
//
// Bước 1, chọn mã (giá trị): giảm từ 20% so với đỉnh 1 năm, P/B thuộc nhóm rẻ nhất 25% lịch sử của mã, đang có lãi.
// Bước 2, thời điểm (kỹ thuật): đang rơi, giữ được đáy, hay đã vượt đỉnh ngắn hạn có khối lượng (tín hiệu mua kỹ thuật).
// Cắt lỗ dưới đáy một khoảng theo ATR. Tính cả T+2,5: mua xong phải đủ 3 phiên mới bán được.
// Kết quả kiểm chứng trên lịch sử nằm ở THONG_KE_BAT_DAY, kể cả phần kết quả không tốt.

import { atr, ema, flDongTien, rsi, sma, type NenCB } from "@/lib/chi-bao";

export const THAM_SO = {
  giamToiThieu: 0.2, // giảm từ đỉnh 252 phiên
  pbRe: 25, // P/B rẻ hơn hoặc bằng 25% lịch sử của mã
  rsiQuaBan: 35,
  phienDay: 120, // đáy phải là đáy thấp nhất của 120 phiên
  giuDayToiThieu: 3,
  giuDayToiDa: 30, // đáy quá cũ thì không còn là bắt đáy
  hoiToiDa: 0.18, // đã hồi quá 18% từ đáy thì không đuổi
  ruiRoToiDa: 0.12, // cắt lỗ xa quá 12% thì bỏ qua tín hiệu
  atrDem: 0.5,
  klXacNhan: 0.8, // khối lượng so với trung bình 20 phiên
  rMucTieu: 2,
  phienKiemTra: 40, // sau 40 phiên chưa đạt +1R thì thoát
  giuToiDa: 120,
  phienT25: 3, // phiên mua + 3 mới bán được
  phi: 0.004, // phí và thuế cả mua lẫn bán
};

export type TrangThaiDay = "mua" | "dang-giu" | "do-day" | "dao-roi" | "hoi-xa" | "ngoai-vung";
export type LyDoThoat = "cat-lo" | "hoa-von" | "chot-loi" | "het-gio" | "dang-mo";

export type LenhBatDay = {
  iTin: number;
  iMua: number;
  tinHieu: number; // thời điểm tín hiệu (giây)
  giaMua: number;
  catLo: number;
  catLoHienTai: number; // nâng lên giá mua khi đã lãi bằng mức rủi ro ban đầu
  mucTieu: number;
  iBan: number | null;
  ngayBan: number | null;
  giaBan: number | null;
  lai: number | null; // % sau phí, null khi đang mở
  lyDo: LyDoThoat;
};

export type DieuKien = { ten: string; dat: boolean; chiTiet: string; diem: number; toiDa: number };

export type KetQuaDay = {
  trangThai: TrangThaiDay;
  gia: number;
  dinh: number;
  giam: number; // âm, so với đỉnh 252 phiên
  day: number | null;
  phienTuDay: number | null;
  hoi: number | null;
  rsi: number | null;
  dieuKien: DieuKien[];
  catLo: number | null;
  ruiRo: number | null;
  giaTriTb20: number;
  lenh: LenhBatDay[];
  lenhMo: LenhBatDay | null;
  canhBaoBan: LyDoThoat | null; // phiên cuối vừa chạm điều kiện bán của lệnh đang mở
};

const so = (x: number, le = 1) => x.toLocaleString("vi-VN", { maximumFractionDigits: le });

// Chạy quy tắc kỹ thuật trên toàn bộ lịch sử: trả danh sách lệnh giả định và trạng thái ở phiên cuối
export function moPhongBatDay(nen: NenCB[], ts = THAM_SO): KetQuaDay | null {
  const n = nen.length;
  if (n < 130) return null;
  const dong = nen.map((x) => x.close);
  const r = rsi(dong);
  const e10 = ema(dong, 10);
  const m20 = sma(dong, 20);
  const kl20 = sma(nen.map((x) => x.volume), 20);
  const a = atr(nen);
  const dt = flDongTien(nen);

  const tinh = (i: number) => {
    const c = nen[i];
    let dinh = 0;
    for (let j = Math.max(0, i - 251); j <= i; j++) dinh = Math.max(dinh, nen[j].high);
    let iDay = i;
    for (let j = i; j >= Math.max(0, i - ts.phienDay + 1); j--) if (nen[j].low < nen[iDay].low) iDay = j;
    const day = nen[iDay].low;
    let rsiThap = Infinity;
    for (let j = Math.max(0, iDay - 5); j <= Math.min(i, iDay + 2); j++) rsiThap = Math.min(rsiThap, r[j] ?? Infinity);
    const quaBan = rsiThap < ts.rsiQuaBan;
    const tuoi = i - iDay;
    const vung = day / dinh - 1 <= -ts.giamToiThieu && quaBan && tuoi <= ts.giuDayToiDa;
    let dinh5 = 0;
    for (let j = Math.max(0, i - 5); j < i; j++) dinh5 = Math.max(dinh5, nen[j].high);
    const catLo = a[i] != null ? day - ts.atrDem * a[i]! : null;
    const ruiRo = catLo != null ? (c.close - catLo) / c.close : null;
    const xacNhan =
      vung &&
      tuoi >= ts.giuDayToiThieu &&
      c.close > dinh5 &&
      e10[i] != null &&
      c.close > e10[i]! &&
      c.close > c.open &&
      kl20[i] != null &&
      c.volume >= ts.klXacNhan * kl20[i]! &&
      c.close / day - 1 <= ts.hoiToiDa &&
      ruiRo != null &&
      ruiRo <= ts.ruiRoToiDa;
    return { dinh, giam: c.close / dinh - 1, iDay, day, quaBan, xacNhan, catLo, ruiRo, dinh5 };
  };

  const lenh: LenhBatDay[] = [];
  let mo: (LenhBatDay & { dinhDat: boolean }) | null = null;
  let canhBaoBan: LyDoThoat | null = null;

  for (let i = 60; i < n; i++) {
    if (mo) {
      const c = nen[i];
      const r1 = mo.giaMua - mo.catLo;
      if (c.close >= mo.giaMua + r1) mo.catLoHienTai = Math.max(mo.catLoHienTai, mo.giaMua);
      if (c.close >= mo.mucTieu) mo.dinhDat = true;
      const banDuoc = i >= mo.iMua + ts.phienT25 - 1 && i + 1 < n;
      let lyDo: LyDoThoat | null = null;
      if (c.close < mo.catLoHienTai) lyDo = mo.catLoHienTai > mo.catLo ? "hoa-von" : "cat-lo";
      else if (mo.dinhDat && m20[i] != null && c.close < m20[i]!) lyDo = "chot-loi";
      else if (i - mo.iMua >= ts.phienKiemTra && mo.catLoHienTai <= mo.catLo) lyDo = "het-gio";
      else if (i - mo.iMua >= ts.giuToiDa) lyDo = "het-gio";
      if (lyDo && banDuoc) {
        // Bán ở giá mở cửa phiên kế tiếp
        const ban = nen[i + 1].open;
        mo.iBan = i + 1;
        mo.ngayBan = nen[i + 1].time;
        mo.giaBan = ban;
        mo.lai = (ban / mo.giaMua - 1 - ts.phi) * 100;
        mo.lyDo = lyDo;
        lenh.push(mo);
        mo = null;
      } else if (lyDo && i === n - 1) canhBaoBan = lyDo;
      continue;
    }
    const t = tinh(i);
    if (t.xacNhan && i + 1 < n && t.catLo != null) {
      // Mua ở giá mở cửa phiên kế tiếp; rủi ro tính lại theo giá mua thật
      const giaMua = nen[i + 1].open;
      if (giaMua > t.catLo) {
        mo = {
          iTin: i,
          iMua: i + 1,
          tinHieu: nen[i].time,
          giaMua,
          catLo: t.catLo,
          catLoHienTai: t.catLo,
          mucTieu: giaMua + ts.rMucTieu * (giaMua - t.catLo),
          iBan: null,
          ngayBan: null,
          giaBan: null,
          lai: null,
          lyDo: "dang-mo",
          dinhDat: false,
        };
      }
    }
  }
  if (mo) lenh.push(mo);

  // Trạng thái ở phiên cuối
  const i = n - 1;
  const c = nen[i];
  const t = tinh(i);
  const tuoi = i - t.iDay;
  const hoi = c.close / t.day - 1;
  const rNay = r[i];
  const klTi = kl20[i] ? c.volume / kl20[i]! : null;

  let trangThai: TrangThaiDay;
  if (mo) trangThai = "dang-giu";
  else if (t.xacNhan) trangThai = "mua";
  else if (t.day / t.dinh - 1 > -ts.giamToiThieu || !t.quaBan || tuoi > ts.giuDayToiDa) trangThai = "ngoai-vung";
  else if (hoi > ts.hoiToiDa) trangThai = "hoi-xa";
  else if (tuoi < ts.giuDayToiThieu) trangThai = "dao-roi";
  else trangThai = "do-day";

  const dtNay = dt[i];
  const dtTruoc = dt[Math.max(0, i - 5)];
  const dieu = (ten: string, dat: boolean, chiTiet: string, toiDa: number): DieuKien => ({ ten, dat, chiTiet, toiDa, diem: dat ? toiDa : 0 });
  const dieuKien = [
    dieu("Từng quá bán", t.quaBan, `RSI quanh đáy dưới ${ts.rsiQuaBan}; RSI hôm nay ${rNay != null ? so(rNay) : "chưa có"}`, 5),
    dieu("Giữ được đáy", tuoi >= ts.giuDayToiThieu, tuoi === 0 ? "Hôm nay vừa tạo đáy mới" : `${tuoi} phiên chưa thủng đáy; cần từ ${ts.giuDayToiThieu} phiên`, 15),
    dieu("Vượt đỉnh ngắn hạn", c.close > t.dinh5 && e10[i] != null && c.close > e10[i]!, "Đóng cửa trên đỉnh 5 phiên trước và trên EMA10", 15),
    dieu("Có khối lượng", klTi != null && klTi >= ts.klXacNhan, klTi != null ? `Khối lượng bằng ${so(klTi * 100, 0)}% trung bình 20 phiên; cần từ ${so(ts.klXacNhan * 100, 0)}%` : "Chưa đủ dữ liệu", 5),
    dieu("Dòng tiền cải thiện", dtNay != null && dtTruoc != null && dtNay > dtTruoc, dtNay != null && dtTruoc != null ? `FL Dòng tiền ${so(dtTruoc, 0)} → ${so(dtNay, 0)} sau 5 phiên` : "Chưa đủ dữ liệu", 10),
  ];

  return {
    trangThai,
    gia: c.close,
    dinh: t.dinh,
    giam: t.giam,
    day: t.day,
    phienTuDay: tuoi,
    hoi,
    rsi: rNay,
    dieuKien,
    catLo: mo ? mo.catLoHienTai : t.catLo,
    ruiRo: mo ? (c.close - mo.catLoHienTai) / c.close : t.ruiRo,
    giaTriTb20: nen.slice(-20).reduce((s, x) => s + x.volume * x.close, 0) / Math.min(20, n),
    lenh,
    lenhMo: mo,
    canhBaoBan,
  };
}

// ===================== Kết luận cho một mã =====================

export type GiaTriDay = {
  diem: number | null; // P/B hôm nay cao hơn bao nhiêu % lịch sử của mã (0 rẻ nhất)
  boi: number | null;
  giaRe: number | null; // giá ứng với P/B ở mức rẻ (25%)
  giaThuongGap: number | null; // giá ứng với P/B thường gặp (50%)
  lnst: number | null; // lợi nhuận 4 quý, chỉ xét dấu
  soNam: number;
};

export type MaKetLuan = "xac-nhan" | "dang-giu" | "giu-day" | "dang-roi" | "da-hoi" | "cho-tin-hieu" | "chua-giam" | "chua-re" | "dang-lo" | "thieu-so";

export const KET_LUAN: Record<MaKetLuan, { nhan: string; mau: string; cau: string; vungRe: boolean }> = {
  "xac-nhan": { nhan: "Có tín hiệu mua", mau: "text-tang", vungRe: true, cau: "Đủ điều kiện vùng rẻ và vừa có tín hiệu mua kỹ thuật theo quy tắc." },
  "dang-giu": { nhan: "Tín hiệu mua đang chạy", mau: "text-tang", vungRe: true, cau: "Đủ điều kiện vùng rẻ, tín hiệu mua kỹ thuật trước đó chưa chạm điều kiện bán." },
  "giu-day": { nhan: "Rẻ, đang giữ đáy", mau: "text-dung", vungRe: true, cau: "Đủ điều kiện vùng rẻ, giá đã vài phiên không thủng đáy nhưng chưa có tín hiệu mua kỹ thuật." },
  "dang-roi": { nhan: "Rẻ, nhưng còn đang rơi", mau: "text-giam", vungRe: true, cau: "Đủ điều kiện vùng rẻ, nhưng vừa tạo đáy mới trong 3 phiên gần đây. Theo quy tắc, chưa có dấu hiệu dừng giảm." },
  "da-hoi": { nhan: "Rẻ, đã hồi khỏi đáy", mau: "text-dung", vungRe: true, cau: "Đủ điều kiện vùng rẻ, nhưng giá đã hồi hơn 18% từ đáy nên mức cắt lỗ theo đáy đã xa." },
  "cho-tin-hieu": { nhan: "Rẻ, chưa có tín hiệu", mau: "text-dung", vungRe: true, cau: "Đủ điều kiện vùng rẻ, nhưng chưa rõ một đáy theo quy tắc kỹ thuật." },
  "chua-giam": { nhan: "Chưa phải vùng đáy", mau: "text-chu-phu", vungRe: false, cau: "Giá chưa giảm từ 20% so với đỉnh 1 năm nên không xét bắt đáy." },
  "chua-re": { nhan: "Giảm nhưng chưa rẻ", mau: "text-chu-phu", vungRe: false, cau: "Giá đã giảm từ 20%, nhưng P/B chưa thuộc nhóm rẻ nhất 25% lịch sử của mã." },
  "dang-lo": { nhan: "Đang lỗ, không xét", mau: "text-giam", vungRe: false, cau: "Lợi nhuận 4 quý gần nhất âm. Quy tắc loại mã đang lỗ để tránh giá rẻ vì doanh nghiệp yếu đi." },
  "thieu-so": { nhan: "Thiếu dữ liệu", mau: "text-chu-phu", vungRe: false, cau: "Chưa đủ báo cáo tài chính hoặc lịch sử P/B để đánh giá." },
};

export function ketLuanDay(kt: KetQuaDay, gt: GiaTriDay | null, ts = THAM_SO) {
  const dieu = (ten: string, dat: boolean, chiTiet: string, toiDa: number): DieuKien => ({ ten, dat, chiTiet, toiDa, diem: dat ? toiDa : 0 });
  const giaTri = [
    dieu("Đã giảm sâu", kt.giam <= -ts.giamToiThieu, `Giá cách đỉnh 1 năm −${so(Math.abs(kt.giam) * 100)}%; cần từ −${so(ts.giamToiThieu * 100, 0)}%`, 15),
    dieu(
      "Rẻ so với lịch sử",
      gt?.diem != null && gt.diem <= ts.pbRe,
      gt?.diem != null ? `P/B ${so(gt.boi ?? 0, 2)} lần, cao hơn ${so(gt.diem, 0)}% số phiên trong ${so(gt.soNam, 0)} năm; cần từ ${ts.pbRe}% trở xuống` : "Chưa đủ dữ liệu P/B",
      25,
    ),
    dieu("Đang có lãi", gt?.lnst != null && gt.lnst > 0, gt?.lnst == null ? "Chưa có số lợi nhuận" : gt.lnst > 0 ? "Lợi nhuận 4 quý gần nhất dương" : "Lợi nhuận 4 quý gần nhất âm", 10),
  ];
  let ma: MaKetLuan;
  if (!gt || gt.diem == null || gt.lnst == null) ma = "thieu-so";
  else if (gt.lnst <= 0) ma = "dang-lo";
  else if (kt.giam > -ts.giamToiThieu) ma = "chua-giam";
  else if (gt.diem > ts.pbRe) ma = "chua-re";
  else if (kt.trangThai === "mua") ma = "xac-nhan";
  else if (kt.trangThai === "dang-giu") ma = "dang-giu";
  else if (kt.phienTuDay != null && kt.phienTuDay < ts.giuDayToiThieu) ma = "dang-roi";
  else if (kt.trangThai === "do-day") ma = "giu-day";
  else if (kt.trangThai === "hoi-xa") ma = "da-hoi";
  else ma = "cho-tin-hieu";
  return { ma, giaTri, thoiDiem: kt.dieuKien, diem: [...giaTri, ...kt.dieuKien].reduce((s, d) => s + d.diem, 0) };
}

// Số liệu kiểm chứng đo một lần bằng cách chạy lại quy tắc trên lịch sử, không nhìn trước tương lai.
// Lấy mẫu mỗi 20 phiên, chưa trừ phí; riêng dòng lệnh có cắt lỗ đã trừ phí và tính T+2,5.
export const THONG_KE_BAT_DAY = {
  ngayDo: "03/11/2026",
  phamVi: "254 mã có giá trị giao dịch bình quân từ 2 tỷ đồng/phiên, tín hiệu từ 2022",
  sauPhien: [
    {
      phien: 60,
      moiMa: { tb: 0.2, tv: -1.6, duong: 45.3, xau10: -22.8, vuot: -1.4, thangVni: 40.4, n: 12038 },
      vungRe: { tb: 4.8, tv: 1.2, duong: 52.5, xau10: -16.8, vuot: 0.4, thangVni: 43.0, n: 2139 },
      xacNhan: { tb: -2.0, tv: -3.6, duong: 39.2, xau10: -17.2, vuot: -4.2, thangVni: 30.4, n: 181 },
    },
    {
      phien: 120,
      moiMa: { tb: 1.3, tv: -1.9, duong: 46.3, xau10: -31.4, vuot: -2.7, thangVni: 38.1, n: 11319 },
      vungRe: { tb: 11.0, tv: 4.1, duong: 57.0, xau10: -22.9, vuot: 1.8, thangVni: 44.2, n: 1873 },
      xacNhan: { tb: -0.9, tv: -4.1, duong: 38.0, xau10: -25.7, vuot: -7.1, thangVni: 26.3, n: 137 },
    },
  ],
  theoNam: [
    { nam: 2022, vungRe: 13.6, moiMa: -10.6 },
    { nam: 2023, vungRe: 11.7, moiMa: 7.0 },
    { nam: 2024, vungRe: -1.2, moiMa: 1.7 },
    { nam: 2025, vungRe: 10.5, moiMa: 4.9 },
    { nam: 2026, vungRe: -7.0, moiMa: -5.0 },
  ],
  lenhCatLo: { n: 193, tb: -2.6, thang: 28.0, thangTb: 10.6, thuaTb: -7.7, teNhat: -20.1 },
  teNhatKhongCatLo: { vungRe: -89.5, xacNhan: -63.3 },
};
