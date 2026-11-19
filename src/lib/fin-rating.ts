// Fin Rating: điểm 1 đến 10 cho từng cổ phiếu, chấm theo 7 trục bằng thứ hạng phần trăm của từng chỉ tiêu.
// Mỗi chỉ tiêu so với toàn thị trường; riêng sinh lời, chất lượng và sức khoẻ so trong cùng loại hình
// (doanh nghiệp thường, ngân hàng, chứng khoán, bảo hiểm) vì cùng một con số mang nghĩa khác nhau giữa các loại.
// Quét mỗi tuần bởi scripts/quet-fin-rating.ts, website chỉ đọc src/data/fin-rating*.json.

import { sma } from "@/lib/chi-bao";

export type MaTruc = "tt" | "sl" | "cl" | "sk" | "dg" | "ct" | "xh";

export const TRUC: { ma: MaTruc; ten: string; ngan: string; trongSo: number; moTa: string }[] = [
  { ma: "tt", ten: "Tăng trưởng", ngan: "Tăng trưởng", trongSo: 15, moTa: "Doanh thu và lợi nhuận tăng nhanh, đều qua các quý" },
  { ma: "sl", ten: "Khả năng sinh lời", ngan: "Sinh lời", trongSo: 20, moTa: "ROE, ROA, biên lợi nhuận; ngân hàng thêm NIM và CIR" },
  { ma: "cl", ten: "Chất lượng lợi nhuận", ngan: "Chất lượng", trongSo: 15, moTa: "Lãi có thành tiền không, ROIC so với chi phí vốn, F-Score; ngân hàng là nợ xấu và chi phí tín dụng" },
  { ma: "sk", ten: "Sức khoẻ tài chính", ngan: "Sức khoẻ", trongSo: 15, moTa: "Nợ vay, khả năng trả lãi, thanh khoản; ngân hàng là CAR, LDR và bộ đệm dự phòng" },
  { ma: "dg", ten: "Định giá", ngan: "Định giá", trongSo: 15, moTa: "Giá so với giá trị ước tính của Finlo, so với lịch sử của chính mã và với ngành" },
  { ma: "ct", ten: "Cổ tức và cổ đông", ngan: "Cổ tức", trongSo: 10, moTa: "Tỷ suất cổ tức tiền mặt, số năm trả đều, tỷ lệ chi trả bền vững" },
  { ma: "xh", ten: "Xu hướng giá", ngan: "Xu hướng", trongSo: 10, moTa: "Mạnh hơn hay yếu hơn VN-Index, giá so với đường trung bình 50 và 200 phiên" },
];

const THUONG = ["thuong"];
const NH = ["ngan_hang"];
const CK = ["chung_khoan"];

export type ChiTieu = {
  k: string;
  truc: MaTruc;
  ten: string;
  tot: "cao" | "thap";
  donVi: "%" | "x" | "diem" | "nam" | "quy" | "pv";
  theoLoai?: boolean; // so trong cùng loại hình
  loai?: string[]; // chỉ áp cho các loại này; bỏ trống là mọi loại
};

export const CHI_TIEU: ChiTieu[] = [
  { k: "dt3", truc: "tt", ten: "Doanh thu tăng kép 3 năm", tot: "cao", donVi: "%" },
  { k: "ln3", truc: "tt", ten: "Lợi nhuận tăng kép 3 năm", tot: "cao", donVi: "%" },
  { k: "lnCungKy", truc: "tt", ten: "Lợi nhuận 4 quý so với cùng kỳ", tot: "cao", donVi: "%" },
  { k: "quyTang", truc: "tt", ten: "Số quý lãi tăng so với cùng kỳ, trong 4 quý gần nhất", tot: "cao", donVi: "quy" },

  { k: "roe", truc: "sl", ten: "ROE 4 quý", tot: "cao", donVi: "%", theoLoai: true },
  { k: "roeTb", truc: "sl", ten: "ROE bình quân 5 năm", tot: "cao", donVi: "%", theoLoai: true },
  { k: "roa", truc: "sl", ten: "ROA 4 quý", tot: "cao", donVi: "%", theoLoai: true },
  { k: "bienRong", truc: "sl", ten: "Biên lợi nhuận ròng", tot: "cao", donVi: "%", theoLoai: true, loai: ["thuong", "chung_khoan", "bao_hiem"] },
  { k: "roic", truc: "sl", ten: "ROIC", tot: "cao", donVi: "%", theoLoai: true, loai: THUONG },
  { k: "nim", truc: "sl", ten: "Biên lãi thuần (NIM)", tot: "cao", donVi: "%", theoLoai: true, loai: NH },
  { k: "cir", truc: "sl", ten: "Chi phí trên thu nhập (CIR)", tot: "thap", donVi: "%", theoLoai: true, loai: NH },

  { k: "fScore", truc: "cl", ten: "Piotroski F-Score", tot: "cao", donVi: "diem", theoLoai: true, loai: THUONG },
  { k: "tyLeTien", truc: "cl", ten: "Tiền kinh doanh trên lợi nhuận, 3 năm", tot: "cao", donVi: "x", theoLoai: true, loai: THUONG },
  { k: "donTich", truc: "cl", ten: "Lợi nhuận dồn tích trên tài sản", tot: "thap", donVi: "%", theoLoai: true, loai: THUONG },
  { k: "roicTrenWacc", truc: "cl", ten: "ROIC trừ chi phí vốn", tot: "cao", donVi: "pv", theoLoai: true, loai: THUONG },
  { k: "tinDung", truc: "cl", ten: "Chi phí tín dụng", tot: "thap", donVi: "%", theoLoai: true, loai: NH },
  { k: "noXau", truc: "cl", ten: "Tỷ lệ nợ xấu", tot: "thap", donVi: "%", theoLoai: true, loai: NH },
  { k: "ngoaiLai", truc: "cl", ten: "Thu nhập ngoài lãi", tot: "cao", donVi: "%", theoLoai: true, loai: NH },
  { k: "tyTrongTuDoanh", truc: "cl", ten: "Tỷ trọng tự doanh", tot: "thap", donVi: "%", theoLoai: true, loai: CK },
  { k: "chuaThucHien", truc: "cl", ten: "Lãi chưa thực hiện trên vốn chủ", tot: "thap", donVi: "%", theoLoai: true, loai: CK },
  { k: "chenh", truc: "cl", ten: "Chênh lệch lãi cho vay ký quỹ", tot: "cao", donVi: "pv", theoLoai: true, loai: CK },

  { k: "noEbitda", truc: "sk", ten: "Nợ ròng / EBITDA", tot: "thap", donVi: "x", theoLoai: true, loai: THUONG },
  { k: "phuLai", truc: "sk", ten: "Lợi nhuận che lãi vay", tot: "cao", donVi: "x", theoLoai: true, loai: ["thuong", "chung_khoan"] },
  { k: "hienHanh", truc: "sk", ten: "Thanh toán hiện hành", tot: "cao", donVi: "x", theoLoai: true, loai: THUONG },
  { k: "vayVon", truc: "sk", ten: "Nợ vay / vốn chủ", tot: "thap", donVi: "x", theoLoai: true, loai: THUONG },
  { k: "car", truc: "sk", ten: "Hệ số an toàn vốn (CAR)", tot: "cao", donVi: "%", theoLoai: true, loai: NH },
  { k: "ldr", truc: "sk", ten: "Cho vay / tiền gửi (LDR thô)", tot: "thap", donVi: "%", theoLoai: true, loai: NH },
  { k: "baoPhu", truc: "sk", ten: "Dự phòng bao phủ nợ xấu", tot: "cao", donVi: "%", theoLoai: true, loai: NH },
  { k: "kyQuy", truc: "sk", ten: "Dư nợ ký quỹ / vốn chủ", tot: "thap", donVi: "%", theoLoai: true, loai: CK },
  { k: "donBay", truc: "sk", ten: "Tài sản / vốn chủ", tot: "thap", donVi: "x", theoLoai: true, loai: ["ngan_hang", "chung_khoan", "bao_hiem"] },

  { k: "tiemNang", truc: "dg", ten: "Giá trị ước tính so với giá", tot: "cao", donVi: "%" },
  { k: "peViTri", truc: "dg", ten: "P/E so với 5 năm của chính mã (phân vị)", tot: "thap", donVi: "%" },
  { k: "pbViTri", truc: "dg", ten: "P/B so với 5 năm của chính mã (phân vị)", tot: "thap", donVi: "%" },
  { k: "peSoNganh", truc: "dg", ten: "P/E so với trung vị ngành", tot: "thap", donVi: "x" },

  { k: "tySuat", truc: "ct", ten: "Tỷ suất cổ tức tiền mặt", tot: "cao", donVi: "%" },
  { k: "soNamTra", truc: "ct", ten: "Số năm trả cổ tức tiền mặt, trong 5 năm", tot: "cao", donVi: "nam" },
  { k: "chiTraLech", truc: "ct", ten: "Độ lệch tỷ lệ chi trả khỏi vùng bền vững 50%", tot: "thap", donVi: "pv" },

  { k: "lech6t", truc: "xh", ten: "Hơn VN-Index trong 6 tháng", tot: "cao", donVi: "pv" },
  { k: "lech12t", truc: "xh", ten: "Hơn VN-Index trong 1 năm", tot: "cao", donVi: "pv" },
  { k: "giaMa50", truc: "xh", ten: "Giá so với MA50", tot: "cao", donVi: "%" },
  { k: "giaMa200", truc: "xh", ten: "Giá so với MA200", tot: "cao", donVi: "%" },
];

export const apDung = (c: ChiTieu, loai: string) => !c.loai || c.loai.includes(loai);

// Xu hướng giá và thanh khoản từ nến ngày (giá theo đồng)
export function xuHuongGia(nen: { time: number; close: number; volume: number }[], vni: { time: number; close: number }[]) {
  const ngay = (t: number) => Math.floor((t + 7 * 3600) / 86400);
  const chiSo = new Map(vni.map((c) => [ngay(c.time), c.close]));
  const cap = nen.filter((c) => chiSo.has(ngay(c.time))).map((c) => ({ ma: c.close, cs: chiSo.get(ngay(c.time))! }));
  const lech = (phien: number) => {
    if (cap.length <= phien) return null;
    const a = cap[cap.length - 1];
    const b = cap[cap.length - 1 - phien];
    return (a.ma / b.ma - a.cs / b.cs) * 100;
  };
  const dong = nen.map((x) => x.close);
  const gia = dong[dong.length - 1];
  const m50 = sma(dong, 50).at(-1);
  const m200 = sma(dong, 200).at(-1);
  const gan = nen.slice(-20);
  return {
    lech6t: lech(126),
    lech12t: lech(252),
    giaMa50: m50 ? (gia / m50 - 1) * 100 : null,
    giaMa200: m200 ? (gia / m200 - 1) * 100 : null,
    giaTri20: gan.length ? gan.reduce((s, x) => s + x.close * x.volume, 0) / gan.length : 0,
  };
}

export type DongTho = { ma: string; loai: string; tho: Record<string, number | null | undefined> };
export type DiemMa = { truc: (number | null)[]; tong: number | null; chiTieu: Record<string, number> };

const SO_TRUC_TOI_THIEU = 5;

// Thứ hạng phần trăm có xử lý số bằng nhau: (số nhỏ hơn + nửa số bằng) / tổng
function phanVi(ds: number[]) {
  const s = [...ds].sort((a, b) => a - b);
  return (x: number) => {
    let lo = 0;
    let hi = s.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (s[m] < x) lo = m + 1;
      else hi = m;
    }
    let bang = lo;
    while (bang < s.length && s[bang] === x) bang++;
    return (lo + (bang - lo) / 2) / s.length;
  };
}

export function chamDiem(ds: DongTho[]): Record<string, DiemMa> {
  const kq: Record<string, DiemMa> = Object.fromEntries(ds.map((d) => [d.ma, { truc: [], tong: null, chiTieu: {} }]));
  for (const c of CHI_TIEU) {
    const nhom = new Map<string, DongTho[]>();
    for (const d of ds) {
      if (!apDung(c, d.loai)) continue;
      const x = d.tho[c.k];
      if (x == null || !Number.isFinite(x)) continue;
      const khoa = c.theoLoai ? d.loai : "*";
      nhom.set(khoa, [...(nhom.get(khoa) ?? []), d]);
    }
    for (const thanh of nhom.values()) {
      // Nhóm quá nhỏ thì thứ hạng vô nghĩa
      if (thanh.length < 5) continue;
      const pv = phanVi(thanh.map((d) => d.tho[c.k] as number));
      for (const d of thanh) {
        const p = pv(d.tho[c.k] as number);
        kq[d.ma].chiTieu[c.k] = Math.round((c.tot === "cao" ? p : 1 - p) * 100);
      }
    }
  }
  for (const d of ds) {
    const m = kq[d.ma];
    let tong = 0;
    let trongSo = 0;
    m.truc = TRUC.map((t) => {
      const cua = CHI_TIEU.filter((c) => c.truc === t.ma && apDung(c, d.loai));
      const co = cua.map((c) => m.chiTieu[c.k]).filter((x): x is number => x != null);
      if (!cua.length || co.length < Math.ceil(cua.length / 2)) return null;
      const diem = 1 + (9 * co.reduce((s, x) => s + x, 0)) / co.length / 100;
      tong += diem * t.trongSo;
      trongSo += t.trongSo;
      return Math.round(diem * 100) / 100;
    });
    m.tong = m.truc.filter((x) => x != null).length >= SO_TRUC_TOI_THIEU ? Math.round((tong / trongSo) * 100) / 100 : null;
  }
  return kq;
}

// ---- Kiểu dữ liệu của file kết quả

export type DongRating = {
  ma: string;
  ten: string;
  san: string;
  nganh: string | null; // khoá ngành
  loai: string;
  gia: number; // đồng, giá lúc quét
  diem: number;
  truc: (number | null)[];
  hang: number;
  giaTri: number | null; // giá trị ước tính tổng hợp, đồng/cp
  giaTriThap: number | null;
  giaTriCao: number | null;
  soPp: number; // số phương pháp định giá được tính vào tổng hợp
  coTucCp: number; // cổ tức tiền mặt 4 quý, đồng/cp
  soNamTra: number;
  chiTra: number | null;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  giaTri20: number; // giá trị giao dịch bình quân 20 phiên, đồng
};

export type KetQuaFinRating = {
  ngay: number;
  soMa: number;
  thiTruong: (number | null)[];
  nganh: Record<string, { ten: string; soMa: number; tb: (number | null)[]; diem: number }>;
  ds: DongRating[];
};

// Chi tiết: mã -> chỉ tiêu -> [giá trị thô, điểm 0..100]
export type ChiTietFinRating = Record<string, Record<string, [number, number | null]>>;

export const TEN_LOAI: Record<string, string> = { thuong: "doanh nghiệp", ngan_hang: "ngân hàng", chung_khoan: "công ty chứng khoán", bao_hiem: "công ty bảo hiểm" };

// Xếp loại theo điểm, dùng cho nhãn màu
export function xepLoai(d: number) {
  if (d >= 8) return { ten: "Rất tốt", mau: "text-tang" };
  if (d >= 6.5) return { ten: "Tốt", mau: "text-tang" };
  if (d >= 4.5) return { ten: "Trung bình", mau: "text-dung" };
  if (d >= 3) return { ten: "Yếu", mau: "text-giam" };
  return { ten: "Rất yếu", mau: "text-giam" };
}
