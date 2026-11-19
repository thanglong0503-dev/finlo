// Quét Fin Rating, giá trị ước tính và cổ tức cho mọi mã có báo cáo tài chính, mỗi tuần một lần.
//
//   npx tsx --tsconfig scripts/tsconfig.quet.json scripts/quet-fin-rating.ts [MÃ1 MÃ2 …]
//
// Ghi src/data/fin-rating.json (tóm tắt, dùng cho bảng xếp hạng) và src/data/fin-rating-chi-tiet.json (từng chỉ tiêu).
// Truyền danh sách mã để chạy thử: in kết quả, không ghi file. Kết quả bất thường thì giữ file cũ.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHI_TIEU, TRUC, chamDiem, xuHuongGia, type ChiTietFinRating, type DongRating, type DongTho, type KetQuaFinRating } from "@/lib/fin-rating";
import { cacPhuongPhap, tongHop } from "@/lib/mo-hinh-dinh-gia";
import { layBangGia, layDanhGia, layEpsChuanHoa, layLaiSuat, layNenChiSo, layNenKhongCache, layNganh, layNoNhom, layQuyen, laySoCoPhieu, layTaiChinhToanThiTruong } from "@/lib/mofi";
import { phanTichSau, soCpHieuLuc } from "@/lib/phan-tich-sau";

const SO_MA_TOI_THIEU = 300;
const TY_SUAT_NGHI_VAN = 15;
const LO = 8; // số mã tải cùng lúc, nhẹ tay với máy chủ Mofi

const lamTron = (x: number) => (Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 100) / 100);

async function chinh() {
  const chiThu = process.argv.slice(2).map((x) => x.toUpperCase());
  const [bg, tc, soCP, nganh, vniTho, laiSuat, noNhom] = await Promise.all([
    layBangGia(),
    layTaiChinhToanThiTruong(),
    laySoCoPhieu(),
    layNganh(),
    layNenChiSo("VNINDEX"),
    layLaiSuat().catch(() => null),
    layNoNhom().catch(() => ({}) as Awaited<ReturnType<typeof layNoNhom>>),
  ]);
  const vni = vniTho?.nen ?? [];
  if (vni.length < 300) throw new Error("Thiếu nến VN-Index");
  const mucLai = (laiSuat?.nganHang ?? []).map((b) => b.ls["12t"]).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  const rf = mucLai.length ? mucLai[Math.floor(mucLai.length / 2)] : 5;

  const ung = bg.coPhieu.filter((c) => c.ma.length === 3 && c.gia > 0 && tc[c.ma] && soCP[c.ma] && (!chiThu.length || chiThu.includes(c.ma)));
  console.log(`Quét ${ung.length} mã, lãi suất phi rủi ro ${rf}%`);

  const tho: DongTho[] = [];
  const thongTin = new Map<string, Omit<DongRating, "diem" | "truc" | "hang">>();
  let ngay = 0;
  let loi = 0;
  for (let i = 0; i < ung.length; i += LO) {
    await Promise.all(
      ung.slice(i, i + LO).map(async (cp) => {
        try {
          const [dg, nen, epsChuanHoa, quyen] = await Promise.all([layDanhGia(cp.ma), layNenKhongCache(cp.ma), layEpsChuanHoa(cp.ma), layQuyen(cp.ma)]);
          if (!dg || dg.quy.length < 8 || nen.length < 130) return;
          const khoa = nganh.maNganh[cp.ma] ?? null;
          let noXau: number | null = null;
          if (dg.loai === "ngan_hang") {
            const cuaMa = noNhom[cp.ma];
            const ky = cuaMa ? Object.keys(cuaMa).sort().at(-1) : undefined;
            const x = ky ? cuaMa[ky] : null;
            noXau = x && x.tong > 0 ? (x.noXau / x.tong) * 100 : null;
          }
          const ngayCuoi = new Date(nen[nen.length - 1].time * 1000 + 7 * 3600e3).toISOString().slice(0, 10);
          const soCp = soCpHieuLuc(soCP[cp.ma], dg, quyen, ngayCuoi);
          const p = phanTichSau({ dg, nen, vni, soCp, gia: cp.gia, rf, peNganh: khoa ? (nganh.pe[khoa] ?? null) : null, tenNganh: khoa ? nganh.ten[khoa] : null, epsChuanHoa, noXau });
          const pp = cacPhuongPhap(p.dauVao, p.giaDinh);
          const th = tongHop(pp);
          const xh = xuHuongGia(nen, vni);
          const t = p.tho;
          tho.push({
            ma: cp.ma,
            loai: dg.loai,
            tho: {
              ...t,
              // Tỷ suất trên 15% thường là số hợp nhất gồm cổ tức trả cho cổ đông thiểu số hoặc chia dồn: không chấm
              tySuat: t.tySuat != null && t.tySuat > TY_SUAT_NGHI_VAN ? null : t.tySuat,
              tiemNang: th && th.giua > 0 ? (th.giua / cp.gia - 1) * 100 : null,
              chiTraLech: t.chiTra != null && t.chiTra > 0 ? Math.abs(t.chiTra - 50) : null,
              lech6t: xh.lech6t,
              lech12t: xh.lech12t,
              giaMa50: xh.giaMa50,
              giaMa200: xh.giaMa200,
            },
          });
          const { pe, pb } = p.dauVao.boi;
          thongTin.set(cp.ma, {
            ma: cp.ma,
            ten: cp.ten,
            san: cp.san,
            nganh: khoa,
            loai: dg.loai,
            gia: cp.gia,
            giaTri: th ? Math.round(th.giua) : null,
            giaTriThap: th ? Math.round(th.thap) : null,
            giaTriCao: th ? Math.round(th.cao) : null,
            soPp: pp.filter((x) => x.trongSo > 0).length,
            coTucCp: Math.round(t.coTucCp ?? 0),
            soNamTra: t.soNamTra ?? 0,
            chiTra: t.chiTra != null ? lamTron(t.chiTra) : null,
            pe: pe?.nay != null ? lamTron(pe.nay) : null,
            pb: pb?.nay != null ? lamTron(pb.nay) : null,
            roe: t.roe != null ? lamTron(t.roe) : null,
            giaTri20: Math.round(xh.giaTri20),
          });
          ngay = Math.max(ngay, nen[nen.length - 1].time);
        } catch (e) {
          loi++;
          if (chiThu.length) console.error(cp.ma, e);
        }
      }),
    );
  }

  const diem = chamDiem(tho);
  const ds: DongRating[] = [];
  for (const d of tho) {
    const m = diem[d.ma];
    if (m.tong == null) continue;
    ds.push({ ...thongTin.get(d.ma)!, diem: m.tong, truc: m.truc, hang: 0 });
  }
  ds.sort((a, b) => b.diem - a.diem);
  ds.forEach((d, i) => (d.hang = i + 1));

  const tb = (nhom: DongRating[]) =>
    TRUC.map((_, j) => {
      const co = nhom.map((d) => d.truc[j]).filter((x): x is number => x != null);
      return co.length ? Math.round((co.reduce((s, x) => s + x, 0) / co.length) * 100) / 100 : null;
    });
  const nhomNganh: KetQuaFinRating["nganh"] = {};
  for (const k of new Set(ds.map((d) => d.nganh).filter((x): x is string => !!x))) {
    const cua = ds.filter((d) => d.nganh === k);
    nhomNganh[k] = { ten: nganh.ten[k] ?? k, soMa: cua.length, tb: tb(cua), diem: Math.round((cua.reduce((s, d) => s + d.diem, 0) / cua.length) * 100) / 100 };
  }
  const kq: KetQuaFinRating = { ngay, soMa: ds.length, thiTruong: tb(ds), nganh: nhomNganh, ds };

  const chiTiet: ChiTietFinRating = {};
  for (const d of tho) {
    if (diem[d.ma].tong == null) continue;
    const dong: Record<string, [number, number | null]> = {};
    for (const c of CHI_TIEU) {
      const x = d.tho[c.k];
      if (x != null && Number.isFinite(x)) dong[c.k] = [lamTron(x), diem[d.ma].chiTieu[c.k] ?? null];
    }
    chiTiet[d.ma] = dong;
  }

  console.log(`Chấm được ${ds.length}/${ung.length} mã, lỗi ${loi}`);
  if (chiThu.length) {
    for (const d of ds) console.log(d.ma, d.diem, JSON.stringify(d.truc), "giá trị", d.giaTri, "giá", d.gia, JSON.stringify(chiTiet[d.ma]));
    return;
  }
  if (ds.length < SO_MA_TOI_THIEU) throw new Error(`Chỉ chấm được ${ds.length} mã, giữ file cũ`);
  const ghi = (ten: string, x: unknown) => {
    const chuoi = JSON.stringify(x);
    writeFileSync(join(process.cwd(), "src/data", ten), `${chuoi}\n`);
    console.log(`${ten}: ${chuoi.length} byte`);
  };
  ghi("fin-rating.json", kq);
  ghi("fin-rating-chi-tiet.json", chiTiet);
}

chinh().catch((e) => {
  console.error(e);
  process.exit(1);
});
