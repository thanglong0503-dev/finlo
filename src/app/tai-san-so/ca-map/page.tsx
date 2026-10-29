import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CaMap } from "@/components/CaMap";
import { layCaMapBtc } from "@/lib/ca-map";

export const metadata: Metadata = {
  title: "Theo dõi cá mập",
  description: "Giao dịch Bitcoin lớn trên chuỗi và lệnh lớn trên Binance Futures theo thời gian thực.",
};

export default function TrangCaMap() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/tai-san-so" className="text-[13px] text-chu-phu hover:text-chu">
        ← Tài sản số
      </Link>
      <h1 className="mt-2 text-[32px] leading-[1.2] font-bold tracking-[-0.035em] sm:text-[40px]">Theo dõi cá mập</h1>
      <p className="mt-1 max-w-3xl text-chu-phu">
        Dòng tiền lớn đang di chuyển: Bitcoin chuyển từ 100 BTC trên chuỗi và lệnh khớp lớn trên Binance Futures, cập nhật theo thời
        gian thực.
      </p>
      <Suspense fallback={<div className="mt-6 h-[520px] animate-pulse rounded-3xl bg-nen-phu" />}>
        <NoiDung />
      </Suspense>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          {
            ten: "Chuyển lớn chưa chắc là bán",
            noiDung: "Phần lớn giao dịch lớn là sàn hoặc tổ chức sắp xếp ví nội bộ. Nên xem cùng giá và lệnh lớn trên sàn.",
          },
          {
            ten: "Gom ví và chia nhỏ",
            noiDung: "Gom ví nhiều thường là tiền đang nạp vào sàn (có thể để bán); chia nhỏ nhiều thường là sàn trả lệnh rút về ví cá nhân.",
          },
          {
            ten: "Lệnh lớn chủ động",
            noiDung: "Chuỗi lệnh mua lớn liên tục thường đi trước nhịp tăng ngắn hạn, và ngược lại; tín hiệu mạnh hơn khi đi cùng Open Interest tăng.",
          },
        ].map((g) => (
          <div key={g.ten} className="rounded-2xl border border-vien p-5">
            <h3 className="font-semibold">{g.ten}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-chu-phu">{g.noiDung}</p>
          </div>
        ))}
      </section>
      <p className="mt-4 text-[12px] text-chu-phu">
        Nguồn: mempool.space, Blockchain.com, Binance. Finlo chưa gắn nhãn ví (sàn, quỹ ETF, tổ chức) vì dữ liệu nhãn là dịch vụ trả phí.
        Thông tin chỉ để tham khảo, không phải khuyến nghị đầu tư.{" "}
        <Link href="/tai-san-so/phai-sinh" className="text-nhan hover:underline">
          Xem thêm phái sinh: funding, thanh lý →
        </Link>
      </p>
    </div>
  );
}

async function NoiDung() {
  await connection();
  const btc = await layCaMapBtc();
  return <CaMap lichSu={btc?.giaoDich ?? []} />;
}
