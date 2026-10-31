import type { Metadata } from "next";
import { Suspense } from "react";
import { KhoiMo } from "@/components/KhungCho";
import { NhieuBieuDo } from "@/components/bieu-do/NhieuBieuDo";
import { BO_CUC, docO } from "@/lib/nhieu-bieu-do";

export const metadata: Metadata = {
  title: "Nhiều biểu đồ",
  description: "Xem cùng lúc tới 6 biểu đồ cổ phiếu và tiền số, chỉ báo kỹ thuật dùng chung.",
};

// /bieu-do/nhieu?bo=4&ds=ck-FPT,ts-BTC,ck-VCB,ts-ETH
export default function TrangNhieuBieuDo({ searchParams }: PageProps<"/bieu-do/nhieu">) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-px md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <KhoiMo key={i} className="m-2 h-[380px]" />
          ))}
        </div>
      }
    >
      <NoiDung searchParams={searchParams} />
    </Suspense>
  );
}

async function NoiDung({ searchParams }: { searchParams: PageProps<"/bieu-do/nhieu">["searchParams"] }) {
  const sp = await searchParams;
  const so = Number(sp.bo);
  const bo = BO_CUC.some((b) => b.so === so) ? so : 4;
  const ds = docO(typeof sp.ds === "string" ? sp.ds : undefined);
  // key: đổi tham số (khôi phục bố cục đã lưu) thì dựng lại lưới với trạng thái mới
  return <NhieuBieuDo key={`${bo}:${ds.map((o) => o.ma).join()}`} boDau={bo} dsDau={ds} coThamSo={sp.bo != null || sp.ds != null} />;
}
