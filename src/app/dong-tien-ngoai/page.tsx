import type { Metadata } from "next";
import { DongTienClient } from "@/components/DongTienClient";
import type { KetQuaDongTien } from "@/lib/cuoi-phien";
import duLieu from "@/data/dong-tien-ngoai.json";

export const metadata: Metadata = {
  title: "Dòng tiền khối ngoại",
  description: "Khối ngoại mua bán ròng theo ngành và từng mã trong 20 phiên gần nhất, các mã được gom hoặc xả nhiều phiên liên tiếp.",
};

export default function TrangDongTienNgoai() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12">
      <p className="nhan-muc">Thị trường</p>
      <h1 className="mt-2 text-3xl leading-tight font-bold tracking-[-0.03em]">Dòng tiền khối ngoại</h1>
      <p className="mt-2 max-w-3xl text-chu-phu">Khối ngoại đang gom hay xả ở ngành nào, mã nào được mua hoặc bán nhiều phiên liên tiếp.</p>
      <DongTienClient kq={duLieu as unknown as KetQuaDongTien} />
    </div>
  );
}
