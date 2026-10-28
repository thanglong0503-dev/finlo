"use client";

import { useSyncExternalStore } from "react";

// Danh mục theo dõi: các mã người dùng đánh dấu, lưu trong localStorage của trình duyệt
// (chưa có tài khoản nên mỗi máy có danh mục riêng)

const KHOA = "finlo-theo-doi";
const SU_KIEN = "finlo-theo-doi";
const RONG: string[] = [];

// Giữ mảng đã đọc theo chuỗi gốc để useSyncExternalStore nhận cùng một tham chiếu khi chưa đổi
let chuoiTruoc: string | null = null;
let mangTruoc: string[] = RONG;

function doc(): string[] {
  let chuoi: string | null = null;
  try {
    chuoi = localStorage.getItem(KHOA);
  } catch {
    return RONG;
  }
  if (chuoi !== chuoiTruoc) {
    chuoiTruoc = chuoi;
    try {
      const ds = chuoi ? JSON.parse(chuoi) : [];
      mangTruoc = Array.isArray(ds) ? ds.filter((x) => typeof x === "string") : RONG;
    } catch {
      mangTruoc = RONG;
    }
  }
  return mangTruoc;
}

function dangKy(goiLai: () => void) {
  // "storage": đồng bộ khi đổi ở tab khác
  window.addEventListener(SU_KIEN, goiLai);
  window.addEventListener("storage", goiLai);
  return () => {
    window.removeEventListener(SU_KIEN, goiLai);
    window.removeEventListener("storage", goiLai);
  };
}

export function useTheoDoi(): string[] {
  return useSyncExternalStore(dangKy, doc, () => RONG);
}

export function batTatTheoDoi(ma: string) {
  const ds = doc();
  const moi = ds.includes(ma) ? ds.filter((x) => x !== ma) : [...ds, ma];
  try {
    localStorage.setItem(KHOA, JSON.stringify(moi));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(SU_KIEN));
}
