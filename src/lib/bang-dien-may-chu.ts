// Dữ liệu ban đầu của bảng điện VN30, và đường dự phòng khi trình duyệt không lấy thẳng được từ Mofi
import { docBang, docSau, GOC_MOFI, hhmmCua, phutCua, type AnhSau, type SauTho } from "@/lib/bang-dien";
import { layAnhChupBangTho, layBangGia } from "@/lib/mofi";
import { layDanhSachKhac } from "@/lib/ro-ma";

async function laySau(ngay: string, san: string, hhmm: string, ro: string[]): Promise<AnhSau | null> {
  // File sổ lệnh có thể ghi trễ vài phút so với file giá
  for (let lui = 0; lui < 4; lui++) {
    const res = await fetch(`${GOC_MOFI}/realtime/sau/${ngay}/${san}/${hhmmCua(phutCua(hhmm) - lui)}.json`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (res?.ok) return docSau((await res.json()) as SauTho, ro);
  }
  return null;
}

export async function layBangDienVn30() {
  const [khac, bangGia, tho] = await Promise.all([layDanhSachKhac(), layBangGia(), layAnhChupBangTho()]);
  const ro = khac.ro.VN30 ?? [];
  if (!tho || !ro.length) return null;
  const bang = docBang(tho, ro);
  const sans = [...new Set(Object.values(bang.dong).map((d) => d.san))];
  const sau = (await Promise.all(sans.map((s) => laySau(bang.ngay, s, bang.hhmm, ro)))).filter((x) => x != null);
  const ten = Object.fromEntries(bangGia.coPhieu.filter((c) => ro.includes(c.ma)).map((c) => [c.ma, c.ten]));
  return { ro, ten, bang, sau };
}

export type BangDienDau = NonNullable<Awaited<ReturnType<typeof layBangDienVn30>>>;
