"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ghiDanhMuc, locHopLe, themMua, useDanhMuc } from "@/lib/danh-muc";
import { giaNghin, mauTangGiam, phanTram, soNguyen, vnd } from "@/lib/dinh-dang";
import { useLamMoi } from "@/lib/lam-moi";
import type { BangGia, CoPhieu } from "@/lib/mofi";

// "20,5" hoặc "20.5" -> 20.5; "1.000" khối lượng -> 1000
type DuLieuNganhMa = { ten: Record<string, string>; maNganh: Record<string, string> };

const docGia = (t: string) => Number(t.trim().replace(",", "."));
const docKl = (t: string) => Number(t.trim().replace(/[.,\s]/g, ""));

// Danh mục cá nhân cần đủ đến từng đồng: lãi lỗ vài trăm nghìn không được làm tròn thành 0
const tien = (x: number) => (x >= 1e9 ? `${(x / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ` : `${vnd(x)} đ`);
const dong = (x: number) => `${x < 0 ? "−" : x > 0 ? "+" : ""}${tien(Math.abs(x))}`;

function TheSo({ nhan, so, phu, mau = "" }: { nhan: string; so: string; phu?: string; mau?: string }) {
  return (
    <div className="rounded-2xl bg-nen-phu p-4">
      <p className="text-chu-phu">{nhan}</p>
      <p className={`mt-1 text-[22px] font-bold tabular-nums ${mau}`}>{so}</p>
      {phu && <p className={`text-[12px] tabular-nums ${mau || "text-chu-phu"}`}>{phu}</p>}
    </div>
  );
}

export function DanhMucClient() {
  const ds = useDanhMuc();
  const [duLieu, setDuLieu] = useState<BangGia | null>(null);
  const [loiGia, setLoiGia] = useState(false);
  const [ma, setMa] = useState("");
  const [kl, setKl] = useState("");
  const [gia, setGia] = useState("");
  const [dangSua, setDangSua] = useState<string | null>(null);
  const [thongBao, setThongBao] = useState("");
  const tep = useRef<HTMLInputElement>(null);
  const [nganhMa, setNganhMa] = useState<DuLieuNganhMa | null>(null);
  const coMa = ds.length > 0;

  // Giá lấy qua /api/bang-gia đã có sẵn và được lưu đệm 60 giây, như trang Bảng giá
  useLamMoi(
    async () => {
      try {
        const res = await fetch("/api/bang-gia");
        if (!res.ok) throw new Error();
        setDuLieu((await res.json()) as BangGia);
        setLoiGia(false);
      } catch {
        setLoiGia(true);
      }
    },
    60_000,
    { taiNgay: true },
  );

  useEffect(() => {
    if (!coMa || nganhMa) return;
    fetch("/api/nganh-ma")
      .then((r) => (r.ok ? r.json() : null))
      .then((x: DuLieuNganhMa | null) => x && setNganhMa(x))
      .catch(() => {});
  }, [coMa, nganhMa]);

  const theoMa = useMemo(() => new Map<string, CoPhieu>((duLieu?.coPhieu ?? []).map((c) => [c.ma, c])), [duLieu]);

  const dongBang = useMemo(
    () =>
      ds.map((d) => {
        const cp = theoMa.get(d.ma);
        const giaHienTai = cp?.gia ?? null;
        const von = d.kl * d.giaVon;
        const giaTri = giaHienTai != null ? d.kl * giaHienTai : null;
        return {
          ...d,
          cp,
          giaHienTai,
          von,
          giaTri,
          lai: giaTri != null ? giaTri - von : null,
          laiPt: giaHienTai != null ? (giaHienTai / d.giaVon - 1) * 100 : null,
          homNay: cp ? d.kl * cp.thayDoi : null,
        };
      }),
    [ds, theoMa],
  );

  const coGia = dongBang.filter((d) => d.giaTri != null);
  const tongVon = coGia.reduce((s, d) => s + d.von, 0);
  const tongGiaTri = coGia.reduce((s, d) => s + (d.giaTri ?? 0), 0);
  const tongLai = tongGiaTri - tongVon;
  const tongHomNay = coGia.reduce((s, d) => s + (d.homNay ?? 0), 0);
  const giaTriHomQua = tongGiaTri - tongHomNay;

  const nganh = useMemo(() => {
    const nhom = new Map<string, number>();
    for (const d of dongBang) {
      if (d.giaTri == null) continue;
      const k = nganhMa?.ten[nganhMa.maNganh[d.ma]] ?? "Khác";
      nhom.set(k, (nhom.get(k) ?? 0) + d.giaTri);
    }
    return [...nhom.entries()].sort((a, b) => b[1] - a[1]);
  }, [dongBang, nganhMa]);

  const datLaiForm = () => {
    setMa("");
    setKl("");
    setGia("");
    setDangSua(null);
  };

  const luu = (e: React.FormEvent) => {
    e.preventDefault();
    const maMoi = ma.trim().toUpperCase();
    const klMoi = docKl(kl);
    const giaMoi = docGia(gia);
    if (duLieu && !theoMa.has(maMoi)) return setThongBao(`Không tìm thấy mã ${maMoi || "này"}.`);
    if (!/^[A-Z0-9]{1,10}$/.test(maMoi)) return setThongBao("Mã chưa đúng.");
    if (!(klMoi > 0)) return setThongBao("Khối lượng phải lớn hơn 0.");
    if (!(giaMoi > 0)) return setThongBao("Giá vốn phải lớn hơn 0, tính theo nghìn đồng, ví dụ 20,5.");
    const muc = { ma: maMoi, kl: klMoi, giaVon: giaMoi * 1000 };
    const daCo = ds.some((d) => d.ma === maMoi);
    const moi = dangSua ? ds.map((d) => (d.ma === dangSua ? muc : d)) : themMua(ds, muc);
    if (!ghiDanhMuc(moi)) return setThongBao("Trình duyệt không cho lưu dữ liệu, có thể bạn đang ở chế độ riêng tư.");
    setThongBao(dangSua ? `Đã sửa ${maMoi}.` : daCo ? `Đã cộng thêm vào ${maMoi}, giá vốn tính bình quân.` : `Đã thêm ${maMoi}.`);
    datLaiForm();
  };

  const sua = (ten: string) => {
    const d = ds.find((x) => x.ma === ten);
    if (!d) return;
    setDangSua(ten);
    setMa(d.ma);
    setKl(String(d.kl));
    setGia(String(Math.round(d.giaVon) / 1000).replace(".", ","));
    setThongBao("");
  };

  const xoa = (ten: string) => {
    ghiDanhMuc(ds.filter((d) => d.ma !== ten));
    if (dangSua === ten) datLaiForm();
    setThongBao(`Đã xoá ${ten}.`);
  };

  const xuat = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(ds, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "finlo-danh-muc.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const nhap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const moi = locHopLe(JSON.parse(await f.text()));
      if (!moi.length) return setThongBao("Tệp không có dòng nào hợp lệ, danh mục giữ nguyên.");
      if (ghiDanhMuc(moi)) setThongBao(`Đã nhập ${moi.length} mã từ tệp, thay cho danh mục cũ.`);
    } catch {
      setThongBao("Không đọc được tệp, danh mục giữ nguyên.");
    }
  };

  const O = "h-10 w-full rounded-full border border-vien bg-nen px-4 outline-none focus:border-nhan";

  return (
    <div className="mt-6 space-y-6">
      {ds.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TheSo nhan="Giá trị hiện tại" so={duLieu ? tien(tongGiaTri) : "—"} phu={`${ds.length} mã`} />
          <TheSo nhan="Tiền vốn" so={duLieu ? tien(tongVon) : "—"} />
          <TheSo nhan="Lãi lỗ" so={duLieu ? dong(tongLai) : "—"} phu={tongVon > 0 ? phanTram((tongLai / tongVon) * 100) : undefined} mau={mauTangGiam(tongLai)} />
          <TheSo nhan="Hôm nay" so={duLieu ? dong(tongHomNay) : "—"} phu={giaTriHomQua > 0 ? phanTram((tongHomNay / giaTriHomQua) * 100) : undefined} mau={mauTangGiam(tongHomNay)} />
        </div>
      )}

      <form onSubmit={luu} className="rounded-2xl bg-nen-phu p-4">
        <p className="font-semibold">{dangSua ? `Sửa ${dangSua}` : "Thêm mã vào danh mục"}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-[12px] text-chu-phu">Mã cổ phiếu</span>
            <input value={ma} onChange={(e) => setMa(e.target.value)} list="ds-ma" placeholder="FPT" autoComplete="off" className={`${O} uppercase`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-chu-phu">Khối lượng (cổ phiếu)</span>
            <input value={kl} onChange={(e) => setKl(e.target.value)} inputMode="numeric" placeholder="1000" className={`${O} tabular-nums`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-chu-phu">Giá vốn (nghìn đồng)</span>
            <input value={gia} onChange={(e) => setGia(e.target.value)} inputMode="decimal" placeholder="50,4" className={`${O} tabular-nums`} />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-10 rounded-full bg-chu px-6 font-semibold text-nen hover:bg-nhan hover:text-white">
              {dangSua ? "Lưu" : "Thêm"}
            </button>
            {dangSua && (
              <button type="button" onClick={datLaiForm} className="h-10 rounded-full bg-nen-noi px-5 font-semibold">
                Huỷ
              </button>
            )}
          </div>
        </div>
        <datalist id="ds-ma">
          {duLieu?.coPhieu.map((c) => (
            <option key={c.ma} value={c.ma}>
              {c.ten}
            </option>
          ))}
        </datalist>
        <p role="status" className="mt-2 min-h-5 text-[12px] text-chu-phu">
          {thongBao}
        </p>
      </form>

      {loiGia && <p className="text-giam">Chưa lấy được giá mới, số đang hiện có thể chưa cập nhật. Trang sẽ tự thử lại.</p>}

      {ds.length === 0 ? (
        <p className="rounded-2xl border border-vien p-6 text-chu-phu">Danh mục đang trống. Nhập mã, khối lượng và giá vốn ở trên để bắt đầu.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-vien">
          <table className="w-full min-w-[820px] text-right">
            <thead className="text-[12px] text-chu-phu">
              <tr className="border-b border-vien">
                <th className="px-4 py-2.5 text-left font-medium">Mã</th>
                <th className="px-3 py-2.5 font-medium">Khối lượng</th>
                <th className="px-3 py-2.5 font-medium">Giá vốn</th>
                <th className="px-3 py-2.5 font-medium">Giá hiện tại</th>
                <th className="px-3 py-2.5 font-medium">Hôm nay</th>
                <th className="px-3 py-2.5 font-medium">Giá trị</th>
                <th className="px-3 py-2.5 font-medium">Lãi lỗ</th>
                <th className="px-4 py-2.5 font-medium"><span className="sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {dongBang.map((d) => (
                <tr key={d.ma} className="border-b border-vien last:border-0">
                  <td className="px-4 py-2.5 text-left">
                    <Link href={`/co-phieu/${d.ma}`} prefetch={false} className="font-semibold text-nhan hover:underline">
                      {d.ma}
                    </Link>
                    <span className="block max-w-52 truncate text-[12px] text-chu-phu">{d.cp?.ten ?? (duLieu ? "Không có giá" : "")}</span>
                  </td>
                  <td className="px-3 py-2.5">{soNguyen(d.kl)}</td>
                  <td className="px-3 py-2.5">{giaNghin(d.giaVon)}</td>
                  <td className="px-3 py-2.5">{d.giaHienTai != null ? giaNghin(d.giaHienTai) : "—"}</td>
                  <td className={`px-3 py-2.5 ${d.cp ? mauTangGiam(d.cp.phanTram) : ""}`}>{d.cp ? phanTram(d.cp.phanTram) : "—"}</td>
                  <td className="px-3 py-2.5">{d.giaTri != null ? tien(d.giaTri) : "—"}</td>
                  <td className={`px-3 py-2.5 ${d.lai != null ? mauTangGiam(d.lai) : ""}`}>
                    {d.lai != null && d.laiPt != null ? (
                      <>
                        {dong(d.lai)}
                        <span className="block text-[12px]">{phanTram(d.laiPt)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <button type="button" onClick={() => sua(d.ma)} aria-label={`Sửa ${d.ma}`} className="text-chu-phu hover:text-nhan">
                      Sửa
                    </button>
                    <button type="button" onClick={() => xoa(d.ma)} aria-label={`Xoá ${d.ma}`} className="ml-3 text-chu-phu hover:text-giam">
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nganh.length > 0 && (
        <section className="rounded-2xl bg-nen-phu p-4">
          <h2 className="font-semibold">Tỷ trọng theo ngành</h2>
          <ul className="mt-3 space-y-2">
            {nganh.map(([ten, giaTri]) => {
              const pt = tongGiaTri > 0 ? (giaTri / tongGiaTri) * 100 : 0;
              return (
                <li key={ten}>
                  <div className="flex justify-between gap-3 text-[13px]">
                    <span className="truncate">{ten}</span>
                    <span className="tabular-nums text-chu-phu">{pt.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-nen-noi">
                    <div className="h-full rounded-full bg-nhan" style={{ width: `${pt}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={xuat} disabled={!ds.length} className="h-9 rounded-full bg-nen-noi px-5 font-semibold disabled:opacity-40">
          Tải tệp sao lưu
        </button>
        <button type="button" onClick={() => tep.current?.click()} className="h-9 rounded-full bg-nen-noi px-5 font-semibold">
          Nhập từ tệp
        </button>
        <input ref={tep} type="file" accept="application/json,.json" onChange={nhap} className="hidden" aria-label="Chọn tệp sao lưu danh mục" />
      </div>

      <p className="text-[12px] text-chu-phu">
        Danh mục chỉ lưu trong trình duyệt trên máy này, Finlo không nhận được dữ liệu của bạn. Xoá dữ liệu trình duyệt hoặc đổi máy sẽ mất danh mục, nên hãy tải tệp sao lưu.
        Lãi lỗ tính theo giá vốn bạn nhập, chưa gồm phí, thuế và cổ tức. Dữ liệu chỉ để tham khảo, không phải khuyến nghị đầu tư.
      </p>
    </div>
  );
}
