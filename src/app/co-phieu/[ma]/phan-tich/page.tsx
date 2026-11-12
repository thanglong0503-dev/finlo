import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { BangBaoCao, MAU_NHOM } from "@/components/BangKhuyenNghi";
import { BieuDoSo } from "@/components/BieuDoSo";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { DinhGiaChuyenSau } from "@/components/phan-tich/DinhGiaChuyenSau";
import { taoDongLoc } from "@/lib/bo-loc";
import { giaNghin } from "@/lib/dinh-dang";
import { BAO_CAO, TEN_NHOM, dongThuan, thongKe } from "@/lib/khuyen-nghi";
import { layBangGia, layBaoCao, layDanhGia, layEpsChuanHoa, layHoSo, layLaiSuat, layNen, layNenChiSo, layNganh, layNoNhom, layTaiChinhToanThiTruong } from "@/lib/mofi";
import { phanTichSau, type TheSo, type TruCot } from "@/lib/phan-tich-sau";
import { cagr, phanTichDoanhNghiep, phanVi, soVoiNganh, trungVi, type ChiTieuNganh, type SoNam } from "@/lib/phan-tich";
import { dinhDangCot } from "@/lib/so-sanh";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]/phan-tich">): Promise<Metadata> {
  const { ma } = await params;
  return {
    title: `${ma.toUpperCase()} — Phân tích và định giá chuyên sâu`,
    description: `Định giá ${ma.toUpperCase()} theo DCF, thu nhập thặng dư, chiết khấu cổ tức và bội số lịch sử; chất lượng lợi nhuận, sức khoẻ tài chính, tăng trưởng và rủi ro.`,
  };
}

export default function TrangPhanTich({ params }: PageProps<"/co-phieu/[ma]/phan-tich">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <Suspense
        fallback={
          <>
            <LuoiMo so={4} cot="md:grid-cols-4" />
            <BangMo dong={8} />
          </>
        }
      >
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

const so = (x: number | null, le = 1) =>
  x == null || !Number.isFinite(x) ? "—" : x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le });
// Báo cáo theo triệu đồng -> tỷ đồng
const ty = (x: number | null) => (x == null ? "—" : `${so(x / 1000, 0)} tỷ`);
const pt = (x: number | null) => (x == null ? "—" : `${so(x)}%`);
const lan = (x: number | null) => (x == null ? "—" : `${so(x, 2)}x`);

function Chuong({ so: thuTu, ten, nhanDinh, children, id }: { so: number; ten: string; nhanDinh: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="hien-dan mt-8 scroll-mt-28 first:mt-0">
      <p className="nhan-muc">Chương {thuTu}</p>
      <h2 className="mt-1 text-xl font-bold tracking-[-0.03em]">{ten}</h2>
      <p className="mt-2 max-w-3xl text-chu-phu">{nhanDinh}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function The({ nhan, gt, phu, tot }: { nhan: string; gt: string; phu?: ReactNode; tot?: boolean | null }) {
  return (
    <div className="bg-nen p-4">
      <p className="text-[12px] text-chu-phu">{nhan}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${tot == null ? "" : tot ? "text-tang" : "text-giam"}`}>{gt}</p>
      {phu && <p className="mt-0.5 text-[11px] text-chu-phu tabular-nums">{phu}</p>}
    </div>
  );
}

const Luoi = ({ children, cot = "grid-cols-2 md:grid-cols-4" }: { children: ReactNode; cot?: string }) => (
  <div className={`grid gap-px overflow-hidden rounded-2xl border border-vien bg-vien ${cot}`}>{children}</div>
);

// So với trung vị ngành: thẻ có màu theo tốt/xấu và hạng trong ngành
function TheNganh({ nhan, c, donVi, thapTot }: { nhan: string; c: ChiTieuNganh; donVi: "%" | "x" | "pt"; thapTot?: boolean }) {
  const tot = c.gt == null || c.tv == null ? null : thapTot ? c.gt < c.tv : c.gt > c.tv;
  return (
    <The
      nhan={nhan}
      gt={dinhDangCot(c.gt, donVi)}
      tot={tot}
      phu={
        <>
          Trung vị ngành {dinhDangCot(c.tv, donVi)}
          {c.hang > 0 && ` · hạng ${c.hang}/${c.tong}`}
        </>
      }
    />
  );
}

// Cột theo năm vẽ bằng HTML (nhẹ, không cần JavaScript); có hỗ trợ số âm
function CotNam({ ds, dinhDang, mau = "bg-nhan" }: { ds: SoNam[]; dinhDang: (x: number | null) => string; mau?: string }) {
  const co = ds.filter((x) => x.gt != null);
  if (co.length < 2) return <p className="text-[12px] text-chu-phu">Chưa đủ số liệu.</p>;
  const lon = Math.max(...co.map((x) => Math.abs(x.gt!))) || 1;
  const coAm = co.some((x) => x.gt! < 0);
  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
      {ds.map((x) => {
        const h = x.gt == null ? 0 : (Math.abs(x.gt) / lon) * (coAm ? 50 : 100);
        return (
          <div key={x.nam} className="flex min-w-10 flex-1 flex-col items-center">
            <span className="mb-1 text-[10px] whitespace-nowrap text-chu-phu tabular-nums">{dinhDang(x.gt)}</span>
            <div className="relative h-24 w-full max-w-10">
              <div
                className={`absolute inset-x-0 rounded-sm ${x.gt != null && x.gt < 0 ? "bg-giam" : mau}`}
                style={
                  coAm
                    ? x.gt != null && x.gt < 0
                      ? { top: "50%", height: `${h}%` }
                      : { bottom: "50%", height: `${h}%` }
                    : { bottom: 0, height: `${h}%` }
                }
              />
            </div>
            <span className="mt-1 text-[11px] text-chu-phu tabular-nums">{x.nam}</span>
          </div>
        );
      })}
    </div>
  );
}

function KhungCot({ ten, children }: { ten: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-vien p-4">
      <p className="mb-3 text-[13px] font-semibold">{ten}</p>
      {children}
    </div>
  );
}

const LuoiThe = ({ ds, cot }: { ds: TheSo[]; cot?: string }) => (
  <Luoi cot={cot}>
    {ds.map((t) => (
      <The key={t.nhan} nhan={t.nhan} gt={t.gt} phu={t.phu} tot={t.tot} />
    ))}
  </Luoi>
);

// Một tiêu chí: chấm màu kèm chữ để không phụ thuộc vào màu
function DongTieuChi({ ten, dat, chiTiet }: { ten: string; dat: boolean | null; chiTiet: string }) {
  return (
    <li className="flex gap-2.5 py-1.5">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dat == null ? "bg-chu-phu/40" : dat ? "bg-tang" : "bg-giam"}`} aria-hidden />
      <span className="min-w-0">
        <span className="block text-[13px]">
          {ten} <span className={`text-[11px] font-semibold ${dat == null ? "text-chu-phu" : dat ? "text-tang" : "text-giam"}`}>{dat == null ? "Chưa đủ số liệu" : dat ? "Đạt" : "Chưa đạt"}</span>
        </span>
        <span className="block text-[12px] text-chu-phu tabular-nums">{chiTiet}</span>
      </span>
    </li>
  );
}

function BangTruCot({ ds }: { ds: TruCot[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {ds.map((t) => {
        const co = t.ds.filter((x) => x.dat != null);
        const dat = co.filter((x) => x.dat).length;
        return (
          <section key={t.ten} className="rounded-2xl bg-nen-phu p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{t.ten}</h3>
              <p className="text-[13px] tabular-nums">
                <span className="text-lg font-bold">{dat}</span>
                <span className="text-chu-phu">/{co.length} tiêu chí</span>
              </p>
            </div>
            <div className="mt-2 flex gap-1" aria-hidden>
              {t.ds.map((x) => (
                <span key={x.ten} className={`h-1.5 flex-1 rounded-full ${x.dat == null ? "bg-nen-noi" : x.dat ? "bg-tang" : "bg-giam"}`} />
              ))}
            </div>
            <ul className="mt-2">
              {t.ds.map((x) => (
                <DongTieuChi key={x.ten} {...x} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const MUC_LUC = [
  ["tom-tat", "Tóm tắt"],
  ["dinh-gia", "Định giá"],
  ["sinh-loi", "Sinh lời"],
  ["chat-luong", "Chất lượng"],
  ["suc-khoe", "Sức khoẻ tài chính"],
  ["tang-truong", "Tăng trưởng"],
  ["co-tuc", "Cổ tức"],
  ["rui-ro", "Rủi ro"],
  ["khuyen-nghi", "Khuyến nghị CTCK"],
  ["phuong-phap", "Phương pháp"],
] as const;

const cuoiCo = (ds: SoNam[]) => [...ds].reverse().find((x) => x.gt != null)?.gt ?? null;

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const [bc, hoSo, nen, bangGia, tc, nganh, dg, epsChuanHoa, vni, laiSuat] = await Promise.all([
    layBaoCao(ma),
    layHoSo(ma),
    layNen(ma).catch(() => []),
    layBangGia(),
    layTaiChinhToanThiTruong(),
    layNganh(),
    layDanhGia(ma),
    layEpsChuanHoa(ma),
    layNenChiSo("VNINDEX").catch(() => null),
    layLaiSuat().catch(() => null),
  ]);
  if (!bc || !hoSo?.soCoPhieu || !nen.length)
    return <p className="text-chu-phu">{ma} chưa có đủ báo cáo tài chính để phân tích.</p>;

  const pt_ = phanTichDoanhNghiep(bc, nen, hoSo.soCoPhieu);
  const khoa = nganh.maNganh[ma];
  const cungNganh = khoa ? bangGia.coPhieu.filter((c) => nganh.maNganh[c.ma] === khoa) : [];
  const dongNganh = taoDongLoc(cungNganh, tc, nganh);
  const ban = dongNganh.find((d) => d.ma === ma) ?? taoDongLoc(bangGia.coPhieu.filter((c) => c.ma === ma), tc, nganh)[0];
  const sv = (k: Parameters<typeof soVoiNganh>[2], thapTot = false) => soVoiNganh(ban, dongNganh, k, thapTot);
  const tenNganh = khoa ? nganh.ten[khoa] : null;

  // ---- Phân tích chuyên sâu từ số liệu theo quý
  const giaNay = bangGia.coPhieu.find((c) => c.ma === ma)?.gia ?? nen[nen.length - 1].close;
  // Lãi suất phi rủi ro: trung vị lãi tiết kiệm 12 tháng của các ngân hàng
  const mucLai = (laiSuat?.nganHang ?? []).map((b) => b.ls["12t"]).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  const rf = mucLai.length ? mucLai[Math.floor(mucLai.length / 2)] : 5;
  let noXau: number | null = null;
  if (bc.loai === "ngan_hang") {
    const cuaMa = (await layNoNhom().catch(() => ({}) as Awaited<ReturnType<typeof layNoNhom>>))[ma];
    const ky = cuaMa ? Object.keys(cuaMa).sort().at(-1) : undefined;
    const x = ky ? cuaMa[ky] : null;
    noXau = x && x.tong > 0 ? (x.noXau / x.tong) * 100 : null;
  }
  const sau =
    dg && dg.quy.length >= 8
      ? phanTichSau({ dg, nen, vni: vni?.nen ?? [], soCp: hoSo.soCoPhieu, gia: giaNay, rf, peNganh: khoa ? (nganh.pe[khoa] ?? null) : null, tenNganh, epsChuanHoa, noXau })
      : null;
  const datTong = sau ? sau.truCot.flatMap((t) => t.ds).filter((x) => x.dat != null) : [];

  // ---- 1. Định giá
  const { pe: lsPe, pb: lsPb } = pt_.dinhGia;
  const peNay = ban?.pe != null && ban.pe > 0 ? ban.pe : null;
  const pbNay = ban?.pb ?? null;
  const giaTriPe = lsPe.map((x) => x.value);
  const giaTriPb = lsPb.map((x) => x.value);
  const tvPe = trungVi(giaTriPe);
  const tvPb = trungVi(giaTriPb);
  const viPe = peNay != null ? phanVi(giaTriPe, peNay) : null;
  const viPb = pbNay != null ? phanVi(giaTriPb, pbNay) : null;
  const soNamLs = lsPe.length ? Math.round((lsPe[lsPe.length - 1].time - lsPe[0].time) / (365.25 * 86400)) : 0;
  // Ngân hàng, chứng khoán thường định giá theo P/B; doanh nghiệp khác theo P/E
  const theoPb = bc.loai === "ngan_hang" || bc.loai === "chung_khoan" || peNay == null;
  const vi = theoPb ? viPb : viPe;
  // Biểu đồ bỏ các tháng định giá vọt quá 3 lần trung vị (lãi rất mỏng, giai đoạn mới niêm yết) để không ép dẹt phần còn lại
  const tvVe = (theoPb ? tvPb : tvPe) ?? 0;
  const lsVe = (theoPb ? lsPb : lsPe).filter((x) => !tvVe || x.value <= tvVe * 3);
  const loaiDinhGia = theoPb ? "P/B" : "P/E";
  const nhanDinhDinhGia =
    vi == null
      ? "Chưa đủ lịch sử để so sánh mức định giá."
      : `${ma} đang giao dịch ở ${loaiDinhGia} ${so(theoPb ? pbNay : peNay, 2)}, ${
          vi < 30 ? "thấp" : vi > 70 ? "cao" : "quanh mức trung bình"
        } so với chính nó: rẻ hơn ${so(100 - vi, 0)}% số tháng trong ${soNamLs} năm qua (trung vị ${so(
          theoPb ? tvPb : tvPe,
          2,
        )}).${tenNganh ? ` Trung vị ${loaiDinhGia} ngành ${tenNganh}: ${dinhDangCot(sv(theoPb ? "pb" : "pe", true).tv, "x")}.` : ""}`;

  // ---- 2. Quy mô
  const vonNganh = dongNganh.reduce((s, d) => s + (d.vonHoa ?? 0), 0);
  const hangVon = [...dongNganh].sort((a, b) => (b.vonHoa ?? 0) - (a.vonHoa ?? 0)).findIndex((d) => d.ma === ma) + 1;
  const dtNganh = cungNganh.reduce((s, c) => s + (tc[c.ma]?.doanhThu ?? 0), 0);
  const dtBan = tc[ma]?.doanhThu ?? null;
  const thiPhan = dtBan != null && dtNganh > 0 ? (dtBan / dtNganh) * 100 : null;

  // ---- 3. Sinh lời
  const roe = sv("roe");
  const nhanDinhSinhLoi =
    roe.gt == null
      ? "Chưa đủ số liệu lợi nhuận 4 quý gần nhất."
      : `ROE 4 quý gần nhất ${pt(roe.gt)}${
          roe.tv != null ? `, ${roe.gt > roe.tv ? "cao hơn" : "thấp hơn"} trung vị ngành (${pt(roe.tv)})` : ""
        }. ${roe.gt >= 15 ? "Mỗi 100 đồng vốn chủ tạo ra hơn 15 đồng lãi/năm — mức hiệu quả tốt." : roe.gt >= 8 ? "Hiệu quả sử dụng vốn ở mức vừa phải." : "Hiệu quả sử dụng vốn còn thấp."}`;

  // ---- 4. DuPont
  const dp = pt_.dupont.filter((x) => x.roe != null);
  const dpCuoi = dp[dp.length - 1];
  const dpDau = dp[Math.max(0, dp.length - 5)];
  const nguonRoe =
    dpCuoi && dpDau && dpCuoi !== dpDau && dpCuoi.bien != null && dpDau.bien != null && dpCuoi.vongQuay != null && dpDau.vongQuay != null && dpCuoi.donBay != null && dpDau.donBay != null
      ? (() => {
          const thay = [
            { ten: "biên lợi nhuận", r: dpCuoi.bien! / dpDau.bien! },
            { ten: "vòng quay tài sản", r: dpCuoi.vongQuay! / dpDau.vongQuay! },
            { ten: "đòn bẩy tài chính", r: dpCuoi.donBay! / dpDau.donBay! },
          ].sort((a, b) => Math.abs(Math.log(b.r)) - Math.abs(Math.log(a.r)))[0];
          return `Từ ${dpDau.nam} đến ${dpCuoi.nam}, ROE đi từ ${pt(dpDau.roe)} tới ${pt(dpCuoi.roe)}; thay đổi lớn nhất đến từ ${thay.ten} (${thay.r >= 1 ? "tăng" : "giảm"} ${so(Math.abs(thay.r - 1) * 100, 0)}%).`;
        })()
      : "ROE được tách thành ba phần: lãi trên mỗi đồng doanh thu, doanh thu trên mỗi đồng tài sản, và tài sản trên mỗi đồng vốn chủ.";

  // ---- 5. Nợ
  const noVonCuoi = cuoiCo(pt_.noVon);
  const noVon = sv("noVon", true);
  const nhanDinhNo =
    noVonCuoi == null
      ? "Chưa đủ số liệu nợ."
      : pt_.nh
        ? `Ngân hàng hoạt động bằng tiền gửi nên nợ/vốn chủ cao là bình thường (${lan(noVonCuoi)} năm gần nhất); cần so với các ngân hàng khác hơn là với doanh nghiệp thường.`
        : `Nợ phải trả bằng ${lan(noVonCuoi)} vốn chủ sở hữu (năm gần nhất)${noVon.tv != null ? `, trung vị ngành ${lan(noVon.tv)}` : ""}. ${noVonCuoi < 1 ? "Cơ cấu vốn an toàn, phụ thuộc ít vào nợ." : noVonCuoi < 2 ? "Mức nợ vừa phải." : "Dùng nợ nhiều — lợi nhuận nhạy với lãi suất."}`;

  // ---- 6. Dòng tiền
  const cfoLn = pt_.cfoTrenLn.filter((x) => x.gt != null).slice(-5);
  const tbCfoLn = cfoLn.length ? cfoLn.reduce((s, x) => s + x.gt!, 0) / cfoLn.length : null;
  const nhanDinhDongTien = pt_.nh
    ? "Dòng tiền kinh doanh của ngân hàng biến động theo tiền gửi và cho vay nên ít nói lên chất lượng lợi nhuận; tham khảo thêm."
    : tbCfoLn == null
      ? "Chưa đủ số liệu dòng tiền."
      : `Bình quân ${cfoLn.length} năm gần nhất, mỗi 100 đồng lãi đi kèm ${so(tbCfoLn * 100, 0)} đồng tiền thật từ kinh doanh. ${
          tbCfoLn >= 0.8 ? "Lợi nhuận được chuyển thành tiền tốt." : tbCfoLn >= 0.4 ? "Một phần lợi nhuận còn nằm ở khoản phải thu, hàng tồn kho." : "Lợi nhuận chưa thu được thành tiền — cần xem kỹ khoản phải thu, tồn kho."
        }`;

  // ---- 7. Tăng trưởng
  const cagrDt = cagr(pt_.dt);
  const cagrLn = cagr(pt_.ln);
  const nhanDinhTangTruong =
    cagrDt == null && cagrLn == null
      ? "Chưa đủ số liệu để tính tăng trưởng."
      : `Trong ${cagrDt?.soNam ?? cagrLn?.soNam} năm gần nhất, ${pt_.tenDoanhThu.toLowerCase()} tăng bình quân ${pt(cagrDt?.gt ?? null)}/năm, lợi nhuận công ty mẹ ${pt(cagrLn?.gt ?? null)}/năm.${
          cagrDt && cagrLn ? (cagrLn.gt > cagrDt.gt ? " Lợi nhuận tăng nhanh hơn doanh thu: biên lợi nhuận đang mở rộng." : " Lợi nhuận tăng chậm hơn doanh thu: biên lợi nhuận bị thu hẹp.") : ""
        }`;

  // ---- 8. Cổ tức
  const coTuc = sv("coTuc");
  const chiTra = pt_.tyLeChiTra.filter((x) => x.gt != null).slice(-5);
  const tbChiTra = chiTra.length ? chiTra.reduce((s, x) => s + x.gt!, 0) / chiTra.length : null;
  const nhanDinhCoTuc =
    coTuc.gt == null || coTuc.gt === 0
      ? `${ma} không trả cổ tức tiền mặt trong 4 quý gần nhất (có thể trả bằng cổ phiếu hoặc giữ lại để tái đầu tư).`
      : `Tỷ suất cổ tức tiền mặt 4 quý gần nhất ${pt(coTuc.gt)} trên giá hiện tại${tbChiTra != null ? `; bình quân chi ${so(tbChiTra, 0)}% lợi nhuận cho cổ đông mỗi năm` : ""}.`;

  // ---- 9. Khuyến nghị của CTCK
  const baoMa = BAO_CAO.filter((b) => b.ma === ma);
  const dt9 = dongThuan(ma);
  const tk9 = thongKe(baoMa);
  const giaHienTai = bangGia.coPhieu.find((c) => c.ma === ma)?.gia ?? null;
  const conLai = giaHienTai && dt9.giaTV ? (dt9.giaTV / giaHienTai - 1) * 100 : null;
  const nhanDinhKN = !baoMa.length
    ? `Chưa có báo cáo khuyến nghị nào của CTCK cho ${ma} trong dữ liệu Finlo.`
    : dt9.ds.length
      ? `${dt9.ds.length} CTCK đưa giá mục tiêu trong 6 tháng qua, trung vị ${giaNghin(dt9.giaTV!)}${
          conLai != null ? ` — ${conLai >= 0 ? "cao hơn" : "thấp hơn"} giá hiện tại ${so(Math.abs(conLai))}%` : ""
        }.${tk9.daKet ? ` Các khuyến nghị trước đây cho ${ma} đạt mục tiêu ${so(tk9.tyLeDat, 0)}% số lần.` : ""}`
      : `Không có giá mục tiêu mới trong 6 tháng qua; ${baoMa.length} báo cáo trước đó.`;

  const sinhLoi = [
    { nhan: "ROE", c: roe, donVi: "%" as const },
    { nhan: "ROA", c: sv("roa"), donVi: "%" as const },
    ...(pt_.nh ? [] : [{ nhan: "Biên lợi nhuận gộp", c: sv("bienGop"), donVi: "%" as const }]),
    { nhan: "Biên lợi nhuận ròng", c: sv("bienRong"), donVi: "%" as const },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="nhan-muc">Phân tích và định giá chuyên sâu</p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em]">
            {ma}
            {tenNganh && (
              <>
                {" "}
                · <Link href={`/nganh/${khoa}`} className="text-nhan hover:underline">{tenNganh}</Link>
              </>
            )}
          </h1>
        </div>
        <p className="text-[12px] text-chu-phu">
          Báo cáo năm {bc.nam[0]}–{bc.nam[bc.nam.length - 1]} · quý gần nhất {bc.quy[bc.quy.length - 1]}
        </p>
      </div>

      <nav aria-label="Mục lục" className="mt-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {MUC_LUC.map(([id, ten]) => (
          <a key={id} href={`#${id}`} className="inline-flex h-8 shrink-0 items-center rounded-full bg-nen-noi px-3 text-[13px] text-chu-phu hover:text-chu">
            {ten}
          </a>
        ))}
      </nav>

      <div className="mt-6">
        {sau && (
          <section id="tom-tat" className="hien-dan scroll-mt-28">
            <h2 className="text-xl font-bold tracking-[-0.03em]">Tóm tắt luận điểm</h2>
            <p className="mt-2 max-w-3xl text-chu-phu">
              {ma} đạt {datTong.filter((x) => x.dat).length}/{datTong.length} tiêu chí trên năm trụ cột. Mỗi tiêu chí là một phép thử có ngưỡng cố định, áp dụng như nhau cho mọi mã cùng loại hình; số liệu đến {sau.kyGanNhat}.
            </p>
            <div className="mt-4">
              <BangTruCot ds={sau.truCot} />
            </div>
          </section>
        )}

        <Chuong so={1} id="dinh-gia" ten="Định giá" nhanDinh={nhanDinhDinhGia}>
          {sau && (
            <div className="mb-4">
              <DinhGiaChuyenSau dv={sau.dauVao} macDinh={sau.giaDinh} />
            </div>
          )}
          {sau && (sau.dauVao.boi.pe || sau.dauVao.boi.pb) && (
            <div className="mb-3 overflow-x-auto rounded-2xl border border-vien">
              <table className="w-full min-w-[620px] text-right text-[13px] tabular-nums">
                <caption className="border-b border-vien px-4 py-3 text-left font-semibold">Bội số thị trường đã thật sự trả trong 5 năm qua</caption>
                <thead className="text-[12px] text-chu-phu">
                  <tr className="border-b border-vien">
                    <th className="px-4 py-2 text-left font-medium">Bội số</th>
                    <th className="px-3 py-2 font-medium">Hôm nay</th>
                    <th className="px-3 py-2 font-medium">Vùng thấp (25%)</th>
                    <th className="px-3 py-2 font-medium">Trung vị</th>
                    <th className="px-3 py-2 font-medium">Vùng cao (75%)</th>
                    <th className="px-4 py-2 font-medium">Rẻ hơn</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["P/E", sau.dauVao.boi.pe],
                      ["P/B", sau.dauVao.boi.pb],
                      ["EV/EBITDA", sau.dauVao.boi.evEbitda],
                    ] as const
                  ).map(([ten, b]) =>
                    b ? (
                      <tr key={ten} className="border-b border-vien last:border-0">
                        <td className="px-4 py-2 text-left font-semibold">{ten}</td>
                        <td className={`px-3 py-2 font-semibold ${b.nay == null ? "" : b.nay < b.tv ? "text-tang" : "text-giam"}`}>{b.nay != null ? so(b.nay, 2) : "—"}</td>
                        <td className="px-3 py-2">{so(b.p25, 2)}</td>
                        <td className="px-3 py-2">{so(b.tv, 2)}</td>
                        <td className="px-3 py-2">{so(b.p75, 2)}</td>
                        <td className="px-4 py-2">{b.vi != null ? `${so(100 - b.vi, 0)}% số phiên` : "—"}</td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
              <p className="border-t border-vien px-4 py-2 text-[11px] text-chu-phu">
                Mỗi phiên ghép với báo cáo quý đã công bố tính đến phiên đó, {sau.dauVao.boi.pb?.soPhien ?? sau.dauVao.boi.pe?.soPhien} phiên. PEG {sau.coBan.peg != null ? so(sau.coBan.peg, 2) : "—"} · EPS 4 quý {sau.coBan.eps != null ? so(sau.coBan.eps, 0) : "—"} đồng · giá trị sổ sách {sau.coBan.bvps != null ? so(sau.coBan.bvps, 0) : "—"} đồng mỗi cổ phiếu.
              </p>
            </div>
          )}
          <Luoi>
            <The
              nhan="P/E hiện tại"
              gt={lan(peNay)}
              tot={peNay != null && tvPe != null ? peNay < tvPe : null}
              phu={`Trung vị ${soNamLs} năm ${lan(tvPe)}${viPe != null ? ` · cao hơn ${so(viPe, 0)}% số tháng` : ""}`}
            />
            <The
              nhan="P/B hiện tại"
              gt={lan(pbNay)}
              tot={pbNay != null && tvPb != null ? pbNay < tvPb : null}
              phu={`Trung vị ${lan(tvPb)}${viPb != null ? ` · cao hơn ${so(viPb, 0)}% số tháng` : ""}`}
            />
            <TheNganh nhan="P/E so với ngành" c={sv("pe", true)} donVi="x" thapTot />
            <TheNganh nhan="P/B so với ngành" c={sv("pb", true)} donVi="x" thapTot />
          </Luoi>
          {lsVe.length > 12 && (
            <div className="mt-3 rounded-2xl border border-vien p-4">
              <p className="mb-2 text-[13px] font-semibold">Lịch sử {loaiDinhGia} theo tháng</p>
              <BieuDoSo
                donVi="lan"
                cao={240}
                duong={[
                  { ten: loaiDinhGia, diem: lsVe },
                  { ten: "Trung vị", diem: lsVe.map((x) => ({ time: x.time, value: tvVe })) },
                ]}
              />
            </div>
          )}
        </Chuong>

        <Chuong
          so={2}
          ten="Quy mô"
          nhanDinh={
            tenNganh && hangVon > 0
              ? `${ma} lớn thứ ${hangVon}/${dongNganh.length} trong ngành ${tenNganh} theo vốn hoá${
                  thiPhan != null ? `, chiếm ${pt(thiPhan)} ${pt_.tenDoanhThu.toLowerCase()} của cả ngành (4 quý gần nhất)` : ""
                }.`
              : "Quy mô theo vốn hoá và báo cáo tài chính gần nhất."
          }
        >
          <Luoi>
            <The nhan="Vốn hoá" gt={dinhDangCot(ban?.vonHoa ?? null, "vh")} phu={vonNganh > 0 && ban?.vonHoa ? `${pt((ban.vonHoa / vonNganh) * 100)} vốn hoá ngành` : undefined} />
            <The nhan={`${pt_.tenDoanhThu} 4 quý`} gt={ty(dtBan)} phu={thiPhan != null ? `${pt(thiPhan)} của ngành` : undefined} />
            <The nhan="Lợi nhuận 4 quý" gt={ty(tc[ma]?.lnst ?? null)} />
            <The nhan="Tổng tài sản" gt={ty(tc[ma]?.tongTaiSan ?? null)} phu={`Vốn chủ ${ty(tc[ma]?.vonChu ?? null)}`} />
          </Luoi>
        </Chuong>

        <Chuong so={3} id="sinh-loi" ten="Khả năng sinh lời" nhanDinh={nhanDinhSinhLoi}>
          <Luoi>
            {sinhLoi.map((x) => (
              <TheNganh key={x.nhan} nhan={x.nhan} c={x.c} donVi={x.donVi} />
            ))}
          </Luoi>
          {!pt_.nh && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <KhungCot ten="Biên lợi nhuận gộp theo năm">
                <CotNam ds={pt_.bienGop} dinhDang={pt} />
              </KhungCot>
              <KhungCot ten="ROE theo năm">
                <CotNam ds={pt_.dupont.map((x) => ({ nam: x.nam, gt: x.roe }))} dinhDang={pt} />
              </KhungCot>
            </div>
          )}
        </Chuong>

        <Chuong so={4} ten="Phân rã ROE (DuPont)" nhanDinh={nguonRoe}>
          <div className="overflow-x-auto rounded-2xl border border-vien">
            <table className="w-full min-w-[560px] text-[13px] tabular-nums">
              <thead className="text-chu-phu">
                <tr className="border-b border-vien">
                  <th className="px-3 py-2 text-left font-medium">Năm</th>
                  <th className="px-3 py-2 text-right font-medium">Biên LN ròng</th>
                  <th className="px-3 py-2 text-right font-medium">× Vòng quay tài sản</th>
                  <th className="px-3 py-2 text-right font-medium">× Đòn bẩy</th>
                  <th className="px-3 py-2 text-right font-medium">= ROE</th>
                </tr>
              </thead>
              <tbody>
                {pt_.dupont.map((x) => (
                  <tr key={x.nam} className="border-b border-vien last:border-0">
                    <td className="px-3 py-2 font-semibold">{x.nam}</td>
                    <td className="px-3 py-2 text-right">{pt(x.bien)}</td>
                    <td className="px-3 py-2 text-right">{so(x.vongQuay, pt_.nh ? 3 : 2)}</td>
                    <td className="px-3 py-2 text-right">{so(x.donBay, 2)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{pt(x.roe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-chu-phu">
            Vòng quay tài sản và đòn bẩy tính trên tài sản, vốn chủ bình quân đầu và cuối năm.
          </p>
        </Chuong>

        {sau && sau.chatLuong.the.length > 0 && (
          <Chuong so={5} id="chat-luong" ten={sau.loai === "thuong" ? "Chất lượng lợi nhuận và hiệu quả vốn" : sau.loai === "ngan_hang" ? "Chất lượng hoạt động ngân hàng" : sau.loai === "chung_khoan" ? "Chất lượng nguồn thu" : "Hiệu quả hoạt động"} nhanDinh={sau.chatLuong.ghiChu}>
            <LuoiThe ds={sau.chatLuong.the} cot={sau.chatLuong.the.length % 4 === 0 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"} />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {sau.chatLuong.duong.map((d) =>
                d.duong.some((x) => x.diem.length > 4) ? (
                  <div key={d.ten} className="rounded-2xl border border-vien p-4">
                    <p className="mb-2 text-[13px] font-semibold">{d.ten}</p>
                    <BieuDoSo donVi="%" cao={220} duong={d.duong.filter((x) => x.diem.length > 4)} />
                  </div>
                ) : null,
              )}
            </div>
            {sau.fScore && (
              <div className="mt-3 rounded-2xl border border-vien p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">Piotroski F-Score</p>
                  <p className="tabular-nums">
                    <span className={`text-lg font-bold ${sau.fScore.diem >= 6 ? "text-tang" : sau.fScore.diem <= 3 ? "text-giam" : ""}`}>{sau.fScore.diem}</span>
                    <span className="text-chu-phu">/9 điểm</span>
                  </p>
                </div>
                <p className="mt-1 text-[12px] text-chu-phu">Chín phép thử về lợi nhuận, đòn bẩy và hiệu quả, so 4 quý gần nhất với 4 quý liền trước. Từ 7 điểm là nền tảng đang mạnh lên, từ 3 điểm trở xuống là đang yếu đi.</p>
                <ul className="mt-2 grid gap-x-6 md:grid-cols-2 lg:grid-cols-3">
                  {sau.fScore.ds.map((x) => (
                    <DongTieuChi key={x.ten} {...x} />
                  ))}
                </ul>
              </div>
            )}
          </Chuong>
        )}

        <Chuong so={6} id="suc-khoe" ten="Sức khoẻ tài chính" nhanDinh={nhanDinhNo}>
          {sau && sau.sucKhoe.length > 0 && (
            <div className="mb-3">
              <LuoiThe ds={sau.sucKhoe} />
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <KhungCot ten="Nợ phải trả / vốn chủ (lần)">
              <CotNam ds={pt_.noVon} dinhDang={(x) => (x == null ? "—" : so(x, 2))} mau="bg-chu-phu" />
            </KhungCot>
            <KhungCot ten="Nợ phải trả / tổng tài sản">
              <CotNam ds={pt_.noTS} dinhDang={pt} mau="bg-chu-phu" />
            </KhungCot>
          </div>
        </Chuong>

        <Chuong so={7} ten="Dòng tiền" nhanDinh={nhanDinhDongTien}>
          <div className="grid gap-3 md:grid-cols-2">
            <KhungCot ten="Dòng tiền thuần từ kinh doanh (tỷ đồng)">
              <CotNam ds={pt_.dongTien} dinhDang={(x) => (x == null ? "—" : so(x / 1000, 0))} />
            </KhungCot>
            {pt_.coCapex && !pt_.nh ? (
              <KhungCot ten="Dòng tiền tự do: kinh doanh trừ mua tài sản cố định (tỷ đồng)">
                <CotNam ds={pt_.dongTienTuDo} dinhDang={(x) => (x == null ? "—" : so(x / 1000, 0))} />
              </KhungCot>
            ) : (
              <KhungCot ten="Lợi nhuận công ty mẹ (tỷ đồng)">
                <CotNam ds={pt_.ln} dinhDang={(x) => (x == null ? "—" : so(x / 1000, 0))} />
              </KhungCot>
            )}
          </div>
        </Chuong>

        <Chuong so={8} id="tang-truong" ten="Tăng trưởng" nhanDinh={nhanDinhTangTruong}>
          <Luoi>
            <The nhan={`${pt_.tenDoanhThu}, bình quân/năm`} gt={pt(cagrDt?.gt ?? null)} tot={cagrDt ? cagrDt.gt > 0 : null} phu={cagrDt ? `${cagrDt.soNam} năm gần nhất` : undefined} />
            <The nhan="Lợi nhuận, bình quân/năm" gt={pt(cagrLn?.gt ?? null)} tot={cagrLn ? cagrLn.gt > 0 : null} phu={cagrLn ? `${cagrLn.soNam} năm gần nhất` : undefined} />
            <TheNganh nhan="Doanh thu 4 quý so cùng kỳ" c={sv("tangDT")} donVi="pt" />
            <TheNganh nhan="Lợi nhuận 4 quý so cùng kỳ" c={sv("tangLN")} donVi="pt" />
          </Luoi>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <KhungCot ten={`${pt_.tenDoanhThu} (tỷ đồng)`}>
              <CotNam ds={pt_.dt} dinhDang={(x) => (x == null ? "—" : so(x / 1000, 0))} />
            </KhungCot>
            <KhungCot ten="Lợi nhuận công ty mẹ (tỷ đồng)">
              <CotNam ds={pt_.ln} dinhDang={(x) => (x == null ? "—" : so(x / 1000, 0))} />
            </KhungCot>
          </div>
          {sau && (
            <>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <KhungCot ten={`${sau.tenDt} từng quý so với cùng kỳ (%)`}>
                  <CotNam ds={sau.tangQuyDt} dinhDang={(x) => (x == null ? "—" : so(x, 0))} />
                </KhungCot>
                <KhungCot ten="Lợi nhuận công ty mẹ từng quý so với cùng kỳ (%)">
                  <CotNam ds={sau.tangQuyLn} dinhDang={(x) => (x == null ? "—" : so(x, 0))} />
                </KhungCot>
              </div>
              <div className="mt-3">
                <Luoi>
                  <The nhan={`${sau.tenDt}, 3 năm`} gt={pt(sau.cagr.dt3)} tot={sau.cagr.dt3 != null ? sau.cagr.dt3 > 0 : null} phu={`5 năm ${pt(sau.cagr.dt5)}/năm`} />
                  <The nhan="Lợi nhuận, 3 năm" gt={pt(sau.cagr.ln3)} tot={sau.cagr.ln3 != null ? sau.cagr.ln3 > 0 : null} phu={`5 năm ${pt(sau.cagr.ln5)}/năm`} />
                  <The nhan="Tăng trưởng tự tài trợ được" gt={pt(sau.coBan.beVung)} phu="ROE bình quân × phần lợi nhuận giữ lại" />
                  <The nhan="PEG" gt={sau.coBan.peg != null ? so(sau.coBan.peg, 2) : "—"} tot={sau.coBan.peg != null ? sau.coBan.peg < 1 : null} phu="P/E chia tăng trưởng lợi nhuận 3 năm" />
                </Luoi>
              </div>
            </>
          )}
        </Chuong>

        <Chuong so={9} id="co-tuc" ten="Cổ tức" nhanDinh={nhanDinhCoTuc}>
          <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
            <Luoi cot="grid-cols-1 content-start">
              <TheNganh nhan="Tỷ suất cổ tức tiền mặt" c={coTuc} donVi="%" />
              <The nhan="Tỷ lệ chi trả bình quân" gt={tbChiTra != null ? `${so(tbChiTra, 0)}%` : "—"} phu="Cổ tức tiền mặt / lợi nhuận" />
            </Luoi>
            <KhungCot ten="Cổ tức tiền mặt đã trả (tỷ đồng)">
              <CotNam ds={pt_.coTucTra} dinhDang={(x) => (x == null ? "—" : so(x / 1000, 0))} />
            </KhungCot>
          </div>
        </Chuong>

        {sau && (
          <Chuong so={10} id="rui-ro" ten="Rủi ro giá và thanh khoản" nhanDinh="Cổ phiếu dao động mạnh đến đâu, từng sụt sâu bao nhiêu và có dễ mua bán không. Beta ở đây cũng là đầu vào của chi phí vốn trong phần định giá.">
            <LuoiThe ds={sau.ruiRo} cot="grid-cols-2 md:grid-cols-3" />
          </Chuong>
        )}

        <Chuong so={sau ? 11 : 10} id="khuyen-nghi" ten="Khuyến nghị của công ty chứng khoán" nhanDinh={nhanDinhKN}>
          {dt9.ds.length > 0 && (
            <Luoi>
              <The nhan="Giá mục tiêu trung vị" gt={giaNghin(dt9.giaTV!)} tot={conLai != null ? conLai > 0 : null} phu={conLai != null ? `${conLai >= 0 ? "+" : "−"}${so(Math.abs(conLai))}% so với giá hiện tại` : undefined} />
              <The nhan="Cao nhất / thấp nhất" gt={`${giaNghin(dt9.giaCao!)} / ${giaNghin(dt9.giaThap!)}`} />
              <The
                nhan="Khuyến nghị 6 tháng"
                gt={`${dt9.ds.length} CTCK`}
                phu={
                  <span className="flex gap-1">
                    {(["mua", "giu", "ban"] as const).map((n) =>
                      dt9.dem[n] ? (
                        <span key={n} className={`rounded-full px-1.5 ${MAU_NHOM[n]}`}>
                          {TEN_NHOM[n]} {dt9.dem[n]}
                        </span>
                      ) : null,
                    )}
                  </span>
                }
              />
              <The nhan="Độ chính xác với mã này" gt={tk9.daKet ? `${so(tk9.tyLeDat, 0)}%` : "—"} phu={`đạt mục tiêu / ${tk9.daKet} khuyến nghị đã kết thúc`} />
            </Luoi>
          )}
          {baoMa.length > 0 && (
            <>
              <BangBaoCao ds={baoMa.slice(0, 12)} giaNay={new Map(giaHienTai ? [[ma, giaHienTai]] : [])} anMa />
              <Link href={`/khuyen-nghi?ma=${ma}#danh-sach`} className="mt-3 inline-block text-[13px] font-semibold text-nhan hover:underline">
                Xem tất cả {baoMa.length} báo cáo và xếp hạng CTCK →
              </Link>
            </>
          )}
        </Chuong>
      </div>

      <section id="phuong-phap" className="mt-8 scroll-mt-28 rounded-2xl bg-nen-phu p-4">
        <h2 className="font-semibold">Phương pháp và giới hạn</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] text-chu-phu">
          <li>Chi phí vốn chủ tính theo CAPM: lãi suất phi rủi ro + beta × phần bù rủi ro. Việt Nam chưa có đường cong lợi suất trái phiếu chính phủ dễ tra, nên Finlo dùng lãi tiết kiệm 12 tháng làm lãi suất phi rủi ro.</li>
          <li>DCF dùng dòng tiền tự do bình quân 3 năm, dự phóng 10 năm rồi tính giá trị cuối kỳ theo tăng trưởng dài hạn. Ngân hàng, công ty chứng khoán và bảo hiểm không có dòng tiền tự do đúng nghĩa nên dùng mô hình thu nhập thặng dư trên giá trị sổ sách.</li>
          <li>Bội số lịch sử lấy 5 năm gần nhất, cắt 2% mỗi đầu. Vùng giá của mỗi phương pháp là khoảng 25% đến 75% hoặc chiết khấu lệch 1 điểm phần trăm.</li>
          <li>Số trên mỗi cổ phiếu chia cho số cổ phiếu hiện tại và giá đã điều chỉnh, nên các năm có phát hành thêm hoặc chia thưởng lớn có thể lệch.</li>
          <li>Mô hình không biết những gì chưa có trong báo cáo: thay đổi chính sách, dự án mới, chất lượng quản trị, khoản mục ngoại bảng. Tiêu chí đạt hay không đạt chỉ là ngưỡng thống nhất để so sánh, không phải kết luận nên mua hay bán.</li>
        </ul>
      </section>

      <p className="mt-4 text-[11px] text-chu-phu">
        Tính từ báo cáo tài chính hợp nhất đã công bố và giá đóng cửa; chỉ số 4 quý dùng số quý gần nhất, biểu đồ cột dùng
        báo cáo năm. Chỉ để tham khảo, không phải khuyến nghị đầu tư.
      </p>
    </>
  );
}
