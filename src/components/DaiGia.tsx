import Link from "next/link";
import { mauTangGiam, phanTram } from "@/lib/dinh-dang";

export type MucGia = { ten: string; gia: string; phanTram: number };
export type NhomGia = { ten: string; moTa: string; href: string; muc: MucGia[] };

// Dải giá chạy ngang, chia theo lớp tài sản
export function DaiGia({ nhom }: { nhom: NhomGia[] }) {
  const lap = [...nhom, ...nhom];
  return (
    <div className="overflow-hidden border-y border-vien">
      <div className="dai-gia flex w-max">
        {lap.map((n, i) => (
          <div key={i} className="flex items-center border-r border-vien">
            {n.muc.map((m) => (
              <div key={m.ten} className="flex items-baseline gap-2 px-4 py-2.5 whitespace-nowrap">
                <span className="font-semibold">{m.ten}</span>
                <span className="tabular-nums">{m.gia}</span>
                <span className={`tabular-nums ${mauTangGiam(m.phanTram)}`}>{phanTram(m.phanTram)}</span>
              </div>
            ))}
            <Link href={n.href} className="flex items-baseline gap-2 bg-nen-phu px-4 py-2.5 whitespace-nowrap">
              <span className="font-semibold">{n.ten}</span>
              <span className="text-chu-phu">{n.moTa} →</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
