import { mauTangGiam, phanTram } from "@/lib/dinh-dang";

export type MucGia = { ten: string; gia: string; phanTram: number };

// Dải giá chạy ngang dưới phần tiêu đề trang chủ.
export function DaiGia({ muc }: { muc: MucGia[] }) {
  const lap = [...muc, ...muc];
  return (
    <div className="overflow-hidden border-y border-vien bg-nen-phu py-3">
      <div className="dai-gia flex w-max gap-8 px-4">
        {lap.map((m, i) => (
          <div key={i} className="flex items-baseline gap-2 text-sm whitespace-nowrap">
            <span className="font-semibold">{m.ten}</span>
            <span className="tabular-nums">{m.gia}</span>
            <span className={`tabular-nums ${mauTangGiam(m.phanTram)}`}>{phanTram(m.phanTram)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
