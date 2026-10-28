"use client";

import { useSyncExternalStore } from "react";

import { KHOA_GIAO_DIEN } from "@/lib/giao-dien-dau-trang";

// Giao diện sáng/tối: lưu lựa chọn trong localStorage, đặt data-theme trên <html>.
// Script trong <head> (giao-dien-dau-trang.ts) đặt sẵn trước khi vẽ trang để không bị nháy màu.

export type GiaoDien = "sang" | "toi";

const KHOA = KHOA_GIAO_DIEN;
const SU_KIEN = "finlo-giao-dien";

function hienTai(): GiaoDien {
  const theme = document.documentElement.dataset.theme;
  if (theme === "dark") return "toi";
  if (theme === "light") return "sang";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "toi" : "sang";
}

function dangKy(goiLai: () => void) {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(SU_KIEN, goiLai);
  mq.addEventListener("change", goiLai);
  return () => {
    window.removeEventListener(SU_KIEN, goiLai);
    mq.removeEventListener("change", goiLai);
  };
}

// Giao diện đang dùng; biểu đồ dùng giá trị này để vẽ lại màu khi đổi
export function useGiaoDien(): GiaoDien {
  return useSyncExternalStore(dangKy, hienTai, () => "sang");
}

export function datGiaoDien(g: GiaoDien) {
  document.documentElement.dataset.theme = g === "toi" ? "dark" : "light";
  try {
    localStorage.setItem(KHOA, g);
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn đổi được trong phiên này
  }
  window.dispatchEvent(new Event(SU_KIEN));
}
