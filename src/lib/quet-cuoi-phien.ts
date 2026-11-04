// Từ ảnh chụp cuối phiên của Mofi, tính dòng tiền khối ngoại 20 phiên và bản tin của từng phiên.
// Chạy mỗi ngày một lần bởi scripts/quet-ngay.ts.

import { GOC_MOFI } from "@/lib/bang-dien";
import type { BanTin, ChiSoBanTin, DongTienMa, KetQuaDongTien, MaBanTin, NgoaiMa, TinHieuBanTin } from "@/lib/cuoi-phien";
import { diem as dinhDiem, phanTram as dinhPt, soNguyen, tyDong } from "@/lib/dinh-dang";
import { laNgayGiaoDich, ngayVN } from "@/lib/lich-nghi";
import { layBangGia, layNganh, laySoCoPhieu } from "@/lib/mofi";
import { LOAI, type KetQuaQuetTinHieu } from "@/lib/quet-tin-hieu";

const SO_PHIEN = 20;
const GIA_TRI_TOI_THIEU = 5e9; // lọc mã quá ít thanh khoản khỏi top tăng giảm
const UA = { "User-Agent": "FinloBot/1.0 (+https://www.finlo.id.vn)" };

type BangTho = { ngay: string; ma: string[]; gia: number[]; tc: number[]; tran: number[]; gsan: number[]; kl: number[]; gt: number[]; nnM: number[]; nnB: number[] };
type ChiSoTho = { ds: { ma: string; gia: number; tc: number; gt: number }[] };
type Phien = { ngay: string; bang: BangTho; chiSo: ChiSoTho | null };

const TEN_CHI_SO: [string, string, string][] = [
  ["VNINDEX", "VNINDEX", "VN-Index"],
  ["VN30", "VN30", "VN30"],
  ["HNXINDEX", "HNX", "HNX-Index"],
  ["HNXUPCOMINDEX", "UPCOM", "UPCoM-Index"],
];

async function taiFile<T>(duong: string): Promise<T | null> {
  const res = await fetch(`${GOC_MOFI}/realtime/${duong}`, { headers: UA, signal: AbortSignal.timeout(20000) }).catch(() => null);
  return res?.ok ? ((await res.json()) as T) : null;
}

// Ảnh chụp 15:30 là số chốt của phiên. File các ngày cũ không đổi, Cloudflare đã lưu sẵn.
async function taiPhien(ngay: string): Promise<Phien | null> {
  for (const hhmm of ["1530", "1515", "1500"]) {
    const bang = await taiFile<BangTho>(`bang/${ngay}/${hhmm}.json`);
    if (bang && bang.gt.some((x) => x > 0)) return { ngay, bang, chiSo: await taiFile<ChiSoTho>(`chi-so/${ngay}/${hhmm}.json`) };
  }
  return null;
}

async function taiCacPhien(): Promise<Phien[]> {
  const ds: Phien[] = [];
  let giay = Math.floor(Date.now() / 1000);
  for (let lui = 0; lui < 45 && ds.length < SO_PHIEN; lui++, giay -= 86400) {
    const ngay = ngayVN(giay);
    if (!laNgayGiaoDich(ngay)) continue;
    const p = await taiPhien(ngay);
    if (p) ds.push(p);
  }
  return ds.reverse();
}

const lon = <T,>(ds: T[], n: number, lay: (x: T) => number) => [...ds].sort((a, b) => lay(b) - lay(a)).slice(0, n);
const nho = <T,>(ds: T[], n: number, lay: (x: T) => number) => [...ds].sort((a, b) => lay(a) - lay(b)).slice(0, n);
const tong = (ds: number[]) => ds.reduce((s, x) => s + x, 0);
const motSo = (x: number) => Math.round(x * 100) / 100;
const khongDau = (t: string) => t.replace("+", "");

function taoDongTien(cacPhien: Phien[], tenMa: Map<string, string>, maNganh: Record<string, string>, tenNganh: Record<string, string>): KetQuaDongTien {
  const n = cacPhien.length;
  const theoMa = new Map<string, number[]>();
  const theoNganh = new Map<string, number[]>();
  cacPhien.forEach(({ bang }, i) => {
    bang.ma.forEach((ma, j) => {
      const rong = bang.nnM[j] - bang.nnB[j];
      if (!rong) return;
      if (!theoMa.has(ma)) theoMa.set(ma, Array<number>(n).fill(0));
      theoMa.get(ma)![i] = Math.round(rong);
      const k = maNganh[ma] ?? "khac";
      if (!theoNganh.has(k)) theoNganh.set(k, Array<number>(n).fill(0));
      theoNganh.get(k)![i] += rong;
    });
  });

  // Giữ các mã đứng đầu theo từng khung để đổi 1, 5, 10, 20 phiên đều đúng mà file vẫn gọn
  const giu = new Set<string>();
  const ds = [...theoMa.entries()];
  for (const khung of [1, 5, 10, n]) {
    const cong = ([, r]: [string, number[]]) => tong(r.slice(-khung));
    for (const [ma] of [...lon(ds, 40, cong), ...nho(ds, 40, cong)]) giu.add(ma);
  }

  const cuoi = cacPhien[n - 1].bang;
  const ma: DongTienMa[] = [...giu].flatMap((m) => {
    const i = cuoi.ma.indexOf(m);
    if (i < 0) return [];
    const gia = cuoi.gia[i] > 0 ? cuoi.gia[i] : cuoi.tc[i];
    const nganh = maNganh[m] ? (tenNganh[maNganh[m]] ?? null) : null;
    return [{ ma: m, ten: tenMa.get(m) ?? m, nganh, gia, phanTram: cuoi.tc[i] ? motSo((gia / cuoi.tc[i] - 1) * 100) : 0, rong: theoMa.get(m)! }];
  });

  return {
    ngay: cacPhien[n - 1].ngay,
    soMa: cuoi.ma.length,
    cacNgay: cacPhien.map((p) => p.ngay),
    tongMua: cacPhien.map((p) => Math.round(tong(p.bang.nnM))),
    tongBan: cacPhien.map((p) => Math.round(tong(p.bang.nnB))),
    nganh: [...theoNganh.entries()].map(([k, r]) => ({ k, ten: tenNganh[k] ?? "Khác", rong: r.map(Math.round) })),
    ma,
  };
}

const tangGiam = (x: number) => (x > 0 ? "tăng" : x < 0 ? "giảm" : "đứng giá");

function taoBanTin(p: Phien, truoc: Phien[], soCp: Record<string, number>, maNganh: Record<string, string>, tenNganh: Record<string, string>, tinHieu: TinHieuBanTin[] | null): BanTin {
  const b = p.bang;
  const dong = b.ma
    .map((ma, i) => ({ ma, gia: b.gia[i], tc: b.tc[i], tran: b.tran[i], san: b.gsan[i], kl: b.kl[i], gt: b.gt[i], rong: b.nnM[i] - b.nnB[i] }))
    .filter((d) => d.gia > 0 && d.tc > 0 && d.kl > 0);
  const pt = (d: { gia: number; tc: number }) => (d.gia / d.tc - 1) * 100;

  const doRong = {
    tang: dong.filter((d) => d.gia > d.tc).length,
    giam: dong.filter((d) => d.gia < d.tc).length,
    dung: dong.filter((d) => d.gia === d.tc).length,
    tran: dong.filter((d) => d.tran > 0 && d.gia >= d.tran).length,
    san: dong.filter((d) => d.san > 0 && d.gia <= d.san).length,
  };

  const chiSo: ChiSoBanTin[] = TEN_CHI_SO.flatMap(([goc, ma, ten]) => {
    const x = p.chiSo?.ds.find((d) => d.ma.toUpperCase() === goc);
    if (!x?.tc) return [];
    return [{ ma, ten, diem: motSo(x.gia), thayDoi: motSo(x.gia - x.tc), phanTram: motSo((x.gia / x.tc - 1) * 100), giaTri: x.gt }];
  });

  // Ngành: bình quân theo vốn hoá, như cách tính chỉ số. Cần ít nhất 3 mã để một mã không kéo cả ngành.
  const nhom = new Map<string, { von: number; cong: number; so: number }>();
  for (const d of dong) {
    const k = maNganh[d.ma];
    const cp = soCp[d.ma];
    if (!k || !cp) continue;
    const von = d.tc * cp;
    const g = nhom.get(k) ?? { von: 0, cong: 0, so: 0 };
    nhom.set(k, { von: g.von + von, cong: g.cong + von * pt(d), so: g.so + 1 });
  }
  const nganh = [...nhom.entries()].filter(([, g]) => g.so >= 3 && g.von > 0).map(([k, g]) => ({ ten: tenNganh[k] ?? k, phanTram: motSo(g.cong / g.von) }));
  const nganhTang = lon(nganh, 5, (x) => x.phanTram).filter((x) => x.phanTram > 0);
  const nganhGiam = nho(nganh, 5, (x) => x.phanTram).filter((x) => x.phanTram < 0);

  const doiMa = (d: (typeof dong)[number]): MaBanTin => ({ ma: d.ma, gia: d.gia, phanTram: motSo(pt(d)), giaTri: d.gt });
  const thanhKhoan = dong.filter((d) => d.gt >= GIA_TRI_TOI_THIEU);
  const giaTri = tong(dong.map((d) => d.gt));
  const tb = truoc.length ? tong(truoc.map((x) => tong(x.bang.gt))) / truoc.length : 0;
  const soVoiTb = tb > 0 ? motSo((giaTri / tb - 1) * 100) : null;

  const mua = tong(b.nnM);
  const ban = tong(b.nnB);
  const rong = mua - ban;
  const doiNgoai = (d: (typeof dong)[number]): NgoaiMa => ({ ma: d.ma, rong: Math.round(d.rong) });
  const muaRong = lon(dong, 5, (d) => d.rong).filter((d) => d.rong > 0).map(doiNgoai);
  const banRong = nho(dong, 5, (d) => d.rong).filter((d) => d.rong < 0).map(doiNgoai);
  const chuNgoai = `khối ngoại ${rong >= 0 ? "mua" : "bán"} ròng ${tyDong(Math.abs(rong) * 1e6)}`;

  const vn = chiSo[0];
  const tieuDe = vn
    ? `VN-Index ${tangGiam(vn.phanTram)}${vn.phanTram ? ` ${khongDau(dinhPt(Math.abs(vn.phanTram)))}` : ""} ${vn.phanTram > 0 ? "lên" : vn.phanTram < 0 ? "xuống" : "ở"} ${dinhDiem(vn.diem)} điểm, ${chuNgoai}`
    : `Thị trường có ${doRong.tang} mã tăng, ${doRong.giam} mã giảm, ${chuNgoai}`;

  const doan: string[] = [];
  const moDau = vn ? `VN-Index đóng cửa ở ${dinhDiem(vn.diem)} điểm, ${tangGiam(vn.phanTram)}${vn.thayDoi ? ` ${dinhDiem(Math.abs(vn.thayDoi))} điểm` : ""}. ` : "";
  doan.push(`${moDau}Toàn thị trường có ${soNguyen(doRong.tang)} mã tăng, ${soNguyen(doRong.giam)} mã giảm và ${soNguyen(doRong.dung)} mã đứng giá, trong đó ${doRong.tran} mã tăng trần và ${doRong.san} mã giảm sàn.`);

  const moTaNganh = (ds: { ten: string; phanTram: number }[]) => ds.slice(0, 2).map((x) => `${x.ten} (${dinhPt(x.phanTram)})`).join(", ");
  const cuaNganh = [nganhTang.length ? `Ngành tăng tốt nhất là ${moTaNganh(nganhTang)}` : "", nganhGiam.length ? `${nganhTang.length ? "ngành" : "Ngành"} giảm mạnh nhất là ${moTaNganh(nganhGiam)}` : ""].filter(Boolean).join("; ");
  const soSanh = soVoiTb != null ? `, ${soVoiTb >= 0 ? "cao hơn" : "thấp hơn"} ${khongDau(dinhPt(Math.abs(soVoiTb)))} so với trung bình ${truoc.length} phiên trước` : "";
  doan.push(`Giá trị giao dịch đạt ${tyDong(giaTri)}${soSanh}.${cuaNganh ? ` ${cuaNganh}.` : ""}`);

  const cuaNgoai = rong >= 0 ? muaRong : banRong;
  const chu = chuNgoai.charAt(0).toUpperCase() + chuNgoai.slice(1);
  doan.push(`${chu}${cuaNgoai.length ? `, nhiều nhất ở ${cuaNgoai.slice(0, 3).map((x) => `${x.ma} (${tyDong(Math.abs(x.rong) * 1e6)})`).join(", ")}` : ""}.`);

  return {
    ngay: p.ngay,
    tieuDe,
    doan,
    chiSo,
    doRong,
    giaTri,
    soVoiTb,
    nganhTang,
    nganhGiam,
    maTang: lon(thanhKhoan, 5, pt).map(doiMa),
    maGiam: nho(thanhKhoan, 5, pt).map(doiMa),
    maGiaTri: lon(dong, 5, (d) => d.gt).map(doiMa),
    ngoai: { mua: Math.round(mua), ban: Math.round(ban), muaRong, banRong },
    tinHieu,
  };
}

function gomTinHieu(kq: KetQuaQuetTinHieu): TinHieuBanTin[] {
  return LOAI.flatMap((l) => {
    const co = kq.ds.filter((d) => d.chiTiet[l.k]);
    if (!co.length) return [];
    return [{ k: l.k, ten: l.ten, huong: l.huong, so: co.length, ma: lon(co, 6, (d) => d.giaTriTb20).map((d) => d.ma) }];
  });
}

// cu: bản tin đã lưu, giữ lại phiên cũ để có kho lưu trữ. Tín hiệu chỉ gắn vào đúng phiên đã quét.
export async function quetCuoiPhien(cu: BanTin[], quet: KetQuaQuetTinHieu | null) {
  const [bangGia, { maNganh, ten: tenNganh }, soCp] = await Promise.all([layBangGia(), layNganh(), laySoCoPhieu()]);
  const cacPhien = await taiCacPhien();
  if (!cacPhien.length) throw new Error("Không có ảnh chụp cuối phiên nào");
  const tenMa = new Map(bangGia.coPhieu.map((c) => [c.ma, c.ten]));

  const ngayQuet = quet ? ngayVN(quet.ngay) : "";
  const theoNgay = new Map(cu.map((b) => [b.ngay, b]));
  cacPhien.forEach((p, i) => {
    const tinHieu = quet && ngayQuet === p.ngay ? gomTinHieu(quet) : (theoNgay.get(p.ngay)?.tinHieu ?? null);
    theoNgay.set(p.ngay, taoBanTin(p, cacPhien.slice(0, i), soCp, maNganh, tenNganh, tinHieu));
  });

  return {
    dongTien: taoDongTien(cacPhien, tenMa, maNganh, tenNganh),
    banTin: [...theoNgay.values()].sort((a, b) => b.ngay.localeCompare(a.ngay)).slice(0, 60),
  };
}
