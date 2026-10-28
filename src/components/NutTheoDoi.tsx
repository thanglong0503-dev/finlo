"use client";

import { batTatTheoDoi, useTheoDoi } from "@/lib/theo-doi";

// gon: chỉ hiện ô sao nhỏ (dùng trong bảng); đầy đủ: nút có chữ (dùng ở trang mã)
export function NutTheoDoi({ ma, gon = false }: { ma: string; gon?: boolean }) {
  const dangTheoDoi = useTheoDoi().includes(ma);
  const nhan = dangTheoDoi ? `Bỏ theo dõi ${ma}` : `Theo dõi ${ma}`;

  const sao = (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
      <path
        d="M8 1.5l1.9 4.1 4.5.5-3.3 3.1.9 4.4L8 11.4l-4 2.2.9-4.4L1.6 6.1l4.5-.5z"
        fill={dangTheoDoi ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (gon) {
    return (
      <button
        onClick={() => batTatTheoDoi(ma)}
        aria-label={nhan}
        title={nhan}
        className={`flex h-6 w-6 items-center justify-center ${
          dangTheoDoi ? "text-nhan" : "text-chu-phu/50 hover:text-nhan"
        }`}
      >
        {sao}
      </button>
    );
  }

  return (
    <button
      onClick={() => batTatTheoDoi(ma)}
      aria-label={nhan}
      className={`flex h-9 items-center gap-2 border px-3 font-semibold ${
        dangTheoDoi ? "border-nhan bg-nhan text-white" : "border-nhan text-nhan hover:bg-nhan-nhat"
      }`}
    >
      {sao}
      {dangTheoDoi ? "Đang theo dõi" : "Theo dõi"}
    </button>
  );
}
