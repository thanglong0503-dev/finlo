import type { Metadata } from "next";
import { Suspense } from "react";
import { BangMo, LuoiMo } from "@/components/KhungCho";
import { soNguyen, tyDong, vonHoa } from "@/lib/dinh-dang";
import { layBangGia, layHoSo, layHoSoDoanhNghiep, layNganh } from "@/lib/mofi";

export async function generateMetadata({ params }: PageProps<"/co-phieu/[ma]/ho-so">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `${ma.toUpperCase()} — Hồ sơ doanh nghiệp` };
}

export default function TrangHoSo({ params }: PageProps<"/co-phieu/[ma]/ho-so">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-10">
      <Suspense
        fallback={
          <>
            <LuoiMo so={8} cot="md:grid-cols-4" />
            <BangMo dong={8} />
          </>
        }
      >
        <NoiDung params={params} />
      </Suspense>
    </div>
  );
}

// Số liệu hồ sơ tính theo đồng, hiển thị theo tỷ đồng
const ty = (dong: number) => Math.round(dong / 1e9).toLocaleString("vi-VN");
const pt = (x: number) =>
  `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;

function TieuDe({ nhan, ten, phu }: { nhan: string; ten: string; phu?: string }) {
  return (
    <div className="mt-10 flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="nhan-muc">{nhan}</p>
        <h2 className="mt-2 text-xl font-bold tracking-[-0.03em]">{ten}</h2>
      </div>
      {phu && <p className="text-[12px] text-chu-phu">{phu}</p>}
    </div>
  );
}

async function NoiDung({ params }: { params: Promise<{ ma: string }> }) {
  const ma = (await params).ma.toUpperCase();
  const [bangGia, coBan, hs, nganh] = await Promise.all([
    layBangGia(),
    layHoSo(ma),
    layHoSoDoanhNghiep(ma),
    layNganh().catch(() => null),
  ]);
  const cp = bangGia.coPhieu.find((c) => c.ma === ma);
  const khoaNganh = nganh?.maNganh[ma];

  const thongTin = [
    { nhan: "Tên doanh nghiệp", gt: cp?.ten },
    { nhan: "Sàn niêm yết", gt: cp?.san },
    { nhan: "Ngành", gt: khoaNganh ? nganh?.ten[khoaNganh] : (cp?.nganh ?? undefined) },
    { nhan: "Vốn điều lệ", gt: coBan?.vonDieuLe ? tyDong(coBan.vonDieuLe) : undefined },
    { nhan: "Cổ phiếu lưu hành", gt: coBan?.soCoPhieu ? soNguyen(coBan.soCoPhieu) : undefined },
    { nhan: "Vốn hoá", gt: cp?.vonHoa ? vonHoa(cp.vonHoa) : undefined },
    {
      nhan: "Ngày giao dịch đầu tiên",
      gt: coBan?.ngayGiaoDichDau ? new Date(coBan.ngayGiaoDichDau).toLocaleDateString("vi-VN") : undefined,
    },
    { nhan: "Người đại diện", gt: coBan?.lanhDao ?? undefined },
  ].filter((x): x is { nhan: string; gt: string } => !!x.gt);

  // Kết quả kinh doanh theo năm: chỉ tiêu đầu là doanh thu (ngân hàng: tổng thu nhập hoạt động)
  const kd = (hs?.kinhDoanh ?? []).filter((x) => x.chiTieu.length > 0);
  const laySo = (i: number, khoa: string) => kd[i]?.chiTieu.find((c) => c.khoa === khoa)?.gt ?? null;
  const khoaDt = kd[kd.length - 1]?.chiTieu[0]?.khoa;
  const tenDt = kd[kd.length - 1]?.chiTieu[0]?.nhan ?? "Doanh thu";
  const batDau10 = Math.max(0, kd.length - 10);
  const muoiNam = kd.slice(batDau10).map((x, j) => ({
    nam: x.nam,
    dt: khoaDt ? laySo(batDau10 + j, khoaDt) : null,
    ln: laySo(batDau10 + j, "sauThue"),
  }));
  const dinhCot = Math.max(1, ...muoiNam.flatMap((x) => [x.dt ?? 0, Math.abs(x.ln ?? 0)]));

  const batDau8 = Math.max(0, kd.length - 8);
  const tamNam = kd.slice(batDau8);
  const dongBang = (tamNam[tamNam.length - 1]?.chiTieu ?? []).map((c) => ({ khoa: c.khoa, nhan: c.nhan }));

  const coCau = hs?.coCauDoanhThu[hs.coCauDoanhThu.length - 1];
  const tongCoCau = coCau ? coCau.phan.reduce((s, p) => s + Math.max(0, p.gt), 0) : 0;

  const namVon = new Map((hs?.vonDieuLe ?? []).map((x) => [x.nam, x.gt]));
  const namCoTuc = new Map((hs?.coTuc ?? []).map((x) => [x.nam, x.gt]));
  const dsNam = [...new Set([...namVon.keys(), ...namCoTuc.keys()])].sort((a, b) => b - a).slice(0, 10);
  const dinhVon = Math.max(1, ...dsNam.map((n) => namVon.get(n) ?? 0));
  const dinhCoTuc = Math.max(1, ...dsNam.map((n) => namCoTuc.get(n) ?? 0));

  if (!hs && !coBan) return <p className="text-chu-phu">Chưa có hồ sơ của {ma}.</p>;

  return (
    <>
      <p className="nhan-muc">Thông tin cơ bản</p>
      <dl className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-vien bg-vien sm:grid-cols-2 lg:grid-cols-4">
        {thongTin.map((x) => (
          <div key={x.nhan} className="bg-nen p-4">
            <dt className="text-chu-phu">{x.nhan}</dt>
            <dd className="mt-1 font-semibold tabular-nums">{x.gt}</dd>
          </div>
        ))}
      </dl>
      {(coBan?.diaChi || coBan?.website) && (
        <p className="mt-3 text-chu-phu">
          {coBan.diaChi}
          {coBan.website && (
            <>
              {coBan.diaChi ? " · " : ""}
              <a
                href={coBan.website.startsWith("http") ? coBan.website : `https://${coBan.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-nhan hover:underline"
              >
                {coBan.website}
              </a>
            </>
          )}
        </p>
      )}

      {muoiNam.length > 0 && (
        <>
          <TieuDe nhan="Kết quả kinh doanh" ten={`${tenDt} và lợi nhuận sau thuế`} phu="Tỷ đồng, báo cáo năm" />
          <div className="mt-4 border border-vien p-4 rounded-2xl overflow-hidden">
            <div className="flex gap-4 text-[12px] text-chu-phu">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-chu-phu/40" /> {tenDt}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-nhan" /> Lợi nhuận sau thuế
              </span>
            </div>
            <div className="mt-4 flex h-56 items-end gap-2 sm:gap-4">
              {muoiNam.map((x) => (
                <div key={x.nam} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div className="flex flex-1 items-end justify-center gap-0.5">
                    <div
                      className="w-1/2 max-w-7 bg-chu-phu/40"
                      style={{ height: `${((x.dt ?? 0) / dinhCot) * 100}%` }}
                      title={`${tenDt} ${x.nam}: ${x.dt != null ? ty(x.dt) : "—"} tỷ`}
                    />
                    <div
                      className={`w-1/2 max-w-7 ${(x.ln ?? 0) < 0 ? "bg-giam" : "bg-nhan"}`}
                      style={{ height: `${(Math.abs(x.ln ?? 0) / dinhCot) * 100}%` }}
                      title={`LNST ${x.nam}: ${x.ln != null ? ty(x.ln) : "—"} tỷ`}
                    />
                  </div>
                  <p className="mt-1.5 text-center text-[11px] text-chu-phu tabular-nums">{x.nam}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto border border-vien rounded-2xl">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-vien text-[12px] text-chu-phu">
                  <th className="sticky left-0 bg-nen px-3 py-2 text-left font-medium">Chỉ tiêu</th>
                  {tamNam.map((x) => (
                    <th key={x.nam} className="px-3 py-2 text-right font-medium tabular-nums">
                      {x.nam}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dongBang.map((d) => {
                  const dam = d.khoa === "sauThue" ? "font-semibold" : "";
                  return (
                    <tr key={d.khoa} className="border-b border-vien">
                      <td className={`sticky left-0 bg-nen px-3 py-2 ${dam}`}>{d.nhan}</td>
                      {tamNam.map((x) => {
                        const v = x.chiTieu.find((c) => c.khoa === d.khoa)?.gt;
                        return (
                          <td
                            key={x.nam}
                            className={`px-3 py-2 text-right tabular-nums ${dam} ${v != null && v < 0 ? "text-giam" : ""}`}
                          >
                            {v != null ? ty(v) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-b border-vien bg-nen-phu">
                  <td className="sticky left-0 bg-nen-phu px-3 py-2 text-chu-phu">Tăng trưởng LNST</td>
                  {tamNam.map((x, j) => {
                    const nay = laySo(batDau8 + j, "sauThue");
                    const truoc = laySo(batDau8 + j - 1, "sauThue");
                    const g = nay != null && truoc != null && truoc > 0 ? (nay / truoc - 1) * 100 : null;
                    return (
                      <td
                        key={x.nam}
                        className={`px-3 py-2 text-right tabular-nums ${g == null ? "" : g >= 0 ? "text-tang" : "text-giam"}`}
                      >
                        {g != null ? pt(g) : "—"}
                      </td>
                    );
                  })}
                </tr>
                <tr className="bg-nen-phu">
                  <td className="sticky left-0 bg-nen-phu px-3 py-2 text-chu-phu">Biên LN ròng</td>
                  {tamNam.map((x, j) => {
                    const ln = laySo(batDau8 + j, "sauThue");
                    const dt = khoaDt ? laySo(batDau8 + j, khoaDt) : null;
                    return (
                      <td key={x.nam} className="px-3 py-2 text-right tabular-nums">
                        {ln != null && dt ? `${((ln / dt) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="grid gap-x-6 lg:grid-cols-2">
        {coCau && tongCoCau > 0 && (
          <section>
            <TieuDe nhan="Cơ cấu" ten={`Nguồn thu năm ${coCau.nam}`} phu="Tỷ đồng" />
            <ul className="mt-4 border border-vien rounded-2xl overflow-hidden">
              {[...coCau.phan]
                .sort((a, b) => b.gt - a.gt)
                .map((p) => {
                  const tyLe = (Math.max(0, p.gt) / tongCoCau) * 100;
                  return (
                    <li key={p.nhan} className="border-b border-vien px-4 py-2.5 last:border-b-0">
                      <p className="flex justify-between gap-3">
                        <span>{p.nhan}</span>
                        <span className="shrink-0 tabular-nums">
                          {ty(p.gt)}
                          <span className="ml-1 inline-block w-14 text-right text-chu-phu">
                            {tyLe.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
                          </span>
                        </span>
                      </p>
                      <div className="mt-1.5 h-1 bg-nen-phu">
                        <div className="h-full bg-nhan" style={{ width: `${tyLe}%` }} />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        {dsNam.length > 0 && (
          <section>
            <TieuDe nhan="Vốn và cổ tức" ten="Vốn điều lệ, cổ tức tiền mặt đã trả" phu="Tỷ đồng" />
            <table className="mt-4 w-full border border-vien rounded-2xl overflow-hidden">
              <thead>
                <tr className="border-b border-vien text-[12px] text-chu-phu">
                  <th className="px-4 py-2 text-left font-medium">Năm</th>
                  <th className="px-4 py-2 text-right font-medium">Vốn điều lệ</th>
                  <th className="px-4 py-2 text-right font-medium">Cổ tức tiền mặt</th>
                </tr>
              </thead>
              <tbody>
                {dsNam.map((n) => {
                  const v = namVon.get(n);
                  const c = namCoTuc.get(n);
                  return (
                    <tr key={n} className="border-b border-vien last:border-b-0">
                      <td className="px-4 py-2 tabular-nums">{n}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1 w-16 bg-nen-phu sm:block">
                            <div className="ml-auto h-full bg-chu-phu/50" style={{ width: `${((v ?? 0) / dinhVon) * 100}%` }} />
                          </div>
                          <span className="w-16 text-right tabular-nums">{v != null ? ty(v) : "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1 w-16 bg-nen-phu sm:block">
                            <div className="ml-auto h-full bg-nhan" style={{ width: `${((c ?? 0) / dinhCoTuc) * 100}%` }} />
                          </div>
                          <span className="w-16 text-right tabular-nums">{c ? ty(c) : "—"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {hs?.nguon && <p className="mt-6 text-[11px] text-chu-phu">{hs.nguon}</p>}
    </>
  );
}
