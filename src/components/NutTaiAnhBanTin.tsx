"use client";

import { useState } from "react";
import { ngayDayDu, type BanTin } from "@/lib/cuoi-phien";
import { diem, phanTram, tyDong } from "@/lib/dinh-dang";

// Ảnh vẽ ngay trên trình duyệt nên không tốn tài nguyên máy chủ. Luôn nền đen theo nhận diện Finlo, không đổi theo giao diện sáng tối.
const NEN = "#000000";
const THE = "#141414";
const CHU = "#ffffff";
const PHU = "#9a9a9a";
const NHAN = "#19C26B";
const TANG = "#25c26e";
const GIAM = "#f0506e";
const CO = 1080;

const mau = (x: number) => (x > 0 ? TANG : x < 0 ? GIAM : "#e3b341");

async function veAnh(b: BanTin) {
  const hop = document.createElement("canvas");
  hop.width = CO;
  hop.height = CO;
  const g = hop.getContext("2d");
  if (!g) throw new Error("Không vẽ được");
  const phong = getComputedStyle(document.body).fontFamily;
  await Promise.all([document.fonts.load(`700 40px ${phong}`, "Ệ"), document.fonts.load(`400 28px ${phong}`, "Ệ")]);
  const viet = (t: string, x: number, y: number, co: number, m = CHU, dam = 400, canh: CanvasTextAlign = "left") => {
    g.font = `${dam} ${co}px ${phong}`;
    g.fillStyle = m;
    g.textAlign = canh;
    g.fillText(t, x, y);
  };
  const the = (x: number, y: number, r: number, c: number) => {
    g.fillStyle = THE;
    g.beginPath();
    g.roundRect(x, y, r, c, 28);
    g.fill();
  };

  g.fillStyle = NEN;
  g.fillRect(0, 0, CO, CO);
  viet("F", 64, 104, 56, CHU, 800);
  g.font = `800 56px ${phong}`;
  viet("L", 64 + g.measureText("F").width, 104, 56, NHAN, 800);
  viet("Bản tin cuối phiên", CO - 64, 92, 32, CHU, 700, "right");
  viet(ngayDayDu(b.ngay), CO - 64, 130, 26, PHU, 400, "right");

  const vn = b.chiSo[0];
  the(64, 170, CO - 128, 250);
  viet("VN-Index", 104, 232, 30, PHU);
  if (vn) {
    viet(diem(vn.diem), 104, 330, 92, CHU, 800);
    viet(phanTram(vn.phanTram), 104, 388, 38, mau(vn.phanTram), 700);
  }
  viet("Giá trị giao dịch", CO - 104, 232, 26, PHU, 400, "right");
  viet(tyDong(b.giaTri), CO - 104, 280, 40, CHU, 700, "right");
  const rong = b.ngoai.mua - b.ngoai.ban;
  viet(`Khối ngoại ${rong >= 0 ? "mua" : "bán"} ròng`, CO - 104, 336, 26, PHU, 400, "right");
  viet(tyDong(Math.abs(rong) * 1e6), CO - 104, 384, 40, mau(rong), 700, "right");

  // Độ rộng: đủ ba nhãn số để không phụ thuộc vào màu
  the(64, 444, CO - 128, 140);
  const { tang, giam, dung } = b.doRong;
  const ngang = CO - 208;
  const tong = Math.max(1, tang + giam + dung);
  let x = 104;
  for (const [so, m] of [[tang, TANG], [dung, "#e3b341"], [giam, GIAM]] as const) {
    const r = Math.max(0, (so / tong) * ngang - 4);
    g.fillStyle = m;
    g.beginPath();
    g.roundRect(x, 480, r, 16, 6);
    g.fill();
    x += r + 4;
  }
  viet(`${tang} tăng`, 104, 546, 30, TANG, 700);
  viet(`${dung} đứng`, CO / 2, 546, 30, "#e3b341", 700, "center");
  viet(`${giam} giảm`, CO - 104, 546, 30, GIAM, 700, "right");

  // Hai cột ngành
  const rongCot = (CO - 128 - 24) / 2;
  const cot = (xCot: number, tieuDe: string, ds: { ten: string; phanTram: number }[]) => {
    the(xCot, 608, rongCot, 320);
    viet(tieuDe, xCot + 36, 662, 28, PHU);
    ds.slice(0, 4).forEach((n, i) => {
      const y = 722 + i * 54;
      g.font = `400 28px ${phong}`;
      let ten = n.ten;
      while (g.measureText(ten).width > rongCot - 210 && ten.length > 4) ten = ten.slice(0, -1);
      viet(ten === n.ten ? ten : `${ten.trimEnd()}...`, xCot + 36, y, 28);
      viet(phanTram(n.phanTram), xCot + rongCot - 36, y, 28, mau(n.phanTram), 700, "right");
    });
  };
  cot(64, "Ngành tăng tốt nhất", b.nganhTang);
  cot(64 + rongCot + 24, "Ngành giảm mạnh nhất", b.nganhGiam);

  viet("finlo.id.vn", 64, 1000, 28, NHAN, 700);
  viet("Dữ liệu từ Mofi. Không phải khuyến nghị đầu tư.", CO - 64, 1000, 24, PHU, 400, "right");
  return new Promise<Blob>((xong, loi) => hop.toBlob((t) => (t ? xong(t) : loi(new Error("Không tạo được ảnh"))), "image/png"));
}

export function NutTaiAnhBanTin({ banTin }: { banTin: BanTin }) {
  const [trangThai, setTrangThai] = useState<"" | "dang" | "loi">("");
  const tai = async () => {
    setTrangThai("dang");
    try {
      const url = URL.createObjectURL(await veAnh(banTin));
      const a = document.createElement("a");
      a.href = url;
      a.download = `finlo-ban-tin-${banTin.ngay}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setTrangThai("");
    } catch {
      setTrangThai("loi");
    }
  };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={tai} disabled={trangThai === "dang"} className="h-10 rounded-full bg-chu px-6 font-semibold text-nen hover:bg-nhan hover:text-white disabled:opacity-50">
        {trangThai === "dang" ? "Đang tạo ảnh" : "Tải ảnh chia sẻ"}
      </button>
      {trangThai === "loi" && <span role="alert" className="text-giam">Không tạo được ảnh, vui lòng thử lại.</span>}
    </div>
  );
}
