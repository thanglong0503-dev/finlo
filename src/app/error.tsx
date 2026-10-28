"use client";

import { useEffect } from "react";

// Hiện khi tải dữ liệu thất bại (thường do nguồn dữ liệu chậm), thay cho trang lỗi mặc định
export default function Loi({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="nhan-muc">Tạm thời gián đoạn</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Chưa tải được dữ liệu thị trường</h1>
      <p className="mt-2 text-chu-phu">Nguồn dữ liệu đang phản hồi chậm. Vui lòng thử lại sau ít giây.</p>
      <button
        onClick={() => retry()}
        className="mt-6 h-10 bg-chu px-6 text-sm font-semibold text-nen hover:opacity-90"
      >
        Thử lại
      </button>
    </div>
  );
}
