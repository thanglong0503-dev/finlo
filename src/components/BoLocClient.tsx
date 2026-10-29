"use client";

import Link from "next/link";
import { useLamMoi } from "@/lib/lam-moi";
import { useMemo, useState } from "react";
import { NhanPhien } from "@/components/NhanPhien";
import { NutTheoDoi } from "@/components/NutTheoDoi";
import type { DongLoc } from "@/lib/bo-loc";
import { giaNghin, mauTangGiam, phanTram, tyDong, vonHoa } from "@/lib/dinh-dang";
import type { Phien } from "@/lib/mofi";

// Điều kiện lọc: ô trống = không lọc. Vốn hoá, giá trị GD theo tỷ đồng; tỷ lệ theo %
type DieuKien = {
  san: string;
  nganh: string;
  vonHoaMin: string;
  giaTriMin: string;
  peMax: string;
  pbMax: string;
  roeMin: string;
  tangLNMin: string;
  coTucMin: string;
  noVonMax: string;
  nnMua: boolean;
};

const TRONG: DieuKien = {
  san: "",
  nganh: "",
  vonHoaMin: "",
  giaTriMin: "",
  peMax: "",
  pbMax: "",
  roeMin: "",
  tangLNMin: "",
  coTucMin: "",
  noVonMax: "",
  nnMua: false,
};

// Bộ lọc mẫu theo các trường phái đầu tư phổ biến
const MAU: { ten: string; moTa: string; dk: Partial<DieuKien> }[] = [
  { ten: "Tất cả", moTa: "Bỏ mọi điều kiện", dk: {} },
  {
    ten: "Giá trị",
    moTa: "P/E dưới 10, P/B dưới 1,5, ROE từ 12%, thanh khoản từ 5 tỷ/phiên",
    dk: { peMax: "10", pbMax: "1.5", roeMin: "12", giaTriMin: "5" },
  },
  {
    ten: "Tăng trưởng",
    moTa: "Lợi nhuận 4 quý tăng từ 20%, ROE từ 15%, thanh khoản từ 5 tỷ/phiên",
    dk: { tangLNMin: "20", roeMin: "15", giaTriMin: "5" },
  },
  {
    ten: "Cổ tức cao",
    moTa: "Tỷ suất cổ tức tiền mặt từ 6%, vốn hoá từ 1.000 tỷ",
    dk: { coTucMin: "6", vonHoaMin: "1000" },
  },
  {
    ten: "Vốn hoá lớn",
    moTa: "Vốn hoá từ 20.000 tỷ, thanh khoản từ 20 tỷ/phiên",
    dk: { vonHoaMin: "20000", giaTriMin: "20" },
  },
  {
    ten: "Khối ngoại mua",
    moTa: "Nước ngoài mua ròng trong phiên, thanh khoản từ 5 tỷ/phiên",
    dk: { nnMua: true, giaTriMin: "5" },
  },
];

type Cot = { khoa: keyof DongLoc; nhan: string; an?: string; dinhDang: (d: DongLoc) => string; mau?: (d: DongLoc) => string };

const so = (x: number | null, le = 1, hau = "") =>
  x == null ? "—" : `${x.toLocaleString("vi-VN", { maximumFractionDigits: le, minimumFractionDigits: le })}${hau}`;
const mauSo = (x: number | null) => (x == null ? "text-chu-phu" : x > 0 ? "text-tang" : x < 0 ? "text-giam" : "");

const COT: Cot[] = [
  { khoa: "gia", nhan: "Giá", dinhDang: (d) => giaNghin(d.gia), mau: (d) => mauTangGiam(d.phanTram) },
  { khoa: "phanTram", nhan: "%", dinhDang: (d) => phanTram(d.phanTram), mau: (d) => mauTangGiam(d.phanTram) },
  { khoa: "vonHoa", nhan: "Vốn hoá", an: "hidden sm:table-cell", dinhDang: (d) => vonHoa(d.vonHoa) },
  { khoa: "pe", nhan: "P/E", dinhDang: (d) => so(d.pe) },
  { khoa: "pb", nhan: "P/B", an: "hidden sm:table-cell", dinhDang: (d) => so(d.pb, 2) },
  { khoa: "roe", nhan: "ROE", dinhDang: (d) => so(d.roe, 1, "%") },
  { khoa: "tangLN", nhan: "LN tăng", an: "hidden md:table-cell", dinhDang: (d) => so(d.tangLN, 0, "%"), mau: (d) => mauSo(d.tangLN) },
  { khoa: "bienRong", nhan: "Biên ròng", an: "hidden lg:table-cell", dinhDang: (d) => so(d.bienRong, 1, "%") },
  { khoa: "noVon", nhan: "Nợ/VCSH", an: "hidden lg:table-cell", dinhDang: (d) => so(d.noVon, 2) },
  { khoa: "coTuc", nhan: "Cổ tức", an: "hidden md:table-cell", dinhDang: (d) => so(d.coTuc, 1, "%") },
  { khoa: "giaTri", nhan: "GTGD", an: "hidden lg:table-cell", dinhDang: (d) => tyDong(d.giaTri) },
];

const MOI_TRANG = 50;
const KIEU_O = "h-9 w-full rounded-full border border-vien bg-nen px-3 outline-none focus:border-nhan";

// Ô nhập số của điều kiện lọc (khai báo ngoài component chính để không bị dựng lại khi gõ)
function OSo({ nhan, goiY, giaTri, khiDoi }: { nhan: string; goiY: string; giaTri: string; khiDoi: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-chu-phu">{nhan}</span>
      <input inputMode="decimal" value={giaTri} onChange={(e) => khiDoi(e.target.value)} placeholder={goiY} className={KIEU_O} />
    </label>
  );
}

export function BoLocClient({
  dongDau,
  phienDau,
  dsNganh,
}: {
  dongDau: DongLoc[];
  phienDau: Phien | null;
  dsNganh: { khoa: string; ten: string }[];
}) {
  const [dong, setDong] = useState(dongDau);
  const [phien, setPhien] = useState(phienDau);
  const [dk, setDk] = useState<DieuKien>({ ...TRONG, ...MAU[1].dk });
  const [mauDangChon, setMauDangChon] = useState("Giá trị");
  const [sapXep, setSapXep] = useState<{ cot: keyof DongLoc; giam: boolean }>({ cot: "vonHoa", giam: true });
  const [soDong, setSoDong] = useState(MOI_TRANG);

  // Giá trong phiên đổi mỗi phút: làm mới để P/E, P/B, cổ tức theo giá hiện tại
  useLamMoi(async () => {
    try {
      const r = await fetch("/api/bo-loc");
      if (!r.ok) return;
      const j = (await r.json()) as { phien: Phien | null; dong: DongLoc[] };
      setDong(j.dong);
      setPhien(j.phien);
    } catch {
      // giữ dữ liệu cũ
    }
  }, 60_000);

  const doi = (khoa: keyof DieuKien, gt: string | boolean) => {
    setDk((x) => ({ ...x, [khoa]: gt }));
    setMauDangChon("");
    setSoDong(MOI_TRANG);
  };

  const ketQua = useMemo(() => {
    const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
    const vhMin = n(dk.vonHoaMin);
    const gtMin = n(dk.giaTriMin);
    const peMax = n(dk.peMax);
    const pbMax = n(dk.pbMax);
    const roeMin = n(dk.roeMin);
    const lnMin = n(dk.tangLNMin);
    const ctMin = n(dk.coTucMin);
    const nvMax = n(dk.noVonMax);
    const loc = dong.filter(
      (d) =>
        (!dk.san || d.san === dk.san) &&
        (!dk.nganh || d.nganh === dk.nganh) &&
        (vhMin == null || (d.vonHoa ?? 0) >= vhMin * 1e9) &&
        (gtMin == null || d.giaTri >= gtMin * 1e9) &&
        (peMax == null || (d.pe != null && d.pe <= peMax)) &&
        (pbMax == null || (d.pb != null && d.pb <= pbMax)) &&
        (roeMin == null || (d.roe != null && d.roe >= roeMin)) &&
        (lnMin == null || (d.tangLN != null && d.tangLN >= lnMin)) &&
        (ctMin == null || (d.coTuc != null && d.coTuc >= ctMin)) &&
        (nvMax == null || (d.noVon != null && d.noVon <= nvMax)) &&
        (!dk.nnMua || (d.nnRong ?? 0) > 0),
    );
    const huong = sapXep.giam ? -1 : 1;
    return loc.sort((a, b) => {
      const x = a[sapXep.cot] as number | null;
      const y = b[sapXep.cot] as number | null;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x - y) * huong;
    });
  }, [dong, dk, sapXep]);

  const o = KIEU_O;
  const oSo = (khoa: keyof DieuKien, nhan: string, goiY: string) => (
    <OSo nhan={nhan} goiY={goiY} giaTri={dk[khoa] as string} khiDoi={(v) => doi(khoa, v)} />
  );

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        {MAU.map((m) => (
          <button
            key={m.ten}
            title={m.moTa}
            onClick={() => {
              setDk({ ...TRONG, ...m.dk });
              setMauDangChon(m.ten);
              setSoDong(MOI_TRANG);
            }}
            className={`h-9 rounded-full border px-4 font-semibold ${
              mauDangChon === m.ten ? "border-nhan bg-nhan text-white" : "border-vien hover:border-nhan hover:text-nhan"
            }`}
          >
            {m.ten}
          </button>
        ))}
      </div>
      {mauDangChon && <p className="mt-2 text-chu-phu">{MAU.find((m) => m.ten === mauDangChon)?.moTa}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 border border-vien p-4 sm:grid-cols-3 lg:grid-cols-6 rounded-2xl overflow-hidden">
        <label className="block">
          <span className="text-[11px] text-chu-phu">Sàn</span>
          <select value={dk.san} onChange={(e) => doi("san", e.target.value)} className={o}>
            <option value="">Tất cả</option>
            <option>HOSE</option>
            <option>HNX</option>
            <option>UPCOM</option>
          </select>
        </label>
        <label className="col-span-2 block sm:col-span-2 lg:col-span-1">
          <span className="text-[11px] text-chu-phu">Ngành</span>
          <select value={dk.nganh} onChange={(e) => doi("nganh", e.target.value)} className={o}>
            <option value="">Tất cả ngành</option>
            {dsNganh.map((n) => (
              <option key={n.khoa} value={n.khoa}>
                {n.ten}
              </option>
            ))}
          </select>
        </label>
        {oSo("vonHoaMin", "Vốn hoá từ (tỷ)", "vd 1000")}
        {oSo("giaTriMin", "GTGD phiên từ (tỷ)", "vd 5")}
        {oSo("peMax", "P/E tối đa", "vd 12")}
        {oSo("pbMax", "P/B tối đa", "vd 2")}
        {oSo("roeMin", "ROE từ (%)", "vd 15")}
        {oSo("tangLNMin", "LN 4 quý tăng từ (%)", "vd 20")}
        {oSo("coTucMin", "Cổ tức từ (%)", "vd 5")}
        {oSo("noVonMax", "Nợ/VCSH tối đa", "vd 1")}
        <label className="flex items-end gap-2 pb-2">
          <input type="checkbox" checked={dk.nnMua} onChange={(e) => doi("nnMua", e.target.checked)} className="h-4 w-4 accent-[var(--nhan)]" />
          <span>Khối ngoại mua ròng</span>
        </label>
        <div className="flex items-end">
          <button
            onClick={() => {
              setDk(TRONG);
              setMauDangChon("Tất cả");
            }}
            className="h-9 w-full border border-vien font-medium text-chu-phu hover:text-chu rounded-full"
          >
            Xoá điều kiện
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p>
          <b className="text-nhan">{ketQua.length.toLocaleString("vi-VN")}</b> mã phù hợp
          <span className="text-chu-phu"> / {dong.length.toLocaleString("vi-VN")} mã</span>
        </p>
        <NhanPhien phien={phien} />
      </div>

      <div className="mt-2 overflow-x-auto border border-vien rounded-2xl">
        <table className="w-full">
          <thead className="border-b border-vien text-[12px] font-medium text-chu-phu">
            <tr>
              <th className="w-8 py-2 pl-2" aria-label="Theo dõi" />
              <th className="px-3 py-2 text-left">Mã</th>
              {COT.map((c) => (
                <th key={c.khoa} className={`px-3 py-2 text-right ${c.an ?? ""}`}>
                  <button
                    onClick={() =>
                      setSapXep((s) => (s.cot === c.khoa ? { cot: c.khoa, giam: !s.giam } : { cot: c.khoa, giam: true }))
                    }
                    className="hover:text-chu"
                  >
                    {c.nhan}
                    {sapXep.cot === c.khoa && (sapXep.giam ? " ↓" : " ↑")}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ketQua.slice(0, soDong).map((d) => (
              <tr key={d.ma} className="border-t border-vien hover:bg-nhan-nhat">
                <td className="py-2 pl-2">
                  <NutTheoDoi ma={d.ma} gon />
                </td>
                <td className="max-w-[12rem] px-3 py-2">
                  <Link prefetch={false} href={`/co-phieu/${d.ma}`} className="font-semibold hover:underline">
                    {d.ma}
                  </Link>
                  <span className="ml-2 text-[11px] text-chu-phu">{d.san}</span>
                  <div className="truncate text-[11px] text-chu-phu">{d.ten}</div>
                </td>
                {COT.map((c) => (
                  <td key={c.khoa} className={`px-3 py-2 text-right tabular-nums ${c.an ?? ""} ${c.mau?.(d) ?? ""}`}>
                    {c.dinhDang(d)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {ketQua.length === 0 && (
          <p className="p-8 text-center text-chu-phu">Không có mã nào thoả mọi điều kiện. Thử nới lỏng bớt điều kiện.</p>
        )}
      </div>

      {soDong < ketQua.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setSoDong((x) => x + MOI_TRANG)}
            className="h-9 border border-nhan px-5 font-medium text-nhan hover:bg-nhan hover:text-white rounded-full"
          >
            Xem thêm {Math.min(MOI_TRANG, ketQua.length - soDong)} mã
          </button>
        </div>
      )}

      <p className="mt-3 text-[11px] text-chu-phu">
        P/E, P/B, cổ tức tính theo giá hiện tại và số liệu 4 quý gần nhất (lợi nhuận sau thuế công ty mẹ). LN tăng: so
        với 4 quý cùng kỳ năm trước. Mã lỗ không có P/E. Dữ liệu tài chính từ VNDirect qua Mofi, chỉ để tham khảo.
      </p>
    </>
  );
}
