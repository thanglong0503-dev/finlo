"use client";

import { useSyncExternalStore } from "react";

// Danh mục cá nhân: mã, khối lượng, giá vốn. Chỉ lưu trong localStorage của trình duyệt, không gửi lên máy chủ.

export type MucDanhMuc = { ma: string; kl: number; giaVon: number }; // giá vốn theo đồng

const KHOA = "finlo-danh-muc";
const SU_KIEN = "finlo-danh-muc";
const RONG: MucDanhMuc[] = [];

let chuoiTruoc: string | null = null;
let mangTruoc: MucDanhMuc[] = RONG;

// Dữ liệu trong máy hoặc tệp nhập vào có thể sai dạng: chỉ giữ các dòng hợp lệ
export function locHopLe(x: unknown): MucDanhMuc[] {
  if (!Array.isArray(x)) return RONG;
  return x.flatMap((d: Partial<MucDanhMuc> | null) => {
    if (!d || typeof d.ma !== "string" || !/^[A-Z0-9]{1,10}$/.test(d.ma)) return [];
    if (typeof d.kl !== "number" || !(d.kl > 0) || typeof d.giaVon !== "number" || !(d.giaVon > 0)) return [];
    return [{ ma: d.ma, kl: d.kl, giaVon: d.giaVon }];
  });
}

function doc(): MucDanhMuc[] {
  let chuoi: string | null = null;
  try {
    chuoi = localStorage.getItem(KHOA);
  } catch {
    return RONG;
  }
  if (chuoi !== chuoiTruoc) {
    chuoiTruoc = chuoi;
    try {
      mangTruoc = chuoi ? locHopLe(JSON.parse(chuoi)) : RONG;
    } catch {
      mangTruoc = RONG;
    }
  }
  return mangTruoc;
}

function dangKy(goiLai: () => void) {
  window.addEventListener(SU_KIEN, goiLai);
  window.addEventListener("storage", goiLai);
  return () => {
    window.removeEventListener(SU_KIEN, goiLai);
    window.removeEventListener("storage", goiLai);
  };
}

export function useDanhMuc(): MucDanhMuc[] {
  return useSyncExternalStore(dangKy, doc, () => RONG);
}

// Trả về false khi trình duyệt không cho lưu (chế độ riêng tư, hết dung lượng)
export function ghiDanhMuc(ds: MucDanhMuc[]) {
  try {
    localStorage.setItem(KHOA, JSON.stringify(ds));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(SU_KIEN));
  return true;
}

// Mua thêm mã đã có: cộng khối lượng, giá vốn bình quân theo khối lượng
export function themMua(ds: MucDanhMuc[], moi: MucDanhMuc): MucDanhMuc[] {
  const cu = ds.find((d) => d.ma === moi.ma);
  if (!cu) return [...ds, moi];
  const kl = cu.kl + moi.kl;
  return ds.map((d) => (d.ma === moi.ma ? { ma: d.ma, kl, giaVon: (cu.kl * cu.giaVon + moi.kl * moi.giaVon) / kl } : d));
}
