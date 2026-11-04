import type { Metadata } from "next";
import { BanTinNoiDung } from "@/components/BanTinNoiDung";
import type { KetQuaBanTin } from "@/lib/cuoi-phien";
import duLieu from "@/data/ban-tin.json";

const { ds } = duLieu as unknown as KetQuaBanTin;

export const metadata: Metadata = {
  title: "Bản tin cuối phiên",
  description: ds[0]?.tieuDe ?? "Tóm tắt phiên giao dịch chứng khoán Việt Nam mỗi ngày: chỉ số, ngành, khối ngoại và tín hiệu kỹ thuật.",
};

export default function TrangBanTin() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12">
      <p className="nhan-muc">Thị trường</p>
      <h1 className="mt-2 text-3xl leading-tight font-bold tracking-[-0.03em]">Bản tin cuối phiên</h1>
      {ds[0] ? <BanTinNoiDung b={ds[0]} cacNgay={ds.map((b) => b.ngay)} /> : <p className="mt-6 text-chu-phu">Chưa có bản tin.</p>}
    </div>
  );
}
