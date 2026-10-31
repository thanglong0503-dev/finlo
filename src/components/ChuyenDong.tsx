"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Hiệu ứng chuyển động dùng chung.
// - HieuUngCuon: phần tử có lớp "hien-dan" trượt lên và hiện dần khi cuộn tới (đặt một lần trong layout).
//   Chỉ ẩn trước khi JavaScript chạy được (lớp co-cd trên <html>), nên tắt JavaScript vẫn đọc được nội dung.
// - SoChay: con số đếm từ 0 lên khi xuất hiện trên màn hình.
// Người dùng bật "giảm chuyển động" trong hệ điều hành thì mọi thứ hiện ngay, không chạy.

const giamChuyenDong = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function HieuUngCuon() {
  const duongDan = usePathname();
  useEffect(() => {
    const html = document.documentElement;
    if (giamChuyenDong()) return;
    html.classList.add("co-cd");
    const io = new IntersectionObserver(
      (ds) => {
        for (const x of ds)
          if (x.isIntersecting) {
            x.target.classList.add("da-hien");
            io.unobserve(x.target);
          }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const quet = () => document.querySelectorAll(".hien-dan:not(.da-hien)").forEach((el) => io.observe(el));
    quet();
    // Nội dung tải sau (Suspense) cũng được theo dõi
    let hen = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(hen);
      hen = requestAnimationFrame(quet);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(hen);
    };
  }, [duongDan]);
  return null;
}

export function SoChay({ den, le = 0, sau = "", thoiGian = 1400 }: { den: number; le?: number; sau?: string; thoiGian?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const viet = (x: number) => x.toLocaleString("vi-VN", { minimumFractionDigits: le, maximumFractionDigits: le }) + sau;
  useEffect(() => {
    const el = ref.current;
    if (!el || giamChuyenDong()) return;
    let khung = 0;
    const io = new IntersectionObserver(([x]) => {
      if (!x.isIntersecting) return;
      io.disconnect();
      const batDau = performance.now();
      const buoc = (luc: number) => {
        const t = Math.min(1, (luc - batDau) / thoiGian);
        const em = 1 - (1 - t) ** 3;
        el.textContent = (den * em).toLocaleString("vi-VN", { minimumFractionDigits: le, maximumFractionDigits: le }) + sau;
        if (t < 1) khung = requestAnimationFrame(buoc);
      };
      khung = requestAnimationFrame(buoc);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(khung);
    };
  }, [den, le, sau, thoiGian]);
  // Lúc dựng sẵn hiện số cuối cùng (đọc được khi chưa chạy JavaScript)
  return (
    <span ref={ref} className="so">
      {viet(den)}
    </span>
  );
}
