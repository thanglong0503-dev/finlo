// Tin báo chí tài chính từ nguồn RSS công khai (CafeF, Vietstock, VnEconomy).
// Chỉ lấy tiêu đề, thời gian, ảnh đại diện và liên kết về bài gốc; tự gắn mã cổ phiếu được nhắc tới.

import { cacheLife } from "next/cache";

export type ChuyenMuc = "thi-truong" | "doanh-nghiep" | "phan-tich";

const NGUON: { url: string; ten: string; muc: ChuyenMuc }[] = [
  { url: "https://cafef.vn/thi-truong-chung-khoan.rss", ten: "CafeF", muc: "thi-truong" },
  { url: "https://vneconomy.vn/chung-khoan.rss", ten: "VnEconomy", muc: "thi-truong" },
  { url: "https://cafef.vn/doanh-nghiep.rss", ten: "CafeF", muc: "doanh-nghiep" },
  { url: "https://vietstock.vn/739/chung-khoan/giao-dich-noi-bo.rss", ten: "Vietstock", muc: "doanh-nghiep" },
  { url: "https://vietstock.vn/830/chung-khoan/co-phieu.rss", ten: "Vietstock", muc: "phan-tich" },
  { url: "https://vietstock.vn/582/nhan-dinh-phan-tich/phan-tich-co-ban.rss", ten: "Vietstock", muc: "phan-tich" },
  { url: "https://vietstock.vn/585/nhan-dinh-phan-tich/phan-tich-ky-thuat.rss", ten: "Vietstock", muc: "phan-tich" },
];

export type BaiBao = { tieuDe: string; link: string; luc: string; nguon: string; muc: ChuyenMuc; anh: string | null; ma: string[] };

const giai = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
// Nội dung của thẻ XML đầu tiên có tên này (tìm bằng vị trí chuỗi, không cần biểu thức chính quy)
const the = (item: string, ten: string) => {
  const dau = item.indexOf(`<${ten}`);
  if (dau < 0) return "";
  const mo = item.indexOf(">", dau);
  const dong = item.indexOf(`</${ten}>`, mo);
  return mo < 0 || dong < 0 ? "" : giai(item.slice(mo + 1, dong));
};

// Chữ viết tắt hay gặp trong tin nhưng trùng mã cổ phiếu: không gắn mã
const BO_QUA = new Set(["CEO", "HCM", "VND", "USD", "GDP", "CPI", "ETF", "IPO", "FDI", "VAT", "NHNN", "HOSE", "HNX", "TTCK", "CTCK", "BĐS", "KCN", "ESG", "AGM", "EPS", "ROE", "TOP", "SJC", "API", "APP", "VIP", "SME", "TCT", "UBND", "QĐ", "HĐQT", "NĐT", "VNI", "PGS", "IMF", "FED", "OPEC"]);

export async function layBaoChi(dsMa: string[]): Promise<BaiBao[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  const coMa = new Set(dsMa);
  const ketQua = await Promise.all(
    NGUON.map(async (n) => {
      try {
        const r = await fetch(n.url, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "FinloBot/1.0 (+https://www.finlo.id.vn)" } });
        if (!r.ok) return [];
        const xml = await r.text();
        return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 30).map(([, item]): BaiBao => {
          const tieuDe = the(item, "title");
          const moTa = the(item, "description");
          const anh = moTa.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? item.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] ?? null;
          const chu = `${tieuDe} ${moTa.replace(/<[^>]+>/g, " ")}`;
          const ma = [...new Set(chu.match(/\b[A-Z][A-Z0-9]{2}\b/g) ?? [])].filter((m) => coMa.has(m) && !BO_QUA.has(m)).slice(0, 5);
          // Một số báo ghi năm 2 chữ số ("29 Oct 26"): đổi thành 4 chữ số để đọc đúng
          const luc = new Date(the(item, "pubDate").replace(/(\d{1,2} [A-Za-z]{3}) (\d{2}) /, "$1 20$2 "));
          return { tieuDe, link: the(item, "link"), luc: Number.isNaN(luc.getTime()) ? "" : luc.toISOString(), nguon: n.ten, muc: n.muc, anh, ma };
        });
      } catch {
        return [];
      }
    }),
  );
  const daCo = new Set<string>();
  return ketQua
    .flat()
    .filter((b) => b.tieuDe && b.link && !daCo.has(b.link) && daCo.add(b.link))
    .sort((a, b) => b.luc.localeCompare(a.luc));
}
