import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { KhungChoChiSo } from "@/components/KhungCho";
import { TrangChiSo } from "@/components/TrangChiSo";

export const metadata: Metadata = { title: "Chỉ số thị trường" };

// /chi-so mặc định là VN-INDEX
export default function TrangChiSoMacDinh() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<KhungChoChiSo />}>
        <VnIndex />
      </Suspense>
    </div>
  );
}

async function VnIndex() {
  await connection();
  return <TrangChiSo ma="VNINDEX" />;
}
