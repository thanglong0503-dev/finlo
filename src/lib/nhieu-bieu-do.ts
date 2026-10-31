// Bố cục và danh sách mã của lưới nhiều biểu đồ (dùng chung cho trang server và thành phần client)
import type { Nguon } from "@/components/bieu-do/BieuDoTuongTac";

export type O = { nguon: Nguon; ma: string };

export const BO_CUC = [
  { so: 1, nhan: "1", lop: "grid-cols-1" },
  { so: 2, nhan: "2", lop: "grid-cols-1 md:grid-cols-2" },
  { so: 3, nhan: "3", lop: "grid-cols-1 md:grid-cols-3" },
  { so: 4, nhan: "4", lop: "grid-cols-1 md:grid-cols-2" },
  { so: 6, nhan: "6", lop: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" },
] as const;

export const O_MAC_DINH: O[] = [
  { nguon: "ck", ma: "FPT" },
  { nguon: "ts", ma: "BTC" },
  { nguon: "ck", ma: "VCB" },
  { nguon: "ts", ma: "ETH" },
  { nguon: "ck", ma: "HPG" },
  { nguon: "ts", ma: "SOL" },
];

export const KHOA_NHIEU = "finlo-nhieu-bieu-do";
export const maHopLe = (ma: string) => /^[A-Z0-9]{1,12}$/.test(ma);
export const chuoiO = (ds: O[]) => ds.map((o) => `${o.nguon}-${o.ma}`).join(",");

export function docO(chuoi: string | undefined): O[] {
  const ds = (chuoi ?? "")
    .split(",")
    .map((x) => x.split("-"))
    .filter(([n, m]) => (n === "ck" || n === "ts") && m && maHopLe(m.toUpperCase()))
    .map(([n, m]) => ({ nguon: n as Nguon, ma: m.toUpperCase() }));
  return [...ds, ...O_MAC_DINH.slice(ds.length)].slice(0, 6);
}

