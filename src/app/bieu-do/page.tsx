import type { Metadata } from "next";
import { Suspense } from "react";
import type { Nguon } from "@/components/bieu-do/BieuDoTuongTac";
import { TramGiaoDich } from "@/components/bieu-do/TramGiaoDich";
import { KhoiMo } from "@/components/KhungCho";

export const metadata: Metadata = {
  title: "Biểu đồ kỹ thuật",
  description: "Biểu đồ chứng khoán và tài sản số với chỉ báo kỹ thuật và chỉ báo riêng của Finlo.",
};

// /bieu-do?loai=ck&ma=FPT hoặc /bieu-do?loai=ts&ma=BTC
export default function TrangBieuDo({ searchParams }: PageProps<"/bieu-do">) {
  return (
    <Suspense
      fallback={
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_300px_300px]">
          <KhoiMo className="m-3 h-[600px]" />
          <KhoiMo className="m-3 hidden h-[600px] lg:block" />
          <KhoiMo className="m-3 hidden h-[600px] xl:block" />
        </div>
      }
    >
      <NoiDung searchParams={searchParams} />
    </Suspense>
  );
}

async function NoiDung({ searchParams }: { searchParams: PageProps<"/bieu-do">["searchParams"] }) {
  const sp = await searchParams;
  const loai = sp.loai === "ts" ? "ts" : "ck";
  const ma = typeof sp.ma === "string" && /^[A-Za-z0-9]{1,12}$/.test(sp.ma) ? sp.ma.toUpperCase() : loai === "ts" ? "BTC" : "VNM";
  return <TramGiaoDich nguonDau={loai as Nguon} maDau={ma} />;
}
