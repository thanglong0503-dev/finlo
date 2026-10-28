"use client";

import { useEffect, useRef, useState } from "react";

// Dữ liệu thị trường tiền số realtime từ Binance (công khai, miễn phí).
// Trình duyệt người xem kết nối thẳng tới Binance nên không tốn tài nguyên server Finlo.

export const REST = "https://data-api.binance.vision/api/v3";

// Máy chủ chỉ phục vụ dữ liệu thị trường; lỗi thì đổi sang máy chủ dự phòng
const MAY_CHU = ["wss://data-stream.binance.vision", "wss://stream.binance.com:9443"];

export type TrangThai = "dang-ket-noi" | "truc-tiep" | "tam-dung" | "mat-ket-noi";

export const capGiaoDich = (ma: string) => `${ma}USDT`;

// Mở một kết nối gộp nhiều luồng. Tự nối lại khi rớt mạng (chờ tăng dần 2s → 15s),
// tự ngắt khi người xem chuyển sang tab khác để tiết kiệm dữ liệu và pin, quay lại thì nối lại.
export function useLuongBinance(luong: string[], nhanTin: (luong: string, duLieu: unknown) => void): TrangThai {
  const [trangThai, setTrangThai] = useState<TrangThai>("dang-ket-noi");
  const nhanTinRef = useRef(nhanTin);
  useEffect(() => {
    nhanTinRef.current = nhanTin;
  });

  const khoa = luong.join("/");

  useEffect(() => {
    if (!khoa) return;
    let ws: WebSocket | null = null;
    let hen: ReturnType<typeof setTimeout> | undefined;
    let lanThu = 0;
    let dung = false;

    const moKetNoi = () => {
      if (dung || document.hidden) return;
      setTrangThai("dang-ket-noi");
      const mayChu = MAY_CHU[lanThu % MAY_CHU.length];
      ws = new WebSocket(`${mayChu}/stream?streams=${khoa}`);
      ws.onopen = () => {
        lanThu = 0;
        setTrangThai("truc-tiep");
      };
      ws.onmessage = (e) => {
        const tin = JSON.parse(e.data) as { stream: string; data: unknown };
        nhanTinRef.current(tin.stream, tin.data);
      };
      ws.onclose = () => {
        ws = null;
        if (dung) return;
        if (document.hidden) {
          setTrangThai("tam-dung");
          return;
        }
        setTrangThai("mat-ket-noi");
        lanThu++;
        hen = setTimeout(moKetNoi, Math.min(2000 * lanThu, 15000));
      };
    };

    const doiHienThi = () => {
      if (document.hidden) {
        clearTimeout(hen);
        ws?.close();
        setTrangThai("tam-dung");
      } else if (!ws) {
        moKetNoi();
      }
    };

    moKetNoi();
    document.addEventListener("visibilitychange", doiHienThi);
    return () => {
      dung = true;
      clearTimeout(hen);
      document.removeEventListener("visibilitychange", doiHienThi);
      ws?.close();
    };
  }, [khoa]);

  return trangThai;
}

// Số lẻ theo độ lớn giá: BTC 2 chữ số, đồng dưới 1 USD tới 6 chữ số
export function soLe(gia: number) {
  if (gia >= 1000) return 2;
  if (gia >= 1) return 4;
  if (gia >= 0.01) return 5;
  return 8;
}

export const dinhDangGia = (gia: number, le = soLe(gia)) =>
  gia.toLocaleString("vi-VN", { minimumFractionDigits: le, maximumFractionDigits: le });

export function gon(x: number) {
  if (x >= 1e9) return `${(x / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`;
  if (x >= 1e6) return `${(x / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} triệu`;
  if (x >= 1e3) return `${(x / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} nghìn`;
  return x.toLocaleString("vi-VN", { maximumFractionDigits: 4 });
}

export function TrangThaiKetNoi({ trangThai }: { trangThai: TrangThai }) {
  const nhan: Record<TrangThai, string> = {
    "dang-ket-noi": "Đang kết nối",
    "truc-tiep": "Trực tiếp",
    "tam-dung": "Tạm dừng",
    "mat-ket-noi": "Mất kết nối, đang thử lại",
  };
  const mau = trangThai === "truc-tiep" ? "bg-nhan" : trangThai === "mat-ket-noi" ? "bg-giam" : "bg-dung";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-chu-phu">
      <span className={`h-1.5 w-1.5 ${mau} ${trangThai === "truc-tiep" ? "cham-song" : ""}`} />
      {nhan[trangThai]}
    </span>
  );
}
