"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Ô tra Fin Rating của một mã: chuyển sang trang Fin Rating trong hồ sơ mã
export function TraMaRating({ goiY = ["FPT", "VCB", "HPG", "MWG", "VND"] }: { goiY?: string[] }) {
  const router = useRouter();
  const [ma, datMa] = useState("");
  const di = (m: string) => {
    const x = m.trim().toUpperCase();
    if (/^[A-Z0-9]{3,10}$/.test(x)) router.push(`/co-phieu/${x}/fin-rating`);
  };
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          di(ma);
        }}
        className="flex gap-2"
      >
        <input
          value={ma}
          onChange={(e) => datMa(e.target.value.toUpperCase())}
          placeholder="Nhập mã chứng khoán"
          aria-label="Mã cổ phiếu"
          maxLength={10}
          className="h-11 w-full max-w-xs rounded-full border border-vien bg-nen px-5 font-semibold uppercase placeholder:font-normal placeholder:normal-case focus:border-nhan focus:outline-none"
        />
        <button type="submit" className="h-11 shrink-0 rounded-full bg-chu px-6 font-semibold text-nen hover:bg-nhan hover:text-white">
          Xem điểm
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {goiY.map((m) => (
          <button key={m} type="button" onClick={() => di(m)} className="rounded-full border border-vien px-3 py-0.5 text-[12px] text-chu-phu hover:text-chu">
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
