"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type NhomChiBao = "xu-huong" | "dao-dong" | "khoi-luong" | "dinh-gia";

export type ChiBao = {
  ma: string;
  ten: string;
  moTa: string;
  nhom: NhomChiBao;
  finlo?: boolean;
  khungRieng?: boolean; // vẽ ở khung riêng bên dưới biểu đồ giá
  chiCoPhieu?: boolean; // cần báo cáo tài chính, không dùng cho tài sản số
};

export const NHOM: { ma: NhomChiBao; ten: string }[] = [
  { ma: "xu-huong", ten: "Xu hướng" },
  { ma: "dao-dong", ten: "Dao động" },
  { ma: "khoi-luong", ten: "Khối lượng" },
  { ma: "dinh-gia", ten: "Định giá" },
];

export const CHI_BAO: ChiBao[] = [
  { ma: "ma20", ten: "MA20", nhom: "xu-huong", moTa: "Trung bình động 20 phiên" },
  { ma: "ma50", ten: "MA50", nhom: "xu-huong", moTa: "Trung bình động 50 phiên" },
  { ma: "ema20", ten: "EMA20", nhom: "xu-huong", moTa: "Trung bình động hàm mũ 20 phiên" },
  { ma: "bb", ten: "BB", nhom: "xu-huong", moTa: "Bollinger Bands (20, 2): dải độ lệch chuẩn quanh MA20" },
  {
    ma: "fl-vung-gia",
    ten: "FL Vùng giá",
    nhom: "xu-huong",
    finlo: true,
    moTa: "Dải EMA20 ± 2 ATR co giãn theo biến động; mũi tên khi giá phá vỡ lên hoặc thủng xuống.",
  },
  { ma: "rsi", ten: "RSI", nhom: "dao-dong", khungRieng: true, moTa: "Sức mạnh tương đối 14 phiên; trên 70 quá mua, dưới 30 quá bán" },
  { ma: "macd", ten: "MACD", nhom: "dao-dong", khungRieng: true, moTa: "MACD (12, 26, 9): đường MACD, tín hiệu và cột chênh" },
  { ma: "stoch", ten: "Stoch", nhom: "dao-dong", khungRieng: true, moTa: "Stochastic (14, 3): vị trí giá trong biên độ 14 phiên; trên 80 quá mua, dưới 20 quá bán" },
  {
    ma: "fl-xu-huong",
    ten: "FL Xu hướng",
    nhom: "dao-dong",
    finlo: true,
    khungRieng: true,
    moTa: "Điểm -100..+100 gộp giá so với EMA20, EMA20 so với EMA50, MACD và RSI. Cắt lên 0 là tín hiệu mua, cắt xuống là bán.",
  },
  { ma: "kl", ten: "KL", nhom: "khoi-luong", moTa: "Khối lượng giao dịch từng phiên" },
  { ma: "obv", ten: "OBV", nhom: "khoi-luong", khungRieng: true, moTa: "On-Balance Volume: cộng khối lượng phiên tăng, trừ phiên giảm" },
  {
    ma: "fl-dong-tien",
    ten: "FL Dòng tiền",
    nhom: "khoi-luong",
    finlo: true,
    khungRieng: true,
    moTa: "Tiền vào/ra 20 phiên theo vị trí giá đóng cửa trong phiên, có trọng số khối lượng. Dương là tiền vào.",
  },
  {
    ma: "fl-gia-tri",
    ten: "FL Giá trị",
    nhom: "dinh-gia",
    finlo: true,
    chiCoPhieu: true,
    moTa: "Hai đường đứt: mức rẻ / đắt so với chính lịch sử bội số (P/E hoặc P/B) của mã. Đường liền: giá trị hợp lý FL, trộn trung vị của mã với của ngành, nên có thể nằm ngoài vùng lịch sử khi cả ngành được định giá khác trước. Chỉ dùng báo cáo đã công bố tại từng thời điểm.",
  },
];

// ---- Lưu lựa chọn chỉ báo trong trình duyệt ----
const KHOA = "finlo-chi-bao";
const MAC_DINH = ["kl", "ma20", "fl-xu-huong"];
let truoc: string | null = null;
let mang: string[] = MAC_DINH;
const doc = () => {
  let s: string | null = null;
  try {
    s = localStorage.getItem(KHOA);
  } catch {
    return MAC_DINH;
  }
  if (s !== truoc) {
    truoc = s;
    try {
      mang = s ? (JSON.parse(s) as string[]) : MAC_DINH;
    } catch {
      mang = MAC_DINH;
    }
  }
  return mang;
};
const dangKy = (goi: () => void) => {
  window.addEventListener("finlo-chi-bao", goi);
  return () => window.removeEventListener("finlo-chi-bao", goi);
};

export function useChiBaoDangBat() {
  return useSyncExternalStore(dangKy, doc, () => MAC_DINH);
}

export function batTatChiBao(ma: string) {
  const ds = doc();
  const moi = ds.includes(ma) ? ds.filter((x) => x !== ma) : [...ds, ma];
  try {
    localStorage.setItem(KHOA, JSON.stringify(moi));
  } catch {
    // không lưu được thì lựa chọn chỉ mất khi tải lại trang
  }
  window.dispatchEvent(new Event("finlo-chi-bao"));
}

// Thanh chỉ báo: 4 nút nhóm mở bảng chọn (kèm giải thích từng chỉ báo), bên cạnh là các chỉ báo
// đang bật dạng thẻ nhỏ có nút bỏ. Thêm chỉ báo mới không làm thanh dài ra.
export function ThanhChiBao({ coPhieu }: { coPhieu: boolean }) {
  const dangBat = useChiBaoDangBat();
  const [mo, setMo] = useState<NhomChiBao | null>(null);
  const khung = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài hoặc Esc thì đóng bảng chọn
  useEffect(() => {
    if (!mo) return;
    const dong = (e: MouseEvent) => {
      if (!khung.current?.contains(e.target as Node)) setMo(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMo(null);
    document.addEventListener("mousedown", dong);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", dong);
      document.removeEventListener("keydown", esc);
    };
  }, [mo]);

  const dung = CHI_BAO.filter((c) => coPhieu || !c.chiCoPhieu);
  const bat = dung.filter((c) => dangBat.includes(c.ma));

  return (
    <div ref={khung} className="relative flex flex-wrap items-center gap-1.5 border-b border-vien px-2 py-1.5">
      {NHOM.map((n) => {
        const soBat = dung.filter((c) => c.nhom === n.ma && dangBat.includes(c.ma)).length;
        const coTrongNhom = dung.some((c) => c.nhom === n.ma);
        if (!coTrongNhom) return null;
        return (
          <button
            key={n.ma}
            onClick={() => setMo((x) => (x === n.ma ? null : n.ma))}
            className={`flex h-7 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold ${
              mo === n.ma ? "border-nhan text-nhan" : "border-vien text-chu-phu hover:text-chu"
            }`}
          >
            {n.ten}
            {soBat > 0 && <span className="bg-nhan px-1 text-[10px] text-white">{soBat}</span>}
            <svg viewBox="0 0 10 6" width="8" height="5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d={mo === n.ma ? "M1 5l4-4 4 4" : "M1 1l4 4 4-4"} />
            </svg>
          </button>
        );
      })}

      <span className="mx-1 h-4 w-px bg-vien" />

      {bat.map((c) => (
        <span
          key={c.ma}
          className={`flex h-6 items-center gap-1 rounded-full pl-2.5 text-[11px] font-semibold ${c.finlo ? "bg-nhan text-white" : "bg-chu text-nen"}`}
        >
          {c.ten}
          <button onClick={() => batTatChiBao(c.ma)} aria-label={`Tắt ${c.ten}`} className="px-1.5 opacity-70 hover:opacity-100">
            ×
          </button>
        </span>
      ))}
      {bat.length === 0 && <span className="text-[12px] text-chu-phu">Chưa bật chỉ báo nào</span>}

      {mo && (
        <div className="absolute top-full left-2 z-30 mt-2 w-[min(420px,calc(100vw-2rem))] border border-vien bg-nen shadow-lg rounded-2xl overflow-hidden">
          <p className="border-b border-vien px-3 py-2 text-[10px] font-bold tracking-wider text-chu-phu uppercase">
            {NHOM.find((n) => n.ma === mo)?.ten}
          </p>
          {dung
            .filter((c) => c.nhom === mo)
            .map((c) => {
              const daBat = dangBat.includes(c.ma);
              return (
                <button
                  key={c.ma}
                  onClick={() => batTatChiBao(c.ma)}
                  className="flex w-full items-start gap-3 border-b border-vien px-3 py-2 text-left last:border-b-0 hover:bg-nhan-nhat"
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      daBat ? "border-nhan bg-nhan text-white" : "border-vien"
                    }`}
                  >
                    {daBat && (
                      <svg viewBox="0 0 10 8" width="9" height="7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <path d="M1 4l3 3 5-6" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold">
                      {c.ten}
                      {c.finlo && <span className="rounded border border-nhan px-1 text-[10px] text-nhan">Finlo</span>}
                    </span>
                    <span className="block text-[12px] text-chu-phu">{c.moTa}</span>
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
