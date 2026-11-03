// Quét FL Bắt đáy cho các mã vốn hoá lớn đủ thanh khoản. Kỹ thuật tính cho mọi mã, báo cáo tài chính chỉ tải cho mã đã giảm sâu.
// Chạy mỗi ngày một lần bởi scripts/quet-ngay.ts, website chỉ đọc src/data/bat-day.json.

import { ketLuanDay, moPhongBatDay, THAM_SO, type GiaTriDay, type KetQuaDay, type LyDoThoat, type MaKetLuan } from "@/lib/bat-day";
import { flGiaTri, MUC_GIA_TRI, type NenCB } from "@/lib/chi-bao";
import { ghepNenPhien, layBangGia, layBaoCao, layNenKhongCache, laySoCoPhieu, layTaiChinhToanThiTruong } from "@/lib/mofi";
import { mocDinhGia } from "@/lib/tai-chinh";

const SO_MA = 500;
const GIA_TRI_TOI_THIEU = 2e9;
const PHIEN_BAN_GAN_DAY = 5;

// Định giá của một mã theo cùng cách với FL Giá trị
export function giaTriDay(nen: NenCB[], moc: Parameters<typeof flGiaTri>[1], lnst: number | null): GiaTriDay {
  const fl = flGiaTri(nen, moc);
  const giaVach = (p: (typeof MUC_GIA_TRI)[number]["p"]) => {
    const m = fl?.muc.find((x) => x.p === p);
    return m && fl?.neoNay ? m.boi * fl.neoNay : null;
  };
  return { diem: fl?.diem ?? null, boi: fl?.boiNay ?? null, giaRe: giaVach(0.25), giaThuongGap: giaVach(0.5), lnst, soNam: fl?.soNam ?? 0 };
}

export type DongBatDay = {
  ma: string;
  ten: string;
  san: string;
  gia: number;
  phanTram: number;
  giam: number;
  hoi: number | null;
  phienTuDay: number | null;
  ketLuan: MaKetLuan;
  diem: number;
  pb: number | null;
  pbDiem: number | null;
  catLo: number | null;
  ruiRo: number | null;
  giaThuongGap: number | null;
  giaTriTb20: number;
};

export type TinBan = { ma: string; ten: string; lyDo: LyDoThoat; ngay: number; giaMua: number; giaBan: number | null; lai: number | null; daXay: boolean };

export async function quetBatDay() {
  const [bang, tc, soCP] = await Promise.all([layBangGia(), layTaiChinhToanThiTruong().catch(() => null), laySoCoPhieu().catch(() => null)]);
  const ung = [...bang.coPhieu]
    .filter((c) => c.ma.length === 3 && c.gia > 0)
    .sort((a, b) => (b.vonHoa ?? 0) - (a.vonHoa ?? 0))
    .slice(0, SO_MA);

  const ds: DongBatDay[] = [];
  const tinBan: TinBan[] = [];
  let soMa = 0;
  let ngay = 0;

  // Tải theo lô để không dồn hàng trăm kết nối cùng lúc tới Mofi
  for (let i = 0; i < ung.length; i += 16) {
    await Promise.all(
      ung.slice(i, i + 16).map(async (cp) => {
        const tho = await layNenKhongCache(cp.ma).catch(() => null);
        if (!tho?.length) return;
        const nen = ghepNenPhien(tho, bang.phien?.ngay, { gia: cp.gia, kl: cp.khoiLuong });
        const kt: KetQuaDay | null = moPhongBatDay(nen);
        if (!kt || kt.giaTriTb20 < GIA_TRI_TOI_THIEU) return;
        soMa++;
        ngay = Math.max(ngay, nen[nen.length - 1].time);

        const n = nen.length;
        for (const l of kt.lenh)
          if (l.iBan != null && l.iBan >= n - PHIEN_BAN_GAN_DAY)
            tinBan.push({ ma: cp.ma, ten: cp.ten, lyDo: l.lyDo, ngay: nen[l.iBan].time, giaMua: l.giaMua, giaBan: l.giaBan, lai: l.lai, daXay: true });
        if (kt.canhBaoBan && kt.lenhMo)
          tinBan.push({ ma: cp.ma, ten: cp.ten, lyDo: kt.canhBaoBan, ngay: nen[n - 1].time, giaMua: kt.lenhMo.giaMua, giaBan: null, lai: (kt.gia / kt.lenhMo.giaMua - 1 - THAM_SO.phi) * 100, daXay: false });

        if (kt.giam > -THAM_SO.giamToiThieu) return;
        const bc = await layBaoCao(cp.ma).catch(() => null);
        const so = soCP?.[cp.ma];
        const gt = bc && so ? giaTriDay(nen, mocDinhGia(bc, so), tc?.[cp.ma]?.lnst ?? null) : null;
        const kl = ketLuanDay(kt, gt);
        ds.push({
          ma: cp.ma,
          ten: cp.ten,
          san: cp.san,
          gia: kt.gia,
          phanTram: cp.phanTram,
          giam: kt.giam,
          hoi: kt.hoi,
          phienTuDay: kt.phienTuDay,
          ketLuan: kl.ma,
          diem: kl.diem,
          pb: gt?.boi ?? null,
          pbDiem: gt?.diem ?? null,
          catLo: kt.catLo,
          ruiRo: kt.ruiRo,
          giaThuongGap: gt?.giaThuongGap ?? null,
          giaTriTb20: kt.giaTriTb20,
        });
      }),
    );
  }
  ds.sort((a, b) => b.diem - a.diem || b.giaTriTb20 - a.giaTriTb20);
  tinBan.sort((a, b) => b.ngay - a.ngay || a.ma.localeCompare(b.ma));
  return { ngay, soMa, ds, tinBan };
}

export type KetQuaBatDay = Awaited<ReturnType<typeof quetBatDay>>;
