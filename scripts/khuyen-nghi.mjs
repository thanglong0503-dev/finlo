// Thu thập báo cáo khuyến nghị cổ phiếu của các công ty chứng khoán (nguồn: trang Báo cáo phân tích của Vietstock)
// và chấm kết quả từng khuyến nghị theo giá thực tế sau đó. Chỉ lưu thông tin tóm tắt (mã, CTCK, ngày,
// khuyến nghị, giá mục tiêu) kèm đường dẫn về bài gốc; không lưu, không đăng lại file báo cáo.
//
//   node scripts/khuyen-nghi.mjs                  lấy báo cáo mới từ sau báo cáo cuối đã có, rồi chấm lại kết quả
//   node scripts/khuyen-nghi.mjs --tu 16000 --den 22750   lấy bổ sung một khoảng mã báo cáo
//   node scripts/khuyen-nghi.mjs --chi-cham        chỉ chấm lại kết quả theo giá mới nhất
//
// Kết quả ghi vào src/data/khuyen-nghi.json (website đọc trực tiếp).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TEP = new URL("../src/data/khuyen-nghi.json", import.meta.url);
const UA = "FinloBot/1.0 (+https://www.finlo.id.vn)";
const NGHI = 400; // ms giữa hai lần tải, không làm phiền máy chủ nguồn
const KY_HAN = 365; // ngày: kỳ hạn mặc định của giá mục tiêu
const CAT_LO = 0.15; // cắt lỗ khi giá đi ngược 15% so với giá vào

const thamSo = process.argv.slice(2);
const lay = (ten) => {
  const i = thamSo.indexOf(ten);
  return i >= 0 ? thamSo[i + 1] : undefined;
};
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

const duLieu = existsSync(TEP) ? JSON.parse(readFileSync(TEP, "utf8")) : { capNhat: "", bao: [] };
const theoId = new Map(duLieu.bao.map((b) => [b.id, b]));

// ---- Đọc một trang báo cáo ----

const KHUYEN_NGHI = [
  // Thứ tự quan trọng: cụm dài trước cụm ngắn ("KÉM KHẢ QUAN" trước "KHẢ QUAN")
  ["KÉM KHẢ QUAN", "ban"],
  ["GIẢM TỶ TRỌNG", "ban"],
  ["UNDERPERFORM", "ban"],
  ["UNDERWEIGHT", "ban"],
  ["BÁN", "ban"],
  ["SELL", "ban"],
  ["MUA MẠNH", "mua"],
  ["TĂNG TỶ TRỌNG", "mua"],
  ["KHẢ QUAN", "mua"],
  ["OUTPERFORM", "mua"],
  ["OVERWEIGHT", "mua"],
  ["TÍCH CỰC", "mua"],
  ["MUA", "mua"],
  ["BUY", "mua"],
  ["NẮM GIỮ", "giu"],
  ["TRUNG LẬP", "giu"],
  ["PHÙ HỢP THỊ TRƯỜNG", "giu"],
  ["MARKET PERFORM", "giu"],
  ["THEO DÕI", "giu"],
  ["NEUTRAL", "giu"],
  ["HOLD", "giu"],
];

function timKhuyenNghi(chu) {
  const hoa = chu.toUpperCase();
  // "hạ/nâng khuyến nghị ... từ MUA xuống KHẢ QUAN": lấy mức mới
  const doi = /(?:XUỐNG|LÊN)\s+(?:MỨC\s+)?([A-ZÀ-Ỹ ]{3,24})/u.exec(hoa);
  const vung = [doi?.[1], /(?:KHUYẾN NGHỊ|ĐÁNH GIÁ)\s+(?:DUY TRÌ\s+|LÀ\s+|Ở MỨC\s+)?([A-ZÀ-Ỹ ]{3,24})/u.exec(hoa)?.[1]];
  for (const v of vung) {
    if (!v) continue;
    for (const [kw, nhom] of KHUYEN_NGHI) if (v.trim().startsWith(kw)) return { nhan: kw, nhom };
  }
  return null;
}

const soDong = (s) => {
  // "23,300" hay "23.300" đều là hàng nghìn; "23,3 nghìn" thì nhân 1000
  const nghin = /nghìn/i.test(s);
  const x = nghin ? Number(s.replace(/[^\d,.]/g, "").replace(",", ".")) * 1000 : Number(s.replace(/[^\d]/g, ""));
  return Number.isFinite(x) && x >= 500 && x <= 5_000_000 ? Math.round(x) : null;
};

function phanTich(id, htmlGoc) {
  const chu = htmlGoc
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ");
  const m = /Đồng ý (.*?) Nguồn: (\S+) Loại báo cáo: (.*?) Ngày phát hành: (\d\d)\/(\d\d)\/(\d{4}).*?Tải về (.*?) Báo cáo mới nhất/.exec(chu);
  if (!m) return null;
  const [, tieuDe, ctck, loai, d, th, y, tomTat] = m;
  // Chỉ lấy báo cáo doanh nghiệp, tiêu đề bắt đầu bằng mã cổ phiếu ("PVP: …")
  const ma = /^([A-Z][A-Z0-9]{2}):/.exec(tieuDe)?.[1];
  if (!ma || !/Doanh nghiệp/i.test(loai)) return null;
  const caHai = `${tieuDe}. ${tomTat}`;
  const kn = timKhuyenNghi(tieuDe) ?? timKhuyenNghi(tomTat);
  const giaMt = /giá mục tiêu[^0-9]{0,40}?([\d.,]+\s*(?:nghìn)?)\s*(?:đồng|VND|đ\b)/i.exec(caHai)?.[1];
  const up = /upside[^0-9+-]{0,12}([+-]?\d+(?:[.,]\d+)?)\s*%/i.exec(caHai)?.[1];
  return {
    id,
    ma,
    ctck,
    ngay: `${y}-${th}-${d}`,
    tieuDe: tieuDe.slice(0, 160),
    khuyenNghi: kn?.nhan ?? null,
    nhom: kn?.nhom ?? null,
    gia: giaMt ? soDong(giaMt) : null,
    upside: up != null ? Number(up.replace(",", ".")) : null,
  };
}

async function taiTrang(id) {
  for (let lan = 1; lan <= 3; lan++) {
    try {
      const r = await fetch(`https://finance.vietstock.vn/bao-cao-phan-tich/${id}/x.htm`, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(20000),
        redirect: "manual", // mã không tồn tại thì Vietstock chuyển về trang danh sách
      });
      if (r.status === 404 || (r.status >= 300 && r.status < 400)) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (lan === 3) throw e;
      await ngu(2000 * lan);
    }
  }
}

async function thuThap(tu, den) {
  const LUONG = 3; // số trang tải song song
  let trong = 0;
  let them = 0;
  const motTrang = async (id) => {
    try {
      const h = await taiTrang(id);
      const bao = h ? phanTich(id, h) : null;
      if (bao) {
        theoId.set(id, bao);
        them++;
      }
      // Trang không tồn tại hoặc không phải báo cáo: đếm để biết đã tới cuối danh sách
      return !!h && /Ngày phát hành/.test(h);
    } catch (e) {
      console.error(id, String(e));
      return true;
    }
  };
  for (let id = tu; den ? id <= den : trong < 40; id += LUONG) {
    const ids = Array.from({ length: LUONG }, (_, k) => id + k).filter((x) => !den || x <= den);
    const co = await Promise.all(ids.map(motTrang));
    for (const x of co) trong = x ? 0 : trong + 1;
    if (Math.floor((id + LUONG) / 100) > Math.floor(id / 100)) {
      console.log(`… ${id}: ${them} báo cáo doanh nghiệp`);
      ghi();
    }
    await ngu(NGHI);
  }
  console.log(`Thu thập xong ${them} báo cáo`);
}

// ---- Chấm kết quả theo giá ----

const MOFI = "https://data.mofi.vn";
const lucVN = (ngay) => Date.parse(`${ngay}T00:00:00+07:00`) / 1000;

async function layJson(url) {
  for (let lan = 1; lan <= 3; lan++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (lan === 3) return null;
      await ngu(1000 * lan);
    }
  }
}

// Giá đóng cửa thật (chưa điều chỉnh) tại ngày phát hành, từ lịch sử giá CafeF; ngày nghỉ thì lấy phiên gần nhất trước đó.
// Lưu vào báo cáo (giaPH) nên mỗi báo cáo chỉ tra một lần.
async function giaPhatHanh(b) {
  const [y, m, d] = b.ngay.split("-").map(Number);
  const tu = new Date(Date.UTC(y, m - 1, d - 10));
  const mdy = (x) => `${String(x.getUTCMonth() + 1).padStart(2, "0")}/${String(x.getUTCDate()).padStart(2, "0")}/${x.getUTCFullYear()}`;
  const url =
    `https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/PriceHistory.ashx?Symbol=${b.ma}` +
    `&StartDate=${mdy(tu)}&EndDate=${mdy(new Date(Date.UTC(y, m - 1, d)))}&PageIndex=1&PageSize=20`;
  const j = await layJson(url);
  const dong = j?.Data?.Data?.[0]; // mới nhất trước
  return dong?.GiaDongCua > 0 ? Math.round(dong.GiaDongCua * 1000) : null;
}

// Giá Mofi đã điều chỉnh theo cổ tức, chia tách; giá mục tiêu trong báo cáo là giá danh nghĩa lúc phát hành.
// Vì vậy quy mục tiêu về cùng thang bằng mức upside (mục tiêu / giá thật lúc phát hành), không so trực tiếp.
function cham(b, nen, chiSo) {
  const t0 = lucVN(b.ngay);
  // Vào lệnh ở giá mở cửa phiên đầu tiên sau ngày phát hành (báo cáo hay ra trong hoặc sau phiên)
  const i0 = nen.t.findIndex((t) => t > t0);
  if (i0 < 1) return null;
  const giaPhatHanh = nen.c[i0 - 1];
  const vao = nen.o[i0] || nen.c[i0];
  if (!vao || !giaPhatHanh) return null;
  const upside = b.gia && b.giaPH ? (b.gia / b.giaPH - 1) * 100 : b.upside;
  // Upside bất thường (số đọc sai, giá cũ): không chấm theo mục tiêu
  const mucTieu = upside != null && Math.abs(upside) <= 300 ? giaPhatHanh * (1 + upside / 100) : null;
  // Báo cáo chỉ ghi giá mục tiêu, không ghi khuyến nghị: suy ra theo mức chênh (quy ước phổ biến của các CTCK)
  const nhom = b.nhom ?? (upside == null ? null : upside >= 10 ? "mua" : upside <= -10 ? "ban" : "giu");
  if (!nhom) return null;
  const het = t0 + KY_HAN * 86400;
  const mua = nhom !== "ban";
  let trangThai = "dang";
  let iKet = nen.t.length - 1;
  for (let i = i0; i < nen.t.length; i++) {
    if (nen.t[i] > het) {
      trangThai = "het-han";
      iKet = i - 1;
      break;
    }
    if (nhom === "giu") continue;
    const catLo = mua ? nen.l[i] <= vao * (1 - CAT_LO) : nen.h[i] >= vao * (1 + CAT_LO);
    // Cùng phiên chạm cả hai: coi như cắt lỗ trước (thận trọng)
    if (catLo) {
      trangThai = "cat-lo";
      iKet = i;
      break;
    }
    if (mucTieu && (mua ? mucTieu > vao && nen.h[i] >= mucTieu : mucTieu < vao && nen.l[i] <= mucTieu)) {
      trangThai = "dat";
      iKet = i;
      break;
    }
  }
  const giaRa =
    trangThai === "dat" ? mucTieu : trangThai === "cat-lo" ? vao * (mua ? 1 - CAT_LO : 1 + CAT_LO) : nen.c[iKet];
  const loiNhuan = ((giaRa / vao - 1) * 100) * (nhom === "ban" ? -1 : 1);
  // So với VN-Index cùng khoảng thời gian
  let vni = null;
  if (chiSo) {
    const a = chiSo.t.findIndex((t) => t >= nen.t[i0]);
    let z = chiSo.t.findIndex((t) => t > nen.t[iKet]);
    z = z < 0 ? chiSo.t.length - 1 : z - 1;
    if (a >= 0 && z >= a) vni = (chiSo.c[z] / (chiSo.o[a] || chiSo.c[a]) - 1) * 100 * (nhom === "ban" ? -1 : 1);
  }
  const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
  return {
    nhom,
    trangThai,
    upside: r1(upside),
    ngayKet: new Date((nen.t[iKet] + 7 * 3600) * 1000).toISOString().slice(0, 10),
    soNgay: Math.round((nen.t[iKet] - nen.t[i0]) / 86400),
    loiNhuan: r1(loiNhuan),
    vuotChiSo: vni != null ? r1(loiNhuan - vni) : null,
  };
}

async function chamTatCa() {
  const cs = await layJson(`${MOFI}/tong-hop/chi-so.json`);
  const chiSo = cs?.indices?.VNINDEX ?? null;
  const coCham = (b) => b.nhom || b.gia;
  const ma = [...new Set([...theoId.values()].filter(coCham).map((b) => b.ma))];
  let xong = 0;
  // Giá thật lúc phát hành cho các báo cáo có giá mục tiêu (chỉ tra những báo cáo chưa có)
  const canTra = [...theoId.values()].filter((b) => b.gia && b.giaPH === undefined);
  for (const [i, b] of canTra.entries()) {
    b.giaPH = await giaPhatHanh(b);
    if ((i + 1) % 100 === 0) {
      console.log(`… giá phát hành ${i + 1}/${canTra.length}`);
      ghi();
    }
    await ngu(250);
  }
  for (const m of ma) {
    const nen = await layJson(`${MOFI}/spot/d/${m}.json`);
    for (const b of theoId.values()) {
      if (b.ma !== m || !coCham(b)) continue;
      b.kq = nen?.t?.length ? cham(b, nen, chiSo) : null;
    }
    if (++xong % 50 === 0) console.log(`… chấm ${xong}/${ma.length} mã`);
    await ngu(100);
  }
}

function ghi() {
  const bao = [...theoId.values()].sort((a, b) => b.id - a.id);
  mkdirSync(dirname(fileURLToPath(TEP)), { recursive: true });
  writeFileSync(TEP, JSON.stringify({ capNhat: new Date().toISOString(), kyHan: KY_HAN, catLo: CAT_LO * 100, bao }) + "\n");
}

if (!thamSo.includes("--chi-cham")) {
  const tu = Number(lay("--tu") ?? Math.max(0, ...theoId.keys()) + 1);
  const den = lay("--den") ? Number(lay("--den")) : undefined;
  if (!tu || tu < 2) {
    console.error("Chưa có dữ liệu: chạy với --tu <mã báo cáo> --den <mã báo cáo> để lấy lần đầu");
    process.exit(1);
  }
  await thuThap(tu, den);
}
if (!thamSo.includes("--khong-cham")) await chamTatCa();
ghi();
console.log(`Đã lưu ${theoId.size} báo cáo`);
