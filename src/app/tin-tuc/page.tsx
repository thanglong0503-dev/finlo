import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BangMo } from "@/components/KhungCho";
import { TinClient } from "@/components/TinClient";
import { layTin } from "@/lib/mofi";

export const metadata: Metadata = { title: "Tin doanh nghiệp" };

export default function TrangTin() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="nhan-muc">Tin tức</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Tin công bố của doanh nghiệp</h1>
      <p className="mt-1 text-chu-phu">
        Cổ tức, giao dịch cổ đông lớn, nhân sự, niêm yết… theo công bố thông tin trên HOSE và HNX.
      </p>
      <Suspense fallback={<BangMo dong={12} />}>
        <NoiDung />
      </Suspense>
    </div>
  );
}

async function NoiDung() {
  await connection();
  const { capNhat, tin } = await layTin();
  return (
    <>
      <TinClient tin={tin} />
      <p className="mt-6 text-[11px] text-chu-phu">
        Nguồn: công bố thông tin của HOSE, HNX qua Mofi, tổng hợp lúc{" "}
        {new Date(capNhat).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" })}
        . Nội dung đầy đủ xem trên trang công bố thông tin của Sở giao dịch.
      </p>
    </>
  );
}
