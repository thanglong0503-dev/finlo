"use client";

// Nhận giá trực tiếp từ /api/gia-truc-tiep. Cả trang dùng chung một kết nối, chỉ mở khi tab đang hiện và trong giờ
// giao dịch. Máy chủ không hỗ trợ (bản Vercel trả 204) thì thôi không nối nữa, các bảng tự quay về hỏi định kỳ.

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { GoiGia } from "@/lib/gia-truc-tiep-chung";
import { dangTrongGioGiaoDich } from "@/lib/lich-nghi";
import type { Phien } from "@/lib/mofi";

type Nghe = (goi: GoiGia) => void;

const nghe = new Set<Nghe>();
const doiTrangThai = new Set<() => void>();
let es: EventSource | null = null;
let daMo = false; // kết nối hiện tại đã từng mở thành công
let trucTiep = false;
let khongHoTro = false;
let daCo: string | null = null; // phút mới nhất đang có, "YYYY-MM-DD HHMM"
let hen: ReturnType<typeof setInterval> | null = null;

const khoaPhut = (p: Phien) => `${p.ngay} ${p.gio.replace(":", "")}`;

function datTrangThai(v: boolean) {
  if (trucTiep === v) return;
  trucTiep = v;
  for (const f of doiTrangThai) f();
}

function dong() {
  es?.close();
  es = null;
  datTrangThai(false);
}

function moHoacDong() {
  const nen = !khongHoTro && nghe.size > 0 && document.visibilityState === "visible" && dangTrongGioGiaoDich();
  if (!nen) return dong();
  if (es) return;

  daMo = false;
  const moi = new EventSource(`/api/gia-truc-tiep${daCo ? `?tu=${encodeURIComponent(daCo)}` : ""}`);
  es = moi;
  moi.onopen = () => {
    daMo = true;
    datTrangThai(true);
  };
  moi.onerror = () => {
    datTrangThai(false);
    if (moi.readyState !== EventSource.CLOSED) return; // trình duyệt đang tự nối lại
    // Đóng hẳn ngay từ đầu (204, lỗi máy chủ): coi như không hỗ trợ. Đã chạy rồi mới đóng: lượt kiểm tra sau nối lại.
    if (!daMo) khongHoTro = true;
    if (es === moi) es = null;
  };
  moi.addEventListener("gia", (e) => {
    const goi = JSON.parse((e as MessageEvent<string>).data) as GoiGia;
    daCo = khoaPhut(goi.phien);
    for (const f of nghe) f(goi);
  });
}

function batDau() {
  if (hen) return;
  hen = setInterval(moHoacDong, 30_000);
  document.addEventListener("visibilitychange", moHoacDong);
}

function dungHan() {
  if (hen) clearInterval(hen);
  hen = null;
  document.removeEventListener("visibilitychange", moHoacDong);
  dong();
}

// Đang nhận giá trực tiếp thì các bảng bỏ lượt hỏi định kỳ
export const dangTrucTiep = () => trucTiep;

// Gọi nhan(goi) mỗi khi có giá mới. phien: phút của dữ liệu trang đang hiện, để máy chủ biết có cần gửi gói đủ không.
// Trả về true khi đang nhận trực tiếp.
export function useGiaTrucTiep(nhan: Nghe, phien: Phien | null): boolean {
  const nhanRef = useRef(nhan);
  useEffect(() => {
    nhanRef.current = nhan;
  });

  const phienRef = useRef(phien);
  useEffect(() => {
    phienRef.current = phien;
  });

  useEffect(() => {
    const p = phienRef.current;
    if (p && (!daCo || khoaPhut(p) > daCo)) daCo = khoaPhut(p);
    const f: Nghe = (goi) => nhanRef.current(goi);
    nghe.add(f);
    batDau();
    moHoacDong();
    return () => {
      nghe.delete(f);
      if (!nghe.size) dungHan();
    };
  }, []);

  return useSyncExternalStore(
    (f) => {
      doiTrangThai.add(f);
      return () => doiTrangThai.delete(f);
    },
    () => trucTiep,
    () => false,
  );
}
