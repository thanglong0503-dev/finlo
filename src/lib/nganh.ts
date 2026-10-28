import type { CoPhieu, DuLieuNganh } from "@/lib/mofi";

export type TongHopNganh = {
  khoa: string;
  ten: string;
  soMa: number;
  vonHoa: number;
  giaTri: number;
  phanTram: number; // % thay đổi bình quân theo vốn hoá
  soTang: number;
  soGiam: number;
  pe: number | null;
  coPhieu: CoPhieu[]; // sắp theo vốn hoá giảm dần
};

// Gom bảng giá theo ngành của Mofi
export function tongHopNganh(ds: CoPhieu[], nganh: DuLieuNganh): TongHopNganh[] {
  const nhom = new Map<string, CoPhieu[]>();
  for (const cp of ds) {
    const khoa = nganh.maNganh[cp.ma];
    if (!khoa) continue;
    if (!nhom.has(khoa)) nhom.set(khoa, []);
    nhom.get(khoa)!.push(cp);
  }
  return [...nhom.entries()]
    .map(([khoa, cps]) => {
      const coVon = cps.filter((c) => c.vonHoa);
      const vonHoa = coVon.reduce((s, c) => s + (c.vonHoa ?? 0), 0);
      return {
        khoa,
        ten: nganh.ten[khoa] ?? khoa,
        soMa: cps.length,
        vonHoa,
        giaTri: cps.reduce((s, c) => s + c.giaTri, 0),
        phanTram: vonHoa ? coVon.reduce((s, c) => s + (c.vonHoa ?? 0) * c.phanTram, 0) / vonHoa : 0,
        soTang: cps.filter((c) => c.khoiLuong > 0 && c.phanTram > 0).length,
        soGiam: cps.filter((c) => c.khoiLuong > 0 && c.phanTram < 0).length,
        pe: nganh.pe[khoa] ?? null,
        coPhieu: [...cps].sort((a, b) => (b.vonHoa ?? 0) - (a.vonHoa ?? 0)),
      };
    })
    .sort((a, b) => b.vonHoa - a.vonHoa);
}

// Màu nền ô bản đồ nhiệt theo % thay đổi: càng đậm càng biến động mạnh (tối đa ở ±3%)
export function mauNhiet(phanTram: number) {
  const doDam = Math.min(Math.abs(phanTram) / 3, 1);
  const mau = phanTram > 0 ? "var(--tang)" : phanTram < 0 ? "var(--giam)" : "var(--dung)";
  return `color-mix(in srgb, ${mau} ${Math.round(12 + doDam * 58)}%, var(--nen))`;
}
