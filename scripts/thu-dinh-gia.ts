// Chạy thử mô hình định giá ngoài Next: npx tsx --tsconfig scripts/tsconfig.quet.json scripts/thu-dinh-gia.ts VND FPT
import { cacPhuongPhap, dcf, tangTruongNgam, thuNhapThangDu, tongHop } from "@/lib/mo-hinh-dinh-gia";
import { layBangGia, layDanhGia, layEpsChuanHoa, layHoSo, layNen, layNenChiSo, layNganh } from "@/lib/mofi";
import { phanTichSau } from "@/lib/phan-tich-sau";

async function chinh() {
  const [bg, nganh, vni] = await Promise.all([layBangGia(), layNganh(), layNenChiSo("VNINDEX")]);
  for (const ma of process.argv.slice(2)) {
    const [dg, nen, hs, epsCh] = await Promise.all([layDanhGia(ma), layNen(ma), layHoSo(ma), layEpsChuanHoa(ma)]);
    const cp = bg.coPhieu.find((c) => c.ma === ma)!;
    const k = nganh.maNganh[ma];
    const p = phanTichSau({ dg: dg!, nen, vni: vni!.nen, soCp: hs!.soCoPhieu!, gia: cp.gia, rf: 5.2, peNganh: nganh.pe[k] ?? null, tenNganh: nganh.ten[k] ?? null, epsChuanHoa: epsCh, noXau: null });
    const pp = cacPhuongPhap(p.dauVao, p.giaDinh);
    console.log(`\n### ${ma} giá ${cp.gia} | ${p.kyGanNhat} | Ke ${p.ke.toFixed(1)} WACC ${p.wacc.toFixed(1)} | giả định`, JSON.stringify(p.giaDinh));
    console.log("đầu vào", JSON.stringify({ ...p.dauVao, boi: undefined }, (_, v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v)));
    console.log("bội", JSON.stringify(p.dauVao.boi, (_, v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v)));
    for (const x of pp) console.log(`  ${x.ten.padEnd(34)} ${Math.round(x.thap)} – ${Math.round(x.giua)} – ${Math.round(x.cao)}  (${x.trongSo}%)  ${x.ghiChu}`);
    console.log("  TỔNG HỢP", JSON.stringify(tongHop(pp), (_, v) => (typeof v === "number" ? Math.round(v) : v)), "ngầm", JSON.stringify(tangTruongNgam(p.dauVao, p.giaDinh)));
    const d = dcf(p.dauVao, p.giaDinh);
    if (d) console.log("  DCF ev", Math.round(d.ev / 1e9), "tỷ, cuối kỳ", Math.round((d.pvCuoi / d.ev) * 100) + "%", "fcff 3 năm", p.coBan.fcffNam.map((x) => (x == null ? null : Math.round(x / 1e9))).join("/"));
    const r = thuNhapThangDu(p.dauVao, p.giaDinh);
    if (r) console.log("  RI", Math.round(r.gia), "thặng dư", Math.round(r.pvThangDu));
    console.log("  cơ bản", JSON.stringify(p.coBan, (_, v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v)).slice(0, 400));
    console.log("  chất lượng:", p.chatLuong.the.map((t) => `${t.nhan}=${t.gt}`).join(" | "));
    console.log("  sức khoẻ:", p.sucKhoe.map((t) => `${t.nhan}=${t.gt}`).join(" | "));
    console.log("  rủi ro:", p.ruiRo.map((t) => `${t.nhan}=${t.gt}`).join(" | "));
    console.log("  trụ cột:", p.truCot.map((t) => `${t.ten} ${t.ds.filter((x) => x.dat).length}/${t.ds.filter((x) => x.dat != null).length}`).join(" · "), p.fScore ? `F=${p.fScore.diem}` : "");
  }
}
void chinh();
