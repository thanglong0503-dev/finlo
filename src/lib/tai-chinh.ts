import type { BaoCao, MucBaoCao } from "@/lib/mofi";

// Tính các chỉ số định giá và hiệu quả từ báo cáo tài chính (triệu đồng) và giá hiện tại (đồng)

const chuanTen = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Tìm khoản mục theo tên, thử lần lượt các tên (mẫu ngân hàng/chứng khoán đặt tên khác doanh nghiệp thường)
function tim(bc: BaoCao, nhom: MucBaoCao["nhom"], ...ten: string[]) {
  for (const t of ten) {
    const m = bc.muc.find((x) => x.nhom === nhom && chuanTen(x.ten) === t);
    if (m) return m;
  }
  return undefined;
}

// Tổng 4 quý gần nhất (TTM); thiếu quý nào thì không tính
function ttm(m: MucBaoCao | undefined) {
  if (!m) return null;
  const bon = m.q.slice(-4);
  if (bon.length < 4 || bon.some((v) => v == null)) return null;
  return (bon as number[]).reduce((s, v) => s + v, 0);
}

const cuoi = (m: MucBaoCao | undefined) => m?.q[m.q.length - 1] ?? null;

const chia = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : a / b);

// Tăng trưởng quý gần nhất so với cùng kỳ năm trước
function cungKy(m: MucBaoCao | undefined) {
  if (!m || m.q.length < 5) return null;
  const nay = m.q[m.q.length - 1];
  const truoc = m.q[m.q.length - 5];
  if (nay == null || truoc == null || truoc <= 0) return null;
  return (nay / truoc - 1) * 100;
}

export type ChiSoTaiChinh = {
  ky: string;
  pe: number | null;
  pb: number | null;
  eps: number | null; // đồng/cổ phiếu, 4 quý gần nhất
  bvps: number | null; // giá trị sổ sách đồng/cổ phiếu
  roe: number | null; // %
  roa: number | null; // %
  bienGop: number | null; // %
  bienRong: number | null; // %
  noTrenVon: number | null; // lần
  tangTruongLN: number | null; // % so với cùng kỳ
  tangTruongDT: number | null; // % so với cùng kỳ
};

export function tinhChiSo(bc: BaoCao, gia: number, soCoPhieu: number | null): ChiSoTaiChinh {
  const lnMe = tim(bc, "kqkd", "lợi nhuận sau thuế của công ty mẹ", "lợi nhuận sau thuế thu nhập doanh nghiệp");
  const doanhThu = tim(bc, "kqkd", "doanh thu thuần", "tổng thu nhập hoạt động", "cộng doanh thu hoạt động");
  const lnGop = tim(bc, "kqkd", "lợi nhuận gộp");
  const vcsh = tim(bc, "can_doi", "vốn chủ sở hữu");
  const tongTS = tim(bc, "can_doi", "tổng cộng tài sản");
  const no = tim(bc, "can_doi", "nợ phải trả");

  const lnTtm = ttm(lnMe);
  const dtTtm = ttm(doanhThu);
  const von = cuoi(vcsh);
  // Báo cáo theo triệu đồng, giá theo đồng
  const eps = soCoPhieu && lnTtm != null ? (lnTtm * 1e6) / soCoPhieu : null;
  const bvps = soCoPhieu && von != null ? (von * 1e6) / soCoPhieu : null;
  const phanTram = (x: number | null) => (x == null ? null : x * 100);

  return {
    ky: bc.quy[bc.quy.length - 1] ?? "",
    pe: eps && eps > 0 ? gia / eps : null,
    pb: bvps && bvps > 0 ? gia / bvps : null,
    eps,
    bvps,
    roe: phanTram(chia(lnTtm, von)),
    roa: phanTram(chia(lnTtm, cuoi(tongTS))),
    bienGop: phanTram(chia(ttm(lnGop), dtTtm)),
    bienRong: phanTram(chia(lnTtm, dtTtm)),
    noTrenVon: chia(cuoi(no), von),
    tangTruongLN: cungKy(lnMe),
    tangTruongDT: cungKy(doanhThu),
  };
}

// Doanh thu và lợi nhuận các quý gần nhất cho biểu đồ cột
export function doanhThuLoiNhuan(bc: BaoCao, soQuy = 8) {
  const dt = tim(bc, "kqkd", "doanh thu thuần", "tổng thu nhập hoạt động", "cộng doanh thu hoạt động");
  const ln = tim(bc, "kqkd", "lợi nhuận sau thuế của công ty mẹ", "lợi nhuận sau thuế thu nhập doanh nghiệp");
  const batDau = Math.max(0, bc.quy.length - soQuy);
  return bc.quy.slice(batDau).map((ky, i) => ({
    ky,
    doanhThu: dt?.q[batDau + i] ?? null,
    loiNhuan: ln?.q[batDau + i] ?? null,
  }));
}

// ---- Mốc định giá theo quý cho chỉ báo FL Giá trị ----

export type MocDinhGia = {
  tu: number; // thời điểm bắt đầu dùng mốc này (0h ngày công bố, giây UTC)
  eps: number | null; // lợi nhuận công ty mẹ 4 quý / cổ phiếu, đồng
  bvps: number | null; // vốn chủ sở hữu / cổ phiếu, đồng
};

// Mỗi quý một mốc, có hiệu lực từ ngày công bố báo cáo quý đó
export function mocDinhGia(bc: BaoCao, soCoPhieu: number): MocDinhGia[] {
  const lnMe = tim(bc, "kqkd", "lợi nhuận sau thuế của công ty mẹ", "lợi nhuận sau thuế thu nhập doanh nghiệp");
  const vcsh = tim(bc, "can_doi", "vốn chủ sở hữu");
  return bc.quy.map((_, i) => {
    const bon = lnMe?.q.slice(Math.max(0, i - 3), i + 1) ?? [];
    const eps = bon.length === 4 && bon.every((v) => v != null) ? ((bon as number[]).reduce((s, v) => s + v, 0) * 1e6) / soCoPhieu : null;
    const von = vcsh?.q[i];
    const [y, m, d] = bc.quyCongBo[i].split("-").map(Number);
    return {
      tu: Date.UTC(y, m - 1, d) / 1000 - 7 * 3600, // 0h giờ Việt Nam
      eps,
      bvps: von != null ? (von * 1e6) / soCoPhieu : null,
    };
  });
}
