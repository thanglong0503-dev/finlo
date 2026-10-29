import type { Metadata } from "next";
import { Suspense } from "react";
import { GiaDinhDauTu } from "@/components/GiaDinhDauTu";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { layLaiSuat, layNen, layNenChiSo } from "@/lib/mofi";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]/gia-dinh">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — Giả định đầu tư` };
}

export default function TrangGiaDinh({ params }: PageProps<"/co-phieu/[ma]/gia-dinh">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <Suspense
        fallback={
          <>
            <LuoiMo so={3} cot="md:grid-cols-3" />
            <BangMo dong={6} />
          </>
        }
      >
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const [nen, vni, ls] = await Promise.all([
    layNen(ma).catch(() => []),
    layNenChiSo("VNINDEX").catch(() => null),
    layLaiSuat().catch(() => null),
  ]);
  // Lãi tiết kiệm 12 tháng: trung vị các ngân hàng
  const muc = (ls?.nganHang ?? []).map((b) => b.ls["12t"]).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  const laiSuat = muc.length ? muc[Math.floor(muc.length / 2)] : 5;
  return (
    <GiaDinhDauTu
      ma={ma}
      gia={nen.map((x) => [x.time, x.close])}
      vnIndex={(vni?.nen ?? []).map((x) => [x.time, x.close])}
      laiSuat={laiSuat}
    />
  );
}
