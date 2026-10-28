import type { Metadata } from "next";
import { Suspense } from "react";
import { KhungChoChiSo } from "@/components/KhungCho";
import { TrangChiSo } from "@/components/TrangChiSo";

export async function generateMetadata({ params }: PageProps<"/chi-so/[ma]">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `Chỉ số ${ma.toUpperCase()}` };
}

export default function TrangMotChiSo({ params }: PageProps<"/chi-so/[ma]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense fallback={<KhungChoChiSo />}>
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const { ma } = await params;
  return <TrangChiSo ma={ma.toUpperCase()} />;
}
