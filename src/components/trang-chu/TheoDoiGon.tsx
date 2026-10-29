"use client";

import Link from "next/link";
import type { CoPhieu } from "@/lib/mofi";
import { giaNghin, mauGia, phanTram } from "@/lib/dinh-dang";
import { useTheoDoi } from "@/lib/theo-doi";

export type GiaGon = Pick<CoPhieu, "ma" | "gia" | "phanTram" | "tran" | "giaSan" | "thamChieu">;

// Danh mục theo dõi dạng gọn trên trang chủ: bảng giá đã có sẵn từ server, chỉ lọc theo danh sách trong trình duyệt
export function TheoDoiGon({ coPhieu }: { coPhieu: GiaGon[] }) {
  const theoDoi = useTheoDoi();
  const ds = theoDoi.map((ma) => coPhieu.find((c) => c.ma === ma)).filter((c): c is GiaGon => !!c);

  if (ds.length === 0)
    return (
      <p className="px-3 py-3 text-chu-phu">
        Bấm <span className="font-semibold text-chu">Theo dõi</span> ở trang một mã để ghim vào đây.
      </p>
    );

  return (
    <ul>
      {ds.map((cp) => (
        <li key={cp.ma}>
          <Link prefetch={false} href={`/co-phieu/${cp.ma}`} className="flex items-center gap-3 border-t border-vien px-3 py-1.5 hover:bg-nen-phu">
            <span className="w-12 font-semibold">{cp.ma}</span>
            <span className={`so ml-auto ${mauGia(cp)}`}>{giaNghin(cp.gia)}</span>
            <span className={`so w-16 text-right ${mauGia(cp)}`}>{phanTram(cp.phanTram)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
