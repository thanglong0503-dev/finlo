import type { DongLoc } from "@/lib/bo-loc";
import { giaNghin, vonHoa } from "@/lib/dinh-dang";

// Cột của bảng so sánh ngành và cách định dạng (dùng chung cho server và client)
export type Cot = { khoa: keyof DongLoc; nhan: string; donVi: "%" | "x" | "pt" | "vh" | "gia" };

export const COT_SO_SANH: Cot[] = [
  { khoa: "gia", nhan: "Giá", donVi: "gia" },
  { khoa: "phanTram", nhan: "% ngày", donVi: "pt" },
  { khoa: "vonHoa", nhan: "Vốn hoá", donVi: "vh" },
  { khoa: "pe", nhan: "P/E", donVi: "x" },
  { khoa: "pb", nhan: "P/B", donVi: "x" },
  { khoa: "roe", nhan: "ROE", donVi: "%" },
  { khoa: "roa", nhan: "ROA", donVi: "%" },
  { khoa: "tangLN", nhan: "Tăng LN", donVi: "pt" },
  { khoa: "tangDT", nhan: "Tăng DT", donVi: "pt" },
  { khoa: "bienRong", nhan: "Biên ròng", donVi: "%" },
  { khoa: "noVon", nhan: "Nợ/Vốn", donVi: "x" },
  { khoa: "coTuc", nhan: "Cổ tức", donVi: "%" },
];

const so = (x: number, chuSo = 2) => x.toLocaleString("vi-VN", { maximumFractionDigits: chuSo, minimumFractionDigits: chuSo });

export function dinhDangCot(x: number | null, donVi: Cot["donVi"]) {
  if (x == null || !Number.isFinite(x)) return "—";
  if (donVi === "gia") return giaNghin(x);
  if (donVi === "vh") return vonHoa(x);
  if (donVi === "x") return so(x);
  if (donVi === "%") return `${so(x, 1)}%`;
  return `${x > 0 ? "+" : x < 0 ? "−" : ""}${so(Math.abs(x), 1)}%`;
}

