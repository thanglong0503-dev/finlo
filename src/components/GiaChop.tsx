"use client";

import { useState, type ReactNode } from "react";

// Bọc một con số: mỗi khi giá trị đổi thì chớp nền xanh (tăng) hoặc đỏ (giảm)
export function GiaChop({ gia, children, className = "" }: { gia: number; children: ReactNode; className?: string }) {
  const [truoc, setTruoc] = useState(gia);
  const [huong, setHuong] = useState<"tang" | "giam" | null>(null);
  const [lan, setLan] = useState(0);

  // So với giá lần vẽ trước ngay trong lúc vẽ (cách React khuyên dùng thay cho useEffect)
  if (gia !== truoc) {
    setHuong(gia > truoc ? "tang" : "giam");
    setTruoc(gia);
    setLan((x) => x + 1);
  }

  // Đổi key để chạy lại hiệu ứng chớp cả khi cùng chiều với lần trước
  return (
    <span key={lan} className={`${huong ? `chop-${huong}` : ""} ${className}`}>
      {children}
    </span>
  );
}
