import Link from "next/link";
import { phanTram } from "@/lib/dinh-dang";

export type MucGia = { ten: string; gia: string; phanTram: number };
export type NhomGia = { ten: string; moTa: string; href: string; muc: MucGia[] };

// Màu tăng/giảm sáng hơn để đọc rõ trên nền đen
const mauTrenNenToi = (x: number) => (x > 0 ? "text-nhan-sang" : x < 0 ? "text-[#ff5c7c]" : "text-[#f0c050]");

// Dải giá chạy ngang trên nền đen, chia theo lớp tài sản
export function DaiGia({ nhom }: { nhom: NhomGia[] }) {
  const lap = [...nhom, ...nhom];
  return (
    <div className="overflow-hidden border-y-2 border-nhan bg-toi text-chu-toi">
      <div className="dai-gia flex w-max">
        {lap.map((n, i) => (
          <div key={i} className="flex items-center border-r border-vien-toi">
            <Link href={n.href} className="flex items-baseline gap-2 bg-toi-phu px-4 py-2.5 whitespace-nowrap">
              <span className="font-semibold text-nhan-sang">{n.ten}</span>
              <span className="text-chu-toi-phu">{n.moTa} →</span>
            </Link>
            {n.muc.map((m) => (
              <div key={m.ten} className="flex items-baseline gap-2 px-4 py-2.5 whitespace-nowrap">
                <span className="font-semibold">{m.ten}</span>
                <span className="tabular-nums">{m.gia}</span>
                <span className={`tabular-nums ${mauTrenNenToi(m.phanTram)}`}>{phanTram(m.phanTram)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
