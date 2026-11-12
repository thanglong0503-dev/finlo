"use client";

import { useMemo, useState } from "react";
import { giaNghin } from "@/lib/dinh-dang";
import { cacPhuongPhap, chiPhiVonChu, dcf, pbHopLy, tangTruongNgam, thuNhapThangDu, tongHop, wacc, type DauVaoDinhGia, type GiaDinh } from "@/lib/mo-hinh-dinh-gia";

const so = (x: number, le = 1) => x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le });
const dau = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${so(Math.abs(x))}%`;
const ty = (x: number) => `${so(x / 1e9, 0)} tỷ`;

const THANH: { k: keyof GiaDinh; ten: string; moTa: string; min: number; max: number; buoc: number; donVi: string }[] = [
  { k: "g1", ten: "Tăng trưởng 5 năm đầu", moTa: "Sau đó giảm đều về mức dài hạn trong 5 năm kế tiếp", min: -5, max: 25, buoc: 0.5, donVi: "%" },
  { k: "gT", ten: "Tăng trưởng dài hạn", moTa: "Thường lấy quanh lạm phát mục tiêu, không vượt tăng trưởng nền kinh tế", min: 0, max: 6, buoc: 0.5, donVi: "%" },
  { k: "rf", ten: "Lãi suất phi rủi ro", moTa: "Mặc định: lãi tiết kiệm 12 tháng trung vị các ngân hàng", min: 2, max: 10, buoc: 0.1, donVi: "%" },
  { k: "erp", ten: "Phần bù rủi ro cổ phiếu", moTa: "Mức sinh lời đòi thêm so với gửi tiết kiệm; mặc định 8% cho thị trường cận biên", min: 4, max: 12, buoc: 0.5, donVi: "%" },
  { k: "beta", ten: "Beta", moTa: "Độ nhạy với VN-Index, tính từ lợi suất tuần 2 năm", min: 0.4, max: 2, buoc: 0.05, donVi: "" },
];

export function DinhGiaChuyenSau({ dv, macDinh }: { dv: DauVaoDinhGia; macDinh: GiaDinh }) {
  const [gd, setGd] = useState(macDinh);
  const daDoi = THANH.some((t) => gd[t.k] !== macDinh[t.k]);
  const ke = chiPhiVonChu(gd);
  const w = wacc(dv, gd);
  const pp = useMemo(() => cacPhuongPhap(dv, gd), [dv, gd]);
  const th = tongHop(pp);
  const kqDcf = dcf(dv, gd);
  const kqRi = dv.taiChinh ? thuNhapThangDu(dv, gd) : null;
  const ngam = tangTruongNgam(dv, gd);
  const pbLyThuyet = dv.taiChinh ? pbHopLy(dv, gd) : null;
  const chenh = th ? (th.giua / dv.gia - 1) * 100 : null;

  // Thang ngang chung cho mọi phương pháp, cắt ở 3 lần giá để một phương pháp vọt lên không ép dẹt phần còn lại
  const tran = Math.min(dv.gia * 3, Math.max(dv.gia * 1.25, ...pp.map((p) => p.cao))) * 1.05;
  const vt = (x: number) => `${Math.min(100, Math.max(0, (x / tran) * 100))}%`;

  // Độ nhạy: hàng là tỷ lệ chiết khấu, cột là tăng trưởng dài hạn (DCF) hoặc ROE xuất phát (thu nhập thặng dư)
  const buocR = [-2, -1, 0, 1, 2];
  const cotNhay = dv.taiChinh ? [-4, -2, 0, 2, 4] : [-1, -0.5, 0, 0.5, 1];
  const oNhay = (r: number, c: number) =>
    dv.taiChinh ? (thuNhapThangDu({ ...dv, roe: (dv.roe ?? 0) + c }, gd, r)?.gia ?? null) : (dcf(dv, gd, r, c)?.gia ?? null);
  const coNhay = dv.taiChinh ? !!kqRi : !!kqDcf;

  return (
    <div className="space-y-4">
      <div className="grid gap-px overflow-hidden rounded-2xl border border-vien bg-vien md:grid-cols-3">
        <div className="bg-nen p-4">
          <p className="text-[12px] text-chu-phu">Giá trị ước tính tổng hợp</p>
          <p className="mt-1 text-[26px] leading-tight font-bold tabular-nums">{th ? giaNghin(th.giua) : "—"}</p>
          <p className="text-[12px] text-chu-phu tabular-nums">{th ? `Vùng ${giaNghin(th.thap)} đến ${giaNghin(th.cao)}` : "Chưa có phương pháp nào chạy được"}</p>
        </div>
        <div className="bg-nen p-4">
          <p className="text-[12px] text-chu-phu">Giá thị trường</p>
          <p className="mt-1 text-[26px] leading-tight font-bold tabular-nums">{giaNghin(dv.gia)}</p>
          <p className="text-[12px] text-chu-phu">Nghìn đồng mỗi cổ phiếu</p>
        </div>
        <div className="bg-nen p-4">
          <p className="text-[12px] text-chu-phu">Chênh lệch so với giá</p>
          <p className={`mt-1 text-[26px] leading-tight font-bold tabular-nums ${chenh == null ? "" : chenh > 0 ? "text-tang" : "text-giam"}`}>{chenh != null ? dau(chenh) : "—"}</p>
          <p className="text-[12px] text-chu-phu">
            {chenh == null ? "" : th && dv.gia < th.thap ? "Giá đang dưới cả cận thấp của vùng ước tính" : th && dv.gia > th.cao ? "Giá đang trên cả cận cao của vùng ước tính" : "Giá đang nằm trong vùng ước tính"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-vien p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Vùng giá trị theo từng phương pháp</h3>
          <p className="text-[12px] text-chu-phu">Thanh là vùng thấp đến cao, chấm là giá trị giữa, vạch đứng là giá thị trường</p>
        </div>
        <div className="mt-4 space-y-3">
          {pp.map((p) => (
            <div key={p.ma} className="grid gap-x-4 gap-y-1 md:grid-cols-[16rem_1fr_9rem] md:items-center">
              <div>
                <p className="text-[13px] font-medium">{p.ten}</p>
                <p className="text-[11px] text-chu-phu">{p.trongSo > 0 && th ? `Trọng số ${so((p.trongSo / th.tong) * 100, 0)}%` : "Chỉ tham khảo"}</p>
              </div>
              <div className="relative h-6" role="img" aria-label={`${p.ten}: ${giaNghin(p.thap)} đến ${giaNghin(p.cao)}, giữa ${giaNghin(p.giua)}`}>
                <div className="absolute inset-x-0 top-1/2 h-px bg-vien" />
                <div className={`absolute top-1.5 h-3 rounded-full ${p.trongSo > 0 ? "bg-nhan/45" : "bg-chu-phu/30"}`} style={{ left: vt(p.thap), width: `calc(${vt(p.cao)} - ${vt(p.thap)})`, minWidth: 4 }} />
                <div className={`absolute top-1 h-4 w-1 rounded-full ${p.trongSo > 0 ? "bg-nhan" : "bg-chu-phu"}`} style={{ left: vt(p.giua) }} />
                <div className="absolute inset-y-0 w-0.5 bg-chu" style={{ left: vt(dv.gia) }} />
              </div>
              <p className="text-[12px] tabular-nums md:text-right">
                <span className="font-semibold">{giaNghin(p.giua)}</span> <span className="text-chu-phu">({giaNghin(p.thap)}–{giaNghin(p.cao)})</span>
              </p>
              <p className="text-[11px] text-chu-phu md:col-span-3">{p.ghiChu}</p>
            </div>
          ))}
          {pp.length === 0 && <p className="text-chu-phu">Chưa đủ số liệu để chạy phương pháp nào.</p>}
        </div>
        {!dv.taiChinh && !kqDcf && (
          <p className="mt-3 text-[12px] text-chu-phu">
            Không chạy DCF: dòng tiền tự do bình quân 3 năm đang âm{dv.fcff != null ? ` (${ty(dv.fcff)}/năm)` : ""}, thường do công ty đang đầu tư lớn. Chiết khấu một dòng tiền âm sẽ cho kết quả vô nghĩa.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-nen-phu p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Tự chỉnh giả định</h3>
          <button type="button" onClick={() => setGd(macDinh)} disabled={!daDoi} className="h-8 rounded-full bg-nen-noi px-4 text-[13px] font-semibold disabled:opacity-40">
            Về mặc định
          </button>
        </div>
        <div className="mt-3 grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
          {THANH.map((t) => (
            <label key={t.k} className="block">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium">{t.k === "g1" && dv.taiChinh ? "Tăng trưởng cổ tức 5 năm đầu" : t.ten}</span>
                <span className="font-semibold tabular-nums">
                  {so(gd[t.k], t.k === "beta" ? 2 : 1)}
                  {t.donVi}
                </span>
              </span>
              <input type="range" min={t.min} max={t.max} step={t.buoc} value={gd[t.k]} onChange={(e) => setGd((g) => ({ ...g, [t.k]: Number(e.target.value) }))} className="mt-1 w-full accent-[var(--nhan)]" />
              <span className="block text-[11px] text-chu-phu">{t.k === "g1" && dv.taiChinh ? "Chỉ dùng cho mô hình cổ tức, và không vượt mức công ty tự tài trợ được (ROE × phần lợi nhuận giữ lại)" : t.moTa}</span>
            </label>
          ))}
          <div className="rounded-xl bg-nen p-3 text-[13px] tabular-nums">
            <p className="flex justify-between gap-2">
              <span className="text-chu-phu">Chi phí vốn chủ</span>
              <span className="font-semibold">{so(ke)}%</span>
            </p>
            <p className="mt-0.5 text-[11px] text-chu-phu">
              {so(gd.rf)}% + {so(gd.beta, 2)} × {so(gd.erp)}%
            </p>
            {!dv.taiChinh && (
              <>
                <p className="mt-2 flex justify-between gap-2">
                  <span className="text-chu-phu">WACC</span>
                  <span className="font-semibold">{so(w)}%</span>
                </p>
                <p className="mt-0.5 text-[11px] text-chu-phu">
                  Nợ vay chiếm {so(dv.tyTrongNo * 100, 0)}% vốn, lãi vay {so(dv.chiPhiNo)}%, thuế {so(dv.thue * 100, 0)}%
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {kqDcf && (
          <div className="rounded-2xl border border-vien p-4">
            <h3 className="font-semibold">Chiết khấu dòng tiền, từng bước</h3>
            <dl className="mt-3 space-y-1.5 text-[13px] tabular-nums">
              {[
                ["Dòng tiền tự do xuất phát (bình quân 3 năm)", ty(dv.fcff!)],
                ["Giá trị hiện tại 10 năm dự phóng", ty(kqDcf.pvGiaiDoan)],
                [`Giá trị hiện tại sau năm 10 (${so((kqDcf.pvCuoi / kqDcf.ev) * 100, 0)}% tổng)`, ty(kqDcf.pvCuoi)],
                ["Giá trị doanh nghiệp", ty(kqDcf.ev)],
                [dv.noRong >= 0 ? "Trừ nợ ròng" : "Cộng tiền ròng", ty(Math.abs(dv.noRong))],
                ["Trừ lợi ích cổ đông thiểu số", ty(dv.loiIchThieuSo)],
                ["Giá trị mỗi cổ phiếu", `${giaNghin(kqDcf.gia)} nghìn đồng`],
              ].map(([a, b], i, ds) => (
                <div key={a} className={`flex justify-between gap-3 ${i === ds.length - 1 ? "border-t border-vien pt-1.5 font-semibold" : ""}`}>
                  <dt className={i === ds.length - 1 ? "" : "text-chu-phu"}>{a}</dt>
                  <dd>{b}</dd>
                </div>
              ))}
            </dl>
            {ngam && (
              <p className="mt-3 text-[13px]">
                <span className="font-semibold">Thị trường đang ngầm kỳ vọng gì:</span>{" "}
                {ngam.ngoai === "thap"
                  ? "ngay cả khi dòng tiền giảm 30% mỗi năm, mô hình vẫn cho giá trị cao hơn giá hiện tại."
                  : ngam.ngoai === "cao"
                    ? "phải tăng trưởng trên 60% mỗi năm mới ra được giá hiện tại."
                    : `để ra đúng giá ${giaNghin(dv.gia)}, dòng tiền chỉ cần tăng ${so(ngam.g)}% mỗi năm trong 5 năm đầu, so với giả định ${so(gd.g1)}% bạn đang đặt.`}
              </p>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] text-chu-phu hover:text-chu">Xem dòng tiền từng năm</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[320px] text-right text-[12px] tabular-nums">
                  <thead className="text-chu-phu">
                    <tr>
                      <th className="py-1 text-left font-medium">Năm</th>
                      <th className="py-1 font-medium">Tăng trưởng</th>
                      <th className="py-1 font-medium">Dòng tiền</th>
                      <th className="py-1 font-medium">Giá trị hiện tại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kqDcf.dong.map((d) => (
                      <tr key={d.nam} className="border-t border-vien">
                        <td className="py-1 text-left">{d.nam}</td>
                        <td className="py-1">{so(d.g)}%</td>
                        <td className="py-1">{ty(d.fcf)}</td>
                        <td className="py-1">{ty(d.pv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}

        {kqRi && (
          <div className="rounded-2xl border border-vien p-4">
            <h3 className="font-semibold">Thu nhập thặng dư, từng bước</h3>
            <dl className="mt-3 space-y-1.5 text-[13px] tabular-nums">
              {[
                ["Giá trị sổ sách mỗi cổ phiếu", giaNghin(dv.bvps!)],
                [`Giá trị hiện tại phần lãi ${kqRi.pvThangDu >= 0 ? "vượt" : "hụt so với"} chi phí vốn (10 năm)`, `${kqRi.pvThangDu < 0 ? "−" : ""}${giaNghin(Math.abs(kqRi.pvThangDu))}`],
                ["Giá trị mỗi cổ phiếu", `${giaNghin(kqRi.gia)} nghìn đồng`],
              ].map(([a, b], i, ds) => (
                <div key={a} className={`flex justify-between gap-3 ${i === ds.length - 1 ? "border-t border-vien pt-1.5 font-semibold" : ""}`}>
                  <dt className={i === ds.length - 1 ? "" : "text-chu-phu"}>{a}</dt>
                  <dd>{b}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[13px]">
              ROE xuất phát {so(kqRi.roeDau)}% (bình quân 5 năm) {kqRi.roeDau > kqRi.ke ? "cao hơn" : "thấp hơn"} chi phí vốn chủ {so(kqRi.ke)}%, nên mô hình cho giá trị {kqRi.gia > dv.bvps! ? "cao hơn" : "thấp hơn"} sổ sách.
              {pbLyThuyet != null && ` P/B hợp lý theo lý thuyết (ROE − g) / (Ke − g) là ${so(pbLyThuyet, 2)} lần${dv.boi.pb?.nay != null ? `, thị trường đang trả ${so(dv.boi.pb.nay, 2)} lần` : ""}.`}
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] text-chu-phu hover:text-chu">Xem từng năm</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[320px] text-right text-[12px] tabular-nums">
                  <thead className="text-chu-phu">
                    <tr>
                      <th className="py-1 text-left font-medium">Năm</th>
                      <th className="py-1 font-medium">ROE</th>
                      <th className="py-1 font-medium">Sổ sách đầu năm</th>
                      <th className="py-1 font-medium">Lãi thặng dư</th>
                      <th className="py-1 font-medium">Giá trị hiện tại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kqRi.dong.map((d) => (
                      <tr key={d.nam} className="border-t border-vien">
                        <td className="py-1 text-left">{d.nam}</td>
                        <td className="py-1">{so(d.roe)}%</td>
                        <td className="py-1">{giaNghin(d.bv)}</td>
                        <td className="py-1">{so(d.ri / 1000, 2)}</td>
                        <td className="py-1">{so(d.pv / 1000, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}

        {coNhay && (
          <div className="rounded-2xl border border-vien p-4">
            <h3 className="font-semibold">Độ nhạy của {dv.taiChinh ? "thu nhập thặng dư" : "DCF"}</h3>
            <p className="mt-1 text-[12px] text-chu-phu">
              Hàng: {dv.taiChinh ? "chi phí vốn chủ" : "WACC"}. Cột: {dv.taiChinh ? "ROE xuất phát" : "tăng trưởng dài hạn"}. Ô xanh là cao hơn giá thị trường, ô đỏ là thấp hơn.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[340px] border-separate border-spacing-0.5 text-center text-[12px] tabular-nums">
                <thead>
                  <tr className="text-chu-phu">
                    <th className="p-1 font-medium" />
                    {cotNhay.map((c) => (
                      <th key={c} className="p-1 font-medium">
                        {so((dv.taiChinh ? (dv.roe ?? 0) : gd.gT) + c)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buocR.map((r) => (
                    <tr key={r}>
                      <th scope="row" className="p-1 text-right font-medium text-chu-phu">
                        {so((dv.taiChinh ? ke : w) + r)}%
                      </th>
                      {cotNhay.map((c) => {
                        const x = oNhay(r, c);
                        const giua = r === 0 && c === 0;
                        return (
                          <td
                            key={c}
                            className={`rounded-md p-1.5 ${giua ? "font-bold outline outline-1 outline-chu" : ""}`}
                            style={x == null ? undefined : { background: `color-mix(in srgb, var(${x >= dv.gia ? "--tang" : "--giam"}) 22%, var(--nen))` }}
                          >
                            {x == null ? "—" : giaNghin(x)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-chu-phu">
        Giá trị ước tính là kết quả của mô hình trên số liệu quá khứ và các giả định ở trên, không phải dự báo giá và không phải khuyến nghị mua bán. Đổi một giả định nhỏ có thể làm kết quả đổi nhiều, hãy xem bảng độ nhạy.
      </p>
    </div>
  );
}
