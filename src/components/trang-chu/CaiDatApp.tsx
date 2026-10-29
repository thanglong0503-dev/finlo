"use client";

import { useState, useSyncExternalStore } from "react";

// Sự kiện trình duyệt bắn ra khi trang đủ điều kiện cài như ứng dụng (Chrome, Edge, Android)
type SuKienCai = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// Kho nhỏ giữ sự kiện cài đặt: sự kiện có thể đến trước khi nút được vẽ nên bắt ngay khi mô-đun chạy
let suKien: SuKienCai | null = null;
let daCai = false;
const nguoiNghe = new Set<() => void>();
const bao = () => nguoiNghe.forEach((f) => f());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    suKien = e as SuKienCai;
    bao();
  });
  window.addEventListener("appinstalled", () => {
    daCai = true;
    suKien = null;
    bao();
  });
}

type TrangThai = "cho" | "dang-dung-app" | "co-the-cai" | "iphone" | "thu-cong";
function trangThai(): TrangThai {
  if (daCai || matchMedia("(display-mode: standalone)").matches) return "dang-dung-app";
  if (suKien) return "co-the-cai";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "iphone";
  return "thu-cong";
}

const dangKy = (goi: () => void) => {
  nguoiNghe.add(goi);
  return () => nguoiNghe.delete(goi);
};

const BUOC_IPHONE = ["Mở finlo.id.vn bằng Safari", "Bấm nút Chia sẻ ở thanh dưới", "Chọn \"Thêm vào MH chính\" rồi bấm Thêm"];
const BUOC_THU_CONG = [
  "Máy tính: bấm biểu tượng cài đặt ở cuối thanh địa chỉ Chrome hoặc Edge",
  "Android: mở menu ⋮ của Chrome, chọn \"Cài đặt ứng dụng\"",
  "iPhone: Safari → Chia sẻ → \"Thêm vào MH chính\"",
];

// Nút cài Finlo như ứng dụng; trình duyệt không hỗ trợ cài một chạm thì hiện các bước làm tay
export function CaiDatApp() {
  const tt = useSyncExternalStore(dangKy, trangThai, () => "cho" as TrangThai);
  const [moHuongDan, setMoHuongDan] = useState(false);

  if (tt === "dang-dung-app")
    return (
      <p className="inline-flex h-12 items-center gap-2 rounded-full bg-nen-noi px-6 font-semibold">
        <span className="h-2 w-2 rounded-full bg-nhan" />
        Bạn đang dùng ứng dụng Finlo
      </p>
    );

  const buoc = tt === "iphone" ? BUOC_IPHONE : BUOC_THU_CONG;

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={async () => {
            if (tt === "co-the-cai" && suKien) {
              await suKien.prompt();
              await suKien.userChoice;
              suKien = null;
              bao();
            } else setMoHuongDan((x) => !x);
          }}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-chu px-7 text-[15px] font-semibold text-nen hover:bg-nhan hover:text-white"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tt === "co-the-cai" ? "Cài Finlo vào máy" : tt === "iphone" ? "Cách cài trên iPhone" : "Hướng dẫn cài đặt"}
        </button>
      </div>
      {moHuongDan && (
        <ol className="mt-5 space-y-2.5">
          {buoc.map((b, i) => (
            <li key={b} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nen-noi text-[12px] font-semibold">
                {i + 1}
              </span>
              <span className="pt-0.5 text-chu-phu">{b}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
