// Tách riêng khỏi giao-dien.ts ("use client") để layout trên server đọc được chuỗi script

export const KHOA_GIAO_DIEN = "finlo-giao-dien";

// Chạy trong <head> trước khi trang được vẽ: áp lựa chọn đã lưu, tránh nháy màu
export const KICH_BAN_DAU_TRANG = `try{var g=localStorage.getItem("${KHOA_GIAO_DIEN}");if(g==="toi")document.documentElement.dataset.theme="dark";else if(g==="sang")document.documentElement.dataset.theme="light"}catch(e){}`;
