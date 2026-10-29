import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BoLocClient } from "@/components/BoLocClient";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { taoDongLoc } from "@/lib/bo-loc";
import { layBangGia, layNganh, layTaiChinhToanThiTruong } from "@/lib/mofi";

export const metadata: Metadata = { title: "Bộ lọc cổ phiếu" };

export default function TrangBoLoc() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="nhan-muc">Bộ lọc</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Bộ lọc cổ phiếu</h1>
      <p className="mt-1 text-chu-phu">
        Lọc hơn 1.500 mã theo định giá, hiệu quả, tăng trưởng và cổ tức. Chọn bộ lọc mẫu hoặc tự đặt điều kiện.
      </p>
      <Suspense
        fallback={
          <>
            <LuoiMo so={6} cot="md:grid-cols-6" cao="h-8" />
            <BangMo dong={14} />
          </>
        }
      >
        <NoiDung />
      </Suspense>
    </div>
  );
}

async function NoiDung() {
  await connection();
  const [bangGia, tc, nganh] = await Promise.all([layBangGia(), layTaiChinhToanThiTruong(), layNganh()]);
  const dsNganh = Object.entries(nganh.ten)
    .map(([khoa, ten]) => ({ khoa, ten }))
    .sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  return <BoLocClient dongDau={taoDongLoc(bangGia.coPhieu, tc, nganh)} phienDau={bangGia.phien} dsNganh={dsNganh} />;
}
