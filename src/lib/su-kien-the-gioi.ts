// Sự kiện quốc tế ảnh hưởng tiền số và thị trường chung: họp FOMC, công bố CPI Mỹ, đáo hạn quyền chọn BTC/ETH, halving Bitcoin.
// Ngày FOMC lấy từ federalreserve.gov, ngày CPI từ bls.gov; giờ đổi sang giờ Việt Nam theo múi giờ New York (có giờ mùa hè).

// Ngày thứ hai của mỗi kỳ họp (ngày công bố quyết định lãi suất, 14:00 New York); true = kỳ có dự phóng kinh tế (dot plot)
const FOMC: [string, boolean][] = [
  ["2026-01-28", false],
  ["2026-03-18", true],
  ["2026-04-29", false],
  ["2026-06-17", true],
  ["2026-07-29", false],
  ["2026-09-16", true],
  ["2026-10-28", false],
  ["2026-12-09", true],
  ["2027-01-27", false],
  ["2027-03-17", true],
  ["2027-04-28", false],
  ["2027-06-09", true],
  ["2027-07-28", false],
  ["2027-09-15", true],
  ["2027-10-27", false],
  ["2027-12-08", true],
];

// Ngày công bố CPI (08:30 New York) và tháng số liệu
const CPI: [string, string][] = [
  ["2026-11-10", "10/2026"],
  ["2026-12-10", "11/2026"],
  ["2027-01-13", "12/2026"],
  ["2027-02-11", "1/2027"],
  ["2027-03-10", "2/2027"],
  ["2027-04-13", "3/2027"],
  ["2027-05-12", "4/2027"],
  ["2027-06-10", "5/2027"],
  ["2027-07-14", "6/2027"],
  ["2027-08-11", "7/2027"],
  ["2027-09-14", "8/2027"],
  ["2027-10-14", "9/2027"],
  ["2027-11-10", "10/2027"],
  ["2027-12-10", "11/2027"],
];

export type SuKienQuocTe = { ngay: string; gio: string; loai: "fomc" | "cpi" | "quyen-chon"; tieuDe: string; duKien?: boolean; ghiChu: string };

// Giờ New York (hh:mm) của một ngày -> ngày và giờ Việt Nam
function tuNewYork(ngay: string, gio: number, phut: number) {
  const goc = Date.UTC(+ngay.slice(0, 4), +ngay.slice(5, 7) - 1, +ngay.slice(8, 10), gio, phut);
  // Độ lệch New York so với UTC tại thời điểm đó (−4 giờ mùa hè, −5 giờ mùa đông)
  const ny = new Date(new Date(goc).toLocaleString("en-US", { timeZone: "America/New_York" }));
  const utc = new Date(new Date(goc).toLocaleString("en-US", { timeZone: "UTC" }));
  const thuc = goc + (utc.getTime() - ny.getTime());
  const vn = new Date(thuc + 7 * 3600e3).toISOString();
  return { ngay: vn.slice(0, 10), gio: vn.slice(11, 16) };
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// Thứ Sáu cuối cùng của tháng: Deribit đáo hạn quyền chọn tháng lúc 08:00 UTC (15:00 Việt Nam)
function thuSauCuoi(nam: number, thang: number) {
  const d = new Date(Date.UTC(nam, thang + 1, 0));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - 5 + 7) % 7));
  return ymd(d);
}

export function suKienQuocTe(tu: string, den: string): SuKienQuocTe[] {
  const kq: SuKienQuocTe[] = [];
  for (const [ngay, duPhong] of FOMC) {
    const vn = tuNewYork(ngay, 14, 0);
    kq.push({
      ...vn,
      loai: "fomc",
      tieuDe: duPhong ? "FED công bố lãi suất và dự phóng kinh tế" : "FED công bố quyết định lãi suất",
      duKien: ngay >= "2027-01-01",
      ghiChu: duPhong
        ? "Kèm biểu đồ dự phóng lãi suất (dot plot); họp báo sau đó 30 phút. Tiền số và chứng khoán Mỹ thường biến động mạnh."
        : "Họp báo của Chủ tịch FED sau đó 30 phút. Tiền số thường biến động mạnh quanh giờ công bố.",
    });
  }
  for (const [ngay, thang] of CPI) {
    kq.push({
      ...tuNewYork(ngay, 8, 30),
      loai: "cpi",
      tieuDe: `Mỹ công bố CPI tháng ${thang}`,
      ghiChu: "Lạm phát cao hơn dự báo thường khiến kỳ vọng hạ lãi suất giảm, tài sản rủi ro chịu áp lực.",
    });
  }
  const namDau = Number(tu.slice(0, 4));
  const namCuoi = Number(den.slice(0, 4));
  for (let nam = namDau; nam <= namCuoi; nam++)
    for (let thang = 0; thang < 12; thang++) {
      const quy = thang % 3 === 2;
      kq.push({
        ngay: thuSauCuoi(nam, thang),
        gio: "15:00",
        loai: "quyen-chon",
        tieuDe: quy ? `Đáo hạn quyền chọn BTC/ETH quý ${(thang + 1) / 3}` : `Đáo hạn quyền chọn BTC/ETH tháng ${thang + 1}`,
        ghiChu: quy
          ? "Kỳ đáo hạn quý trên Deribit, giá trị hợp đồng lớn nhất trong năm; giá hay bị hút về vùng max pain."
          : "Deribit đáo hạn quyền chọn tháng lúc 15:00; giá có thể dao động quanh vùng max pain.",
      });
    }
  return kq.filter((s) => s.ngay >= tu && s.ngay <= den);
}

// Halving Bitcoin mỗi 210.000 khối; ước tính ngày theo 10 phút/khối (độ khó tự điều chỉnh về mức này)
export const KHOI_MOI_KY = 210000;
export type Halving = { khoiHienTai: number; khoiHalving: number; conLai: number; ngayUocTinh: string; lan: number; phanThuong: number };

export function tinhHalving(khoiHienTai: number, luc: number): Halving {
  const lan = Math.floor(khoiHienTai / KHOI_MOI_KY) + 1;
  const khoiHalving = lan * KHOI_MOI_KY;
  const conLai = khoiHalving - khoiHienTai;
  return {
    khoiHienTai,
    khoiHalving,
    conLai,
    ngayUocTinh: new Date(luc + conLai * 600e3).toISOString(),
    lan,
    phanThuong: 50 / 2 ** lan,
  };
}
