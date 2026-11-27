// Trạm phát giá trực tiếp (chỉ chạy phía máy chủ, cần máy chủ chạy liên tục như Vibe Host, không hợp với serverless).
// Một vòng hỏi Mofi dùng chung cho mọi trình duyệt đang mở: cứ 10 giây xem đã có ảnh chụp phút mới chưa,
// có thì tính bảng giá rồi đẩy ngay phần đổi qua /api/gia-truc-tiep. Không còn ai nghe thì dừng hỏi.

import { maHoaDong, type GoiGia } from "@/lib/gia-truc-tiep-chung";
import { laNgayGiaoDich, ngayVN } from "@/lib/lich-nghi";
import { docAnhChup, ghepAnhChup, layBangGiaGoc, type AnhChupTho } from "@/lib/mofi";

const CHU_KY = 10_000;
const MO = 9 * 60 - 5; // vài phút biên trước 09:00 và sau 15:30 để lấy ảnh chụp đầu/cuối phiên
const DONG = 15 * 60 + 35;
const UA = "FinloBot/1.0 (+https://www.finlo.id.vn)";

type Nghe = (tin: string) => void;
type Tram = {
  nghe: Set<Nghe>;
  hen: ReturnType<typeof setInterval> | null;
  dangTai: boolean;
  ngay: string | null;
  hhmm: string | null;
  truoc: Map<string, string>; // số liệu đã gửi của từng mã, để chỉ gửi phần đổi
  toanBo: string | null; // gói đủ của phút gần nhất, cho trình duyệt mới vào
};

// Giữ trên globalThis để lúc dev nạp lại mã không sinh thêm vòng hỏi
const g = globalThis as typeof globalThis & { __tramGia?: Tram };
const tram = (g.__tramGia ??= {
  nghe: new Set(),
  hen: null,
  dangTai: false,
  ngay: null,
  hhmm: null,
  truoc: new Map(),
  toanBo: null,
});

const tinSSE = (su: string, duLieu: unknown) => `event: ${su}\ndata: ${JSON.stringify(duLieu)}\n\n`;
const hhmmCua = (phut: number) => `${String(Math.floor(phut / 60)).padStart(2, "0")}${String(phut % 60).padStart(2, "0")}`;

async function taiAnh(ngay: string, hhmm: string): Promise<AnhChupTho | null> {
  const res = await fetch(`https://data.mofi.vn/realtime/bang/${ngay}/${hhmm}.json`, {
    cache: "no-store",
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as AnhChupTho) : null;
}

async function phat(tho: AnhChupTho) {
  const anh = docAnhChup(tho);
  const bang = ghepAnhChup(await layBangGiaGoc(), anh);
  if (!bang.phien) return;

  const tatCa = bang.coPhieu.map(maHoaDong);
  const doi = tatCa.filter((d) => {
    const khoa = d.join("|");
    if (tram.truoc.get(d[0]) === khoa) return false;
    tram.truoc.set(d[0], khoa);
    return true;
  });
  tram.ngay = tho.ngay;
  tram.hhmm = tho.hhmm;
  const goc = { phien: bang.phien, capNhat: bang.capNhat };
  tram.toanBo = tinSSE("gia", { ...goc, toanBo: true, doi: tatCa } satisfies GoiGia);
  if (!doi.length) return;
  const tin = tinSSE("gia", { ...goc, toanBo: false, doi } satisfies GoiGia);
  for (const gui of tram.nghe) gui(tin);
}

async function quet() {
  if (tram.dangTai) return;
  const giay = Date.now() / 1000;
  const ngay = ngayVN(giay);
  const phut = Math.floor(((giay + 7 * 3600) % 86400) / 60);
  if (!laNgayGiaoDich(ngay) || phut < MO || phut > DONG) return;

  tram.dangTai = true;
  try {
    // File của phút hiện tại có thể chưa ghi xong: thử phút này rồi phút liền trước
    for (const p of [phut, phut - 1]) {
      const hhmm = hhmmCua(p);
      if (tram.ngay === ngay && tram.hhmm && hhmm <= tram.hhmm) break;
      const tho = await taiAnh(ngay, hhmm);
      if (tho) {
        await phat(tho);
        break;
      }
    }
  } catch {
    // Lỗi mạng hay Mofi tạm hỏng: bỏ lượt này, 10 giây sau thử lại
  } finally {
    tram.dangTai = false;
  }
}

// Đăng ký nhận giá. daCo: phút trình duyệt đang có ("YYYY-MM-DD HHMM"); khác phút mới nhất thì gửi ngay gói đủ.
export function dangKyGia(gui: Nghe, daCo: string | null): () => void {
  tram.nghe.add(gui);
  if (tram.toanBo && daCo !== `${tram.ngay} ${tram.hhmm}`) gui(tram.toanBo);
  if (!tram.hen) {
    tram.hen = setInterval(quet, CHU_KY);
    void quet();
  }
  return () => {
    tram.nghe.delete(gui);
    if (!tram.nghe.size && tram.hen) {
      clearInterval(tram.hen);
      tram.hen = null;
    }
  };
}
