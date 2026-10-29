"use client";

import { useEffect, useRef } from "react";
import { dangTrongGioGiaoDich } from "@/lib/lich-nghi";

// Làm mới dữ liệu định kỳ nhưng tiết kiệm: bỏ qua khi tab đang ẩn và (nếu chiTrongPhien) ngoài giờ giao dịch.
// Quay lại tab sau khi đã quá chu kỳ thì tải ngay một lần.
export function useLamMoi(tai: () => void, chuKy: number, { chiTrongPhien = true, taiNgay = false } = {}) {
  const taiRef = useRef(tai);
  useEffect(() => {
    taiRef.current = tai;
  });

  useEffect(() => {
    let lanCuoi = Date.now();
    const nenTai = () => document.visibilityState === "visible" && (!chiTrongPhien || dangTrongGioGiaoDich());
    const chay = () => {
      lanCuoi = Date.now();
      taiRef.current();
    };
    if (taiNgay) chay();
    const id = setInterval(() => nenTai() && chay(), chuKy);
    const hien = () => {
      if (nenTai() && Date.now() - lanCuoi >= chuKy) chay();
    };
    document.addEventListener("visibilitychange", hien);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", hien);
    };
  }, [chuKy, chiTrongPhien, taiNgay]);
}
