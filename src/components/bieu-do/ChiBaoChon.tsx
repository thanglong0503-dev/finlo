"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BO_MAU, CHI_BAO, NHOM, TIM_CHI_BAO, thamSoMacDinh, type ChiBao, type NhomChiBao } from "@/lib/bo-chi-bao";

// ---- Lưu lựa chọn chỉ báo và tham số trong trình duyệt ----
const KHOA = "finlo-chi-bao";
const KHOA_TS = "finlo-chi-bao-tham-so";
const SU_KIEN = "finlo-chi-bao";
const MAC_DINH = ["kl", "ma", "fl-xu-huong"];
// Mã cũ trước khi có tham số
const DOI_TEN: Record<string, string> = { ma20: "ma", ma50: "ma", ema20: "ema" };

const docKhoa = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const ghiKhoa = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // không lưu được thì lựa chọn chỉ mất khi tải lại trang
  }
};

let thoDs: string | null | undefined;
let ds: string[] = MAC_DINH;
const docDs = () => {
  const s = docKhoa(KHOA);
  if (s !== thoDs) {
    thoDs = s;
    try {
      const mang = s ? (JSON.parse(s) as string[]) : MAC_DINH;
      ds = [...new Set(mang.map((m) => DOI_TEN[m] ?? m))].filter((m) => TIM_CHI_BAO.has(m));
    } catch {
      ds = MAC_DINH;
    }
  }
  return ds;
};

type BangThamSo = Record<string, Record<string, number>>;
let thoTs: string | null | undefined;
let ts: BangThamSo = {};
const docTs = () => {
  const s = docKhoa(KHOA_TS);
  if (s !== thoTs) {
    thoTs = s;
    try {
      ts = s ? (JSON.parse(s) as BangThamSo) : {};
    } catch {
      ts = {};
    }
  }
  return ts;
};

const dangKy = (goi: () => void) => {
  window.addEventListener(SU_KIEN, goi);
  return () => window.removeEventListener(SU_KIEN, goi);
};
const bao = () => window.dispatchEvent(new Event(SU_KIEN));

export function useChiBaoDangBat() {
  return useSyncExternalStore(dangKy, docDs, () => MAC_DINH);
}

const TS_RONG: BangThamSo = {};
export function useThamSoChiBao() {
  return useSyncExternalStore(dangKy, docTs, () => TS_RONG);
}

// Tham số đầy đủ (mặc định + phần người dùng đã chỉnh)
export const thamSoCua = (c: ChiBao, bang: BangThamSo) => ({ ...thamSoMacDinh(c), ...(bang[c.ma] ?? {}) });

export function batTatChiBao(ma: string) {
  const hien = docDs();
  ghiKhoa(KHOA, JSON.stringify(hien.includes(ma) ? hien.filter((x) => x !== ma) : [...hien, ma]));
  bao();
}

function datDs(moi: string[]) {
  ghiKhoa(KHOA, JSON.stringify(moi));
  bao();
}

function datThamSo(ma: string, khoa: string, v: number) {
  const hien = docTs();
  ghiKhoa(KHOA_TS, JSON.stringify({ ...hien, [ma]: { ...(hien[ma] ?? {}), [khoa]: v } }));
  bao();
}

function datLaiThamSo(ma: string) {
  const hien = { ...docTs() };
  delete hien[ma];
  ghiKhoa(KHOA_TS, JSON.stringify(hien));
  bao();
}

// ---- Giao diện ----

const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

function useDongKhiBamNgoai(mo: boolean, dong: () => void) {
  const khung = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mo) return;
    const bam = (e: MouseEvent) => !khung.current?.contains(e.target as Node) && dong();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && dong();
    document.addEventListener("mousedown", bam);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", bam);
      document.removeEventListener("keydown", esc);
    };
  }, [mo, dong]);
  return khung;
}

const NhanFinlo = () => <span className="rounded border border-nhan px-1 text-[10px] font-semibold text-nhan">Finlo</span>;

// Bảng chỉnh tham số của một chỉ báo
function BangThamSoCB({ c, giaTri, dong }: { c: ChiBao; giaTri: Record<string, number>; dong: () => void }) {
  const khung = useDongKhiBamNgoai(true, dong);
  return (
    <div ref={khung} className="absolute top-full left-0 z-40 mt-2 w-72 rounded-2xl border border-vien bg-nen-phu p-4 shadow-2xl">
      <p className="font-semibold">{c.ten}</p>
      <div className="mt-3 space-y-2.5">
        {c.thamSo.map((t) => (
          <label key={t.khoa} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-chu-phu">{t.nhan}</span>
            <input
              type="number"
              min={t.min}
              max={t.max}
              step={t.buoc ?? 1}
              defaultValue={giaTri[t.khoa]}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value !== "" && Number.isFinite(v) && v >= t.min && v <= t.max) datThamSo(c.ma, t.khoa, v);
              }}
              className="h-8 w-24 rounded-lg border border-vien bg-nen px-2 text-right tabular-nums outline-none focus:border-nhan"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => {
            datLaiThamSo(c.ma);
            dong();
          }}
          className="h-8 rounded-full px-3 text-[13px] text-chu-phu hover:text-chu"
        >
          Về mặc định
        </button>
        <button onClick={dong} className="h-8 rounded-full bg-chu px-4 text-[13px] font-semibold text-nen">
          Xong
        </button>
      </div>
    </div>
  );
}

type Loc = "tat-ca" | NhomChiBao | "finlo";

// Thanh chỉ báo: nút mở thư viện chỉ báo (tìm kiếm, bộ mẫu, nhóm) và các thẻ chỉ báo đang bật,
// mỗi thẻ có nút chỉnh tham số và nút bỏ.
export function ThanhChiBao({ coPhieu }: { coPhieu: boolean }) {
  const dangBat = useChiBaoDangBat();
  const bangTs = useThamSoChiBao();
  const [mo, setMo] = useState(false);
  const [chinh, setChinh] = useState<string | null>(null);
  const [tim, setTim] = useState("");
  const [loc, setLoc] = useState<Loc>("tat-ca");
  const khung = useDongKhiBamNgoai(mo, () => setMo(false));

  const dung = CHI_BAO.filter((c) => coPhieu || !c.chiCoPhieu);
  const bat = dangBat.map((m) => dung.find((c) => c.ma === m)).filter((c): c is ChiBao => !!c);
  const tk = boDau(tim.trim());
  const hienThi = dung.filter(
    (c) => (loc === "tat-ca" || (loc === "finlo" ? c.finlo : c.nhom === loc)) && (!tk || boDau(`${c.ten} ${c.moTa}`).includes(tk)),
  );
  const boMau = BO_MAU.filter((b) => coPhieu || b.ds.every((m) => !TIM_CHI_BAO.get(m)?.chiCoPhieu));
  const loai: [Loc, string][] = [["tat-ca", "Tất cả"], ...NHOM.map((n): [Loc, string] => [n.ma, n.ten]), ["finlo", "Của Finlo"]];

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 border-b border-vien px-2 py-1.5">
      <div ref={khung} className="relative">
        <button
          onClick={() => setMo((x) => !x)}
          className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ${mo ? "bg-chu text-nen" : "bg-nen-noi hover:text-chu"}`}
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M1.5 12.5 6 8l3 2.5 5.5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Chỉ báo
          {bat.length > 0 && <span className="rounded-full bg-nhan px-1.5 text-[10px] text-white">{bat.length}</span>}
        </button>

        {mo && (
          <div className="absolute top-full left-0 z-30 mt-2 flex max-h-[min(640px,75dvh)] w-[min(760px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-vien bg-nen-phu shadow-2xl">
            <div className="border-b border-vien p-3">
              <input
                autoFocus
                value={tim}
                onChange={(e) => setTim(e.target.value)}
                placeholder="Tìm chỉ báo, ví dụ RSI, dòng tiền, hỗ trợ…"
                className="h-9 w-full rounded-full border border-vien bg-nen px-4 outline-none focus:border-nhan"
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="self-center pr-1 text-[12px] text-chu-phu">Bộ mẫu:</span>
                {boMau.map((b) => (
                  <button
                    key={b.ten}
                    title={b.moTa}
                    onClick={() => datDs(b.ds.filter((m) => dung.some((c) => c.ma === m)))}
                    className="h-7 rounded-full border border-vien px-3 text-[12px] font-medium hover:border-nhan hover:text-nhan"
                  >
                    {b.ten}
                  </button>
                ))}
                {bat.length > 0 && (
                  <button onClick={() => datDs([])} className="h-7 rounded-full px-3 text-[12px] text-chu-phu hover:text-giam">
                    Tắt tất cả
                  </button>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-vien p-2 sm:w-40 sm:flex-col sm:border-r sm:border-b-0">
                {loai
                  .filter(([m]) => coPhieu || m !== "dinh-gia")
                  .map(([m, ten]) => {
                    const so = dung.filter((c) => (m === "tat-ca" ? true : m === "finlo" ? c.finlo : c.nhom === m)).length;
                    return (
                      <button
                        key={m}
                        onClick={() => setLoc(m)}
                        className={`flex h-8 shrink-0 items-center justify-between gap-3 rounded-lg px-3 text-left text-[13px] ${
                          loc === m ? "bg-nen-noi font-semibold text-chu" : "text-chu-phu hover:text-chu"
                        }`}
                      >
                        {ten}
                        <span className="text-[11px] text-chu-phu">{so}</span>
                      </button>
                    );
                  })}
              </nav>

              <ul className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto p-2 sm:grid-cols-2">
                {hienThi.map((c) => {
                  const daBat = dangBat.includes(c.ma);
                  return (
                    <li key={c.ma}>
                      <button
                        onClick={() => batTatChiBao(c.ma)}
                        className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left ${daBat ? "bg-nhan-nhat" : "hover:bg-nen-noi"}`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            daBat ? "border-nhan bg-nhan text-white" : "border-vien"
                          }`}
                        >
                          {daBat && (
                            <svg viewBox="0 0 10 8" width="9" height="7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M1 4l3 3 5-6" />
                            </svg>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-semibold">
                            {c.ten}
                            {c.finlo && <NhanFinlo />}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-chu-phu">{c.moTa}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {hienThi.length === 0 && <li className="px-3 py-6 text-chu-phu">Không có chỉ báo phù hợp.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>

      <span className="mx-1 h-4 w-px bg-vien" />

      {bat.map((c) => {
        const gt = thamSoCua(c, bangTs);
        return (
          <span key={c.ma} className="relative">
            <span className={`flex h-7 items-center rounded-full pl-3 text-[12px] font-semibold ${c.finlo ? "bg-nhan-nhat text-nhan" : "bg-nen-noi"}`}>
              {c.tenNgan ? c.tenNgan(gt) : c.ten}
              {c.thamSo.length > 0 && (
                <button
                  onClick={() => setChinh((x) => (x === c.ma ? null : c.ma))}
                  aria-label={`Chỉnh tham số ${c.ten}`}
                  title="Chỉnh tham số"
                  className="ml-1 px-1 opacity-60 hover:opacity-100"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <circle cx="8" cy="8" r="2.2" />
                    <path
                      d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
              <button onClick={() => batTatChiBao(c.ma)} aria-label={`Tắt ${c.ten}`} className="px-2 opacity-60 hover:opacity-100">
                ×
              </button>
            </span>
            {chinh === c.ma && <BangThamSoCB c={c} giaTri={gt} dong={() => setChinh(null)} />}
          </span>
        );
      })}
      {bat.length === 0 && <span className="text-[12px] text-chu-phu">Chưa bật chỉ báo nào</span>}
    </div>
  );
}
