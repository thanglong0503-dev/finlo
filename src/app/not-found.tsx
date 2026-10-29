import Link from "next/link";
import { TimMa } from "@/components/TimMa";

// Hiện khi mở mã không tồn tại (ví dụ /co-phieu/ABCXYZ) hoặc đường dẫn sai
export default function KhongTimThay() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="nhan-muc">Không tìm thấy</p>
      <h1 className="mt-2 text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Trang hoặc mã này không tồn tại</h1>
      <p className="mt-2 text-chu-phu">Kiểm tra lại mã cổ phiếu, hoặc tra cứu mã khác bên dưới.</p>
      <TimMa className="mx-auto mt-6 max-w-sm text-left" />
      <Link href="/" className="mt-6 inline-block font-medium text-nhan hover:underline">
        ← Về trang chủ
      </Link>
    </div>
  );
}
