"use client";

import { datGiaoDien, useGiaoDien } from "@/lib/giao-dien";

// Nút đổi sáng/tối trên thanh đen; biểu tượng nét mảnh, vuông theo phong cách Finlo
export function NutGiaoDien() {
  const giaoDien = useGiaoDien();
  const toi = giaoDien === "toi";
  return (
    <button
      onClick={() => datGiaoDien(toi ? "sang" : "toi")}
      aria-label={toi ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={toi ? "Giao diện sáng" : "Giao diện tối"}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-toi-phu text-chu-toi-phu hover:text-chu-toi"
    >
      {toi ? (
        // Mặt trời
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" />
        </svg>
      ) : (
        // Mặt trăng
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z" />
        </svg>
      )}
    </button>
  );
}
