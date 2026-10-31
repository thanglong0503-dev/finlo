import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { BieuDoSo } from "@/components/BieuDoSo";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { taoDongLoc } from "@/lib/bo-loc";
import { layBangGia, layBaoCao, layHoSo, layNen, layNganh, layTaiChinhToanThiTruong } from "@/lib/mofi";
import { cagr, phanTichDoanhNghiep, phanVi, soVoiNganh, trungVi, type ChiTieuNganh, type SoNam } from "@/lib/phan-tich";
import { dinhDangCot } from "@/lib/so-sanh";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]/phan-tich">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — Phân tích doanh nghiệp` };
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

function Chuong({ so: thuTu, ten, nhanDinh, children }: { so: number; ten: string; nhanDinh: ReactNode; children: ReactNode }) {
  return (
    <section className="hien-dan mt-8 first:mt-0">
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

const cuoiCo = (ds: SoNam[]) => [...ds].reverse().find((x) => x.gt != null)?.gt ?? null;

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const [bc, hoSo, nen, bangGia, tc, nganh] = await Promise.all([
    layBaoCao(ma),
    layHoSo(ma),
    layNen(ma).catch(() => []),
    layBangGia(),
    layTaiChinhToanThiTruong(),
    layNganh(),
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
          <p className="nhan-muc">Phân tích doanh nghiệp</p>
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

      <div className="mt-6">
        <Chuong so={1} ten="Định giá" nhanDinh={nhanDinhDinhGia}>
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

        <Chuong so={3} ten="Khả năng sinh lời" nhanDinh={nhanDinhSinhLoi}>
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

        <Chuong so={5} ten="Cơ cấu nợ" nhanDinh={nhanDinhNo}>
          <div className="grid gap-3 md:grid-cols-2">
            <KhungCot ten="Nợ phải trả / vốn chủ (lần)">
              <CotNam ds={pt_.noVon} dinhDang={(x) => (x == null ? "—" : so(x, 2))} mau="bg-chu-phu" />
            </KhungCot>
            <KhungCot ten="Nợ phải trả / tổng tài sản">
              <CotNam ds={pt_.noTS} dinhDang={pt} mau="bg-chu-phu" />
            </KhungCot>
          </div>
        </Chuong>

        <Chuong so={6} ten="Dòng tiền" nhanDinh={nhanDinhDongTien}>
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

        <Chuong so={7} ten="Tăng trưởng" nhanDinh={nhanDinhTangTruong}>
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
        </Chuong>

        <Chuong so={8} ten="Cổ tức" nhanDinh={nhanDinhCoTuc}>
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
      </div>

      <p className="mt-8 text-[11px] text-chu-phu">
        Tính từ báo cáo tài chính hợp nhất đã công bố và giá đóng cửa; chỉ số 4 quý dùng số quý gần nhất, biểu đồ cột dùng
        báo cáo năm. Chỉ để tham khảo, không phải khuyến nghị đầu tư.
      </p>
    </>
  );
}
