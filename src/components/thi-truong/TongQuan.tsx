// Trang tổng quan thị trường: phiên, chỉ số, điểm nhấn, bản đồ nhiệt, dòng tiền, phái sinh, thế giới, sự kiện, tin
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { DongTin } from "@/components/BaoChiClient";
import { DuongNho } from "@/components/DuongNho";
import { KhoiMo } from "@/components/KhungCho";
import { BanDoNhietMa, type OMa } from "@/components/thi-truong/BanDoNhietMa";
import { BieuDoChiSo, type ChuoiChiSo } from "@/components/thi-truong/BieuDoChiSo";
import { CoPhieuNoiBat, type DongNoiBat, type KhoaNoiBat } from "@/components/thi-truong/CoPhieuNoiBat";
import { DongHoPhien } from "@/components/trang-chu/DongHoPhien";
import { TheoDoiGon } from "@/components/trang-chu/TheoDoiGon";
import { layBaoChi } from "@/lib/bao-chi";
import { diem, mauGia, mauTangGiam, phanTram, thayDoi, trieuDong, tyDong, usd } from "@/lib/dinh-dang";
import { homNayVN, ngayGiaoDichKe } from "@/lib/lich-nghi";
import { layBangGia, layBangVang, layChiSo, layNenChiSo, layNganh, layTienSo, layTin, type CoPhieu } from "@/lib/mofi";
import { mauNhiet, tongHopNganh } from "@/lib/nganh";
import { layDanhSachKhac } from "@/lib/ro-ma";
import { LOAI_SU_KIEN, suKienLich, type LoaiSuKien } from "@/lib/su-kien";
import { layTheGioi, type GiaTheGioi } from "@/lib/the-gioi";

export function KhungChoTongQuan() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <KhoiMo className="h-12 rounded-2xl" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <KhoiMo key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]">
        <KhoiMo className="h-[420px] rounded-2xl" />
        <KhoiMo className="h-[420px] rounded-2xl" />
      </div>
    </div>
  );
}

// Một ô trong lưới: thanh tiêu đề thấp, chữ thường, liên kết phụ bên phải
function O({ ten, phu, href, children, className = "", id }: { ten: string; phu?: ReactNode; href?: string; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`flex min-w-0 scroll-mt-20 flex-col overflow-hidden rounded-2xl bg-nen-phu ${className}`}>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-vien px-4">
        <h3 className="shrink-0 text-[15px] font-semibold whitespace-nowrap">{ten}</h3>
        {phu && <span className="min-w-0 truncate text-[11px] text-chu-phu">{phu}</span>}
        {href && (
          <Link href={href} className="ml-auto shrink-0 text-[11px] whitespace-nowrap text-chu-phu hover:text-nhan">
            Xem hết →
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

// Ô số liệu nhỏ: nhãn bên trái, ghi chú bên phải, nội dung bên dưới
function The({ nhan, phu, children }: { nhan: string; phu?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl bg-nen-phu p-4">
      <p className="flex items-center justify-between gap-2 text-[12px]">
        <span className="font-semibold">{nhan}</span>
        {phu && <span className="truncate text-[11px] text-chu-phu">{phu}</span>}
      </p>
      {children}
    </section>
  );
}

// Phông số không có dấu tiếng Việt: chỉ phần số dùng phông đơn cách, đơn vị ("tỷ", "tr/lượng") giữ phông chữ thường
function So({ t, className = "" }: { t: string; className?: string }) {
  const m = t.match(/^(.*[\d%])(\D*)$/);
  return (
    <span className={className}>
      <span className="so">{m ? m[1] : t}</span>
      {m?.[2]}
    </span>
  );
}

function DongTheGioi({ ds }: { ds: GiaTheGioi[] }) {
  if (!ds.length) return <p className="px-4 py-6 text-chu-phu">Chưa lấy được dữ liệu.</p>;
  return (
    <ul>
      {ds.map((x) => (
        <li key={x.ma} className="flex items-baseline gap-2 border-b border-vien px-4 py-1.5 last:border-b-0">
          <span className="font-medium whitespace-nowrap">{x.ten}</span>
          <span className="min-w-0 truncate text-[11px] text-chu-phu">{x.phu}</span>
          <span className="so ml-auto">{x.gia.toLocaleString("vi-VN", { maximumFractionDigits: x.gia >= 1000 ? 0 : 2 })}</span>
          <span className={`so w-16 shrink-0 text-right ${x.phanTram == null ? "" : mauTangGiam(x.phanTram)}`}>{x.phanTram == null ? "—" : phanTram(x.phanTram)}</span>
        </li>
      ))}
    </ul>
  );
}

const dau = (x: number) => (x > 0 ? "+" : x < 0 ? "−" : "");
const ngayNgan = (ymd: string) => ymd.slice(5).split("-").reverse().join("/");
const SU_KIEN_BO: LoaiSuKien[] = ["quyen-chon", "halving"]; // lịch riêng của tiền số

export async function BangDieuKhien() {
  await connection();
  const [bangGia, chiSo, nganh, tin, vang, tienSo, theGioi, khac] = await Promise.all([
    layBangGia(),
    layChiSo(),
    layNganh().catch(() => null),
    layTin().catch(() => null),
    layBangVang().catch(() => null),
    layTienSo().catch(() => null),
    layTheGioi().catch(() => null),
    layDanhSachKhac().catch(() => null),
  ]);
  const ds = bangGia.coPhieu;
  const [nenChiSo, baoChi] = await Promise.all([
    Promise.all(chiSo.map((cs) => layNenChiSo(cs.ma).catch(() => null))),
    layBaoChi(ds.map((c) => c.ma)).catch(() => []),
  ]);
  const coGD = ds.filter((c) => c.khoiLuong > 0);
  const soTang = coGD.filter((c) => c.phanTram > 0).length;
  const soGiam = coGD.filter((c) => c.phanTram < 0).length;
  const soDung = coGD.length - soTang - soGiam;
  const soTran = coGD.filter((c) => c.tran != null && c.gia >= c.tran).length;
  const soSan = coGD.filter((c) => c.giaSan != null && c.giaSan > 0 && c.gia <= c.giaSan).length;
  const tongGT = ds.reduce((s, c) => s + c.giaTri, 0);
  const nnCua = (c: CoPhieu) => (c.nnMua != null && c.nnBan != null ? c.nnMua - c.nnBan : null);
  const nnTong = ds.reduce((s, c) => s + (nnCua(c) ?? 0), 0);
  const vni = chiSo.find((c) => c.ma === "VNINDEX");

  // Điểm đóng góp vào VN-Index (ước tính theo vốn hoá, chưa tính free-float)
  const hose = ds.filter((c) => c.san === "HOSE" && c.vonHoa);
  const vonTruoc = (c: CoPhieu) => c.vonHoa! / (1 + c.phanTram / 100);
  const tongVonTruoc = hose.reduce((s, c) => s + vonTruoc(c), 0);
  const vniTruoc = vni ? vni.diem - vni.thayDoi : 0;
  const dongGop = hose
    .map((c) => ({ cp: c, diem: tongVonTruoc ? ((c.vonHoa! - vonTruoc(c)) / tongVonTruoc) * vniTruoc : 0 }))
    .sort((a, b) => b.diem - a.diem);
  const keoLen = dongGop.filter((x) => x.diem > 0).slice(0, 7);
  const deXuong = dongGop.filter((x) => x.diem < 0).slice(-7).reverse();
  const dinhGop = Math.max(0.01, ...[...keoLen, ...deXuong].map((x) => Math.abs(x.diem)));

  const theoNN = ds.map((c) => ({ cp: c, nn: nnCua(c) ?? 0 })).filter((x) => x.nn !== 0);
  const nnMua = [...theoNN].sort((a, b) => b.nn - a.nn).slice(0, 10);
  const nnBan = [...theoNN].sort((a, b) => a.nn - b.nn).slice(0, 10);
  const dinhNN = Math.max(1, ...[...nnMua, ...nnBan].slice(0, 20).map((x) => Math.abs(x.nn)));

  // Bản đồ ngành: 18 ngành lớn nhất, chia lần lượt thành 4 hàng. Kích thước ô theo căn bậc hai vốn hoá
  // để vài ngành rất lớn (bất động sản, ngân hàng) không chiếm trọn một hàng.
  const cacNganh = nganh ? tongHopNganh(ds, nganh).slice(0, 18) : [];
  const coO = (v: number) => Math.sqrt(v);
  const tongO = cacNganh.reduce((s, n) => s + coO(n.vonHoa), 0);
  const hang: (typeof cacNganh)[] = [[]];
  let daCo = 0;
  for (const n of cacNganh) {
    if (daCo >= (tongO / 4) * hang.length && hang.length < 4) hang.push([]);
    hang[hang.length - 1].push(n);
    daCo += coO(n.vonHoa);
  }

  // Chuỗi đóng cửa 1 năm cho biểu đồ chỉ số (điểm lưu nhân 1000)
  const chuoiChiSo: ChuoiChiSo[] = chiSo.flatMap((cs, i) => {
    const n = nenChiSo[i];
    return n ? [{ ma: cs.ma, ten: cs.ten, diem: n.nen.slice(-250).map((x) => ({ time: x.time, value: x.close / 1000 })) }] : [];
  });

  // Bản đồ nhiệt cổ phiếu: 100 mã vốn hoá lớn nhất và rổ VN30
  const vn30 = new Set(khac?.ro.VN30 ?? []);
  const top100 = new Set([...ds].sort((a, b) => (b.vonHoa ?? 0) - (a.vonHoa ?? 0)).slice(0, 100).map((c) => c.ma));
  const oMa: OMa[] = ds
    .filter((c) => c.vonHoa && (top100.has(c.ma) || vn30.has(c.ma)))
    .map((c) => {
      const khoa = nganh?.maNganh[c.ma];
      return {
        ma: c.ma,
        ten: c.ten,
        nganh: (khoa && nganh?.ten[khoa]) || c.nganh || "Khác",
        von: c.vonHoa!,
        gt: c.giaTri,
        pt: c.phanTram,
        top: top100.has(c.ma),
        vn30: vn30.has(c.ma),
      };
    });

  // Cổ phiếu nổi bật: tăng/giảm chỉ xét mã có giá trị giao dịch từ 1 tỷ để bỏ mã thanh khoản rất thấp
  const doiDong = (c: CoPhieu): DongNoiBat => ({ ma: c.ma, ten: c.ten, gia: c.gia, pt: c.phanTram, gt: c.giaTri, nn: nnCua(c), mau: mauGia(c) });
  const duThanhKhoan = coGD.filter((c) => c.giaTri >= 1e9);
  const bangNoiBat: Record<KhoaNoiBat, DongNoiBat[]> = {
    tang: [...duThanhKhoan].sort((a, b) => b.phanTram - a.phanTram).slice(0, 10).map(doiDong),
    giam: [...duThanhKhoan].sort((a, b) => a.phanTram - b.phanTram).slice(0, 10).map(doiDong),
    thanhKhoan: [...ds].sort((a, b) => b.giaTri - a.giaTri).slice(0, 10).map(doiDong),
    nnMua: nnMua.map((x) => doiDong(x.cp)),
    nnBan: nnBan.map((x) => doiDong(x.cp)),
  };

  // Độ rộng theo sàn
  const doRong = ["HOSE", "HNX", "UPCOM"].map((san) => {
    const nhom = coGD.filter((c) => c.san === san);
    const tang = nhom.filter((c) => c.phanTram > 0).length;
    const giam = nhom.filter((c) => c.phanTram < 0).length;
    return { san, tang, giam, dung: nhom.length - tang - giam };
  });
  const nghieng = soTang > soGiam * 1.3 ? "Nghiêng tăng" : soGiam > soTang * 1.3 ? "Nghiêng giảm" : "Cân bằng";

  // Thanh khoản HOSE: khối lượng phiên gần nhất của VN-Index so với trung bình 20 phiên trước đó
  const nenVni = nenChiSo[chiSo.findIndex((c) => c.ma === "VNINDEX")]?.nen.slice(-21) ?? [];
  const klNay = nenVni.at(-1)?.volume ?? 0;
  const klTb20 = nenVni.length > 1 ? nenVni.slice(0, -1).reduce((s, x) => s + x.volume, 0) / (nenVni.length - 1) : 0;
  const gtHose = ds.filter((c) => c.san === "HOSE").reduce((s, c) => s + c.giaTri, 0);

  const nnMuaTong = ds.reduce((s, c) => s + (c.nnMua ?? 0), 0);
  const nnBanTong = ds.reduce((s, c) => s + (c.nnBan ?? 0), 0);

  const theoPt = [...cacNganh].sort((a, b) => b.phanTram - a.phanTram);
  const nganhTang = theoPt.filter((n) => n.phanTram > 0).length;
  const nganhGiam = theoPt.filter((n) => n.phanTram < 0).length;

  // Phái sinh: basis là giá hợp đồng trừ VN30; đáo hạn lấy từ lịch sự kiện để tính cả ngày nghỉ lễ
  const homNay = homNayVN();
  const den = new Date(Date.parse(homNay) + 62 * 86400000).toISOString().slice(0, 10);
  const lich = suKienLich(homNay, den)
    .filter((e) => e.ngay >= homNay)
    .sort((a, b) => a.ngay.localeCompare(b.ngay));
  const vn30Cs = chiSo.find((c) => c.ma === "VN30");
  const hopDong = (khac?.phaiSinh ?? [])
    .filter((h) => h.ma.startsWith("VN30F"))
    .map((h) => ({ ...h, diem: h.gia / 1000, basis: vn30Cs ? h.gia / 1000 - vn30Cs.diem : null }));
  const f1m = hopDong.find((h) => h.ma === "VN30F1M");
  const daoHan = lich.find((e) => e.loai === "phai-sinh")?.ngay;
  let conPhien = 0;
  if (daoHan) for (let d = homNay; d < daoHan; d = ngayGiaoDichKe(d)) conPhien++;
  const suKienToi = lich.filter((e) => !SU_KIEN_BO.includes(e.loai)).slice(0, 7);

  // Điểm nhấn phiên: viết tự động từ số liệu, câu nào thiếu dữ liệu thì bỏ
  const my = (theGioi?.chiSo ?? []).filter((x) => x.phu === "Mỹ" && x.phanTram != null);
  const nnNoiBat = (nnTong >= 0 ? nnMua : nnBan).slice(0, 2);
  const diemNhan = [
    my.length ? { noi: `Phố Wall phiên gần nhất: ${my.map((x) => `${x.ten} ${phanTram(x.phanTram!)}`).join(", ")}.`, href: "#the-gioi", nhan: "Thế giới" } : null,
    theoNN.length
      ? {
          noi: `Khối ngoại ${nnTong >= 0 ? "mua" : "bán"} ròng ${trieuDong(Math.abs(nnTong))}, nhiều nhất ở ${nnNoiBat.map((x) => `${x.cp.ma} (${trieuDong(Math.abs(x.nn))})`).join(" và ")}.`,
          href: "#khoi-ngoai",
          nhan: "Khối ngoại",
        }
      : null,
    keoLen.length && deXuong.length
      ? {
          noi: `${keoLen[0].cp.ma} đóng góp nhiều nhất cho VN-Index (+${diem(keoLen[0].diem)} điểm), ${deXuong[0].cp.ma} ảnh hưởng tiêu cực nhất (−${diem(Math.abs(deXuong[0].diem))} điểm).`,
          href: "#tac-dong",
          nhan: "Tác động",
        }
      : null,
    theoPt.length
      ? {
          noi: `${nganhTang} ngành tăng, ${nganhGiam} ngành giảm. Mạnh nhất ${theoPt[0].ten} (${phanTram(theoPt[0].phanTram)}), yếu nhất ${theoPt[theoPt.length - 1].ten} (${phanTram(theoPt[theoPt.length - 1].phanTram)}).`,
          href: "/nganh",
          nhan: "Ngành",
        }
      : null,
  ].filter((x) => x != null);

  const tinQuanTrong = (tin?.tin ?? []).filter((t) => t.mucDo === "cao").slice(0, 8);
  const tinHienThi = tinQuanTrong.length >= 4 ? tinQuanTrong : (tin?.tin ?? []).slice(0, 8);

  const sjc = vang?.lichSu.find((d) => d.ma !== "the-gioi");
  const giaSjc = sjc?.diem.at(-1)?.value;
  const giaSjcTruoc = sjc?.diem.at(-2)?.value;

  const taiSanKhac = [
    ...(giaSjc
      ? [
          {
            ten: "Vàng miếng SJC",
            href: "/kim-loai-quy",
            gia: `${(giaSjc / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr/lượng`,
            pt: giaSjcTruoc ? ((giaSjc - giaSjcTruoc) / giaSjcTruoc) * 100 : 0,
          },
        ]
      : []),
    ...(vang ? [{ ten: "Vàng thế giới", href: "/kim-loai-quy", gia: `${usd(vang.theGioi.usdOz)} USD/oz`, pt: null }] : []),
    ...(tienSo ?? []).map((t) => ({ ten: t.ten, href: `/tai-san-so/${t.ma}`, gia: `${usd(t.gia)} USD`, pt: t.phanTram })),
  ];

  const capNhat = bangGia.phien
    ? `${bangGia.phien.gio} ${bangGia.phien.ngay.split("-").reverse().slice(0, 2).join("/")}`
    : new Date(bangGia.capNhat).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Dòng phiên: trạng thái + một câu tóm tắt có số */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl bg-nen-phu px-4 py-3">
        <DongHoPhien />
        {vni && (
          <p className="text-chu-phu">
            VN-Index{" "}
            <b className={`so font-semibold ${mauTangGiam(vni.phanTram)}`}>
              {diem(vni.diem)} {dau(vni.thayDoi)}
              {diem(Math.abs(vni.thayDoi))} ({phanTram(vni.phanTram)})
            </b>
            <span className="mx-2 text-vien">|</span>
            <b className="so font-semibold text-tang">{soTang}</b> tăng ·{" "}
            <b className="so font-semibold text-dung">{soDung}</b> đứng ·{" "}
            <b className="so font-semibold text-giam">{soGiam}</b> giảm
            <span className="mx-2 text-vien">|</span>
            GTGD <So t={tyDong(tongGT)} className="font-semibold text-chu" />
            <span className="mx-2 text-vien">|</span>
            Khối ngoại {nnTong >= 0 ? "mua" : "bán"} ròng{" "}
            <So t={trieuDong(Math.abs(nnTong))} className={`font-semibold ${nnTong >= 0 ? "text-tang" : "text-giam"}`} />
          </p>
        )}
      </div>

      {/* Dải chỉ số và hợp đồng phái sinh gần nhất */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {chiSo.map((cs) => (
          <Link
            key={cs.ma}
            href={cs.ma === "VNINDEX" ? "/chi-so" : `/chi-so/${cs.ma}`}
            className="the-noi group flex min-w-0 flex-col gap-2 rounded-2xl bg-nen-phu px-4 py-3 hover:bg-nen-noi"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-chu-phu group-hover:text-chu">{cs.ten}</p>
              <p className="so truncate text-[17px] font-semibold">{diem(cs.diem)}</p>
              <p className={`so text-[12px] ${mauTangGiam(cs.phanTram)}`}>
                {thayDoi(cs.thayDoi)} {phanTram(cs.phanTram)}
              </p>
            </div>
            <div className="mt-auto w-full min-w-0">
              <DuongNho diem={cs.lichSu} tang={cs.lichSu[cs.lichSu.length - 1] >= cs.lichSu[0]} />
            </div>
          </Link>
        ))}
        {f1m && (
          <Link
            href="/bieu-do?loai=ck&ma=VN30F1M"
            className="the-noi group flex min-w-0 flex-col gap-1 rounded-2xl bg-nen-phu px-4 py-3 hover:bg-nen-noi"
          >
            <p className="text-[11px] text-chu-phu group-hover:text-chu">VN30F1M</p>
            <p className="so truncate text-[17px] font-semibold">{diem(f1m.diem)}</p>
            {f1m.phanTram != null && <p className={`so text-[12px] ${mauTangGiam(f1m.phanTram)}`}>{phanTram(f1m.phanTram)}</p>}
            <p className="mt-auto pt-1 text-[11px] leading-snug text-chu-phu">
              {f1m.basis != null && (
                <>
                  Basis{" "}
                  <span className={`so ${mauTangGiam(f1m.basis)}`}>
                    {dau(f1m.basis)}
                    {diem(Math.abs(f1m.basis))}
                  </span>
                  <br />
                </>
              )}
              {daoHan && (
                <>
                  Đáo hạn <span className="so">{ngayNgan(daoHan)}</span>, còn <span className="so">{conPhien}</span> phiên
                </>
              )}
            </p>
          </Link>
        )}
      </div>

      {/* Biểu đồ chỉ số và điểm nhấn */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <O ten="Biểu đồ chỉ số" phu="đóng cửa theo phiên" href="/chi-so">
          <BieuDoChiSo ds={chuoiChiSo} />
        </O>
        <O ten="Điểm nhấn phiên" phu="tự động từ số liệu">
          <div className="flex-1 divide-y divide-vien">
            {vni && (
              <p className="p-4 leading-relaxed">
                VN-Index {vni.thayDoi >= 0 ? "tăng" : "giảm"} <b className="so">{diem(Math.abs(vni.thayDoi))}</b> điểm (
                <span className={`so ${mauTangGiam(vni.phanTram)}`}>{phanTram(vni.phanTram)}</span>) về <b className="so">{diem(vni.diem)}</b>, độ rộng{" "}
                {nghieng.toLowerCase()} với <span className="so">{soTang}</span> mã tăng và <span className="so">{soGiam}</span> mã giảm.
              </p>
            )}
            {diemNhan.map((x) => (
              <p key={x.nhan} className="px-4 py-3 leading-relaxed text-chu-phu">
                {x.noi}{" "}
                <a href={x.href} className="font-medium whitespace-nowrap text-nhan hover:underline">
                  {x.nhan} →
                </a>
              </p>
            ))}
          </div>
          <p className="border-t border-vien px-4 py-2 text-[11px] text-chu-phu">Không phải khuyến nghị đầu tư.</p>
        </O>
      </div>

      {/* Bốn ô sức khoẻ phiên */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <The nhan="Độ rộng" phu={nghieng}>
          <div className="mt-3 space-y-2.5">
            {doRong.map((r) => (
              <div key={r.san}>
                <p className="flex justify-between text-[11px]">
                  <span className="text-chu-phu">{r.san}</span>
                  <span className="so">
                    <span className="text-tang">{r.tang}</span> · <span className="text-dung">{r.dung}</span> · <span className="text-giam">{r.giam}</span>
                  </span>
                </p>
                <div className="mt-1 flex h-1.5 gap-0.5">
                  <div className="rounded-sm bg-tang" style={{ flex: r.tang }} />
                  <div className="rounded-sm bg-dung" style={{ flex: r.dung }} />
                  <div className="rounded-sm bg-giam" style={{ flex: r.giam }} />
                </div>
              </div>
            ))}
          </div>
        </The>
        <The nhan="Thanh khoản HOSE" phu={klTb20 > 0 ? `${Math.round((klNay / klTb20) * 100)}% TB 20 phiên` : undefined}>
          <So t={tyDong(gtHose)} className="mt-2 block text-[24px] font-bold" />
          {klTb20 > 0 && (
            <>
              <div className="relative mt-3 h-1.5 rounded-full bg-nen-noi">
                <div className="absolute inset-y-0 left-0 rounded-full bg-nhan" style={{ width: `${Math.min(100, (klNay / klTb20) * 50)}%` }} />
                <div className="absolute -top-1 left-1/2 h-3.5 w-px bg-chu" />
              </div>
              <p className="mt-2 text-[11px] text-chu-phu">So khối lượng phiên với trung bình 20 phiên trước (vạch giữa)</p>
            </>
          )}
        </The>
        <The nhan="Khối ngoại" phu={nnTong >= 0 ? "Mua ròng" : "Bán ròng"}>
          <So t={`${dau(nnTong)}${trieuDong(Math.abs(nnTong))}`} className={`mt-2 block text-[24px] font-bold ${nnTong >= 0 ? "text-tang" : "text-giam"}`} />
          <p className="mt-2 text-[11px] text-chu-phu">
            Mua <So t={trieuDong(nnMuaTong)} /> · Bán <So t={trieuDong(nnBanTong)} />
          </p>
          <p className="mt-1 truncate text-[11px] text-chu-phu">
            Mua ròng nhiều: <span className="text-tang">{nnMua.slice(0, 3).map((x) => x.cp.ma).join(", ")}</span>
          </p>
          <p className="truncate text-[11px] text-chu-phu">
            Bán ròng nhiều: <span className="text-giam">{nnBan.slice(0, 3).map((x) => x.cp.ma).join(", ")}</span>
          </p>
        </The>
        <The nhan="Ngành dẫn dắt" phu={`${nganhTang} tăng · ${nganhGiam} giảm`}>
          <ul className="mt-2 space-y-1">
            {[...theoPt.slice(0, 2), ...theoPt.slice(-2)].map((n) => (
              <li key={n.khoa}>
                <Link href={`/nganh/${n.khoa}`} className="flex items-baseline justify-between gap-2 hover:text-nhan">
                  <span className="truncate">{n.ten}</span>
                  <span className={`so ${mauTangGiam(n.phanTram)}`}>{phanTram(n.phanTram)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </The>
      </div>

      {/* Bản đồ nhiệt cổ phiếu */}
      <O ten="Bản đồ nhiệt thị trường" phu="gom theo ngành, màu theo % hôm nay" className="mt-3">
        <BanDoNhietMa ds={oMa} />
      </O>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Cột 1: bản đồ ngành + độ rộng */}
        <O ten="Bản đồ ngành" phu="cỡ ô theo vốn hoá, màu theo % hôm nay" href="/nganh">
          <div className="flex h-[380px] flex-1 flex-col gap-1 p-2">
            {hang.map((h, i) => (
              <div key={i} className="flex min-h-0 flex-1 gap-1">
                {h.map((n) => (
                  <Link
                    key={n.khoa}
                    href={`/nganh/${n.khoa}`}
                    title={`${n.ten}: ${phanTram(n.phanTram)} · ${n.soTang} tăng / ${n.soGiam} giảm`}
                    className="flex min-w-0 flex-col justify-end overflow-hidden rounded-md p-2 hover:outline hover:outline-2 hover:-outline-offset-2 hover:outline-chu"
                    style={{ flex: `${coO(n.vonHoa)} 1 0`, background: mauNhiet(n.phanTram) }}
                  >
                    <span className="truncate text-[11px] leading-tight">{n.ten}</span>
                    <span className="so truncate text-[12px] font-semibold">{phanTram(n.phanTram)}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 border-t border-vien px-3 py-2.5">
            <div className="flex h-2">
              <div className="bg-tran" style={{ flex: soTran }} />
              <div className="bg-tang" style={{ flex: soTang - soTran }} />
              <div className="bg-dung" style={{ flex: soDung }} />
              <div className="bg-giam" style={{ flex: soGiam - soSan }} />
              <div className="bg-san-gia" style={{ flex: soSan }} />
            </div>
            <span className="text-[12px] text-chu-phu">
              <span className="so">{coGD.length}</span> mã có giao dịch
            </span>
            <p className="col-span-2 flex gap-4 text-[12px]">
              {(
                [
                  ["Trần", soTran, "text-tran"],
                  ["Tăng", soTang, "text-tang"],
                  ["Đứng", soDung, "text-dung"],
                  ["Giảm", soGiam, "text-giam"],
                  ["Sàn", soSan, "text-san-gia"],
                ] as const
              ).map(([ten, so, mau]) => (
                <span key={ten} className={mau}>
                  {ten} <span className="so">{so}</span>
                </span>
              ))}
            </p>
          </div>
        </O>

        {/* Cột 2: tác động chỉ số + vàng, tài sản số */}
        <div className="flex min-w-0 flex-col gap-3">
          <O ten="Tác động lên VN-Index" phu="điểm, ước tính" id="tac-dong">
            <div className="grid grid-cols-2 gap-px bg-vien">
              {[keoLen, deXuong].map((nhom, k) => (
                <ul key={k} className="bg-nen-phu py-1.5">
                  {nhom.map((x) => (
                    <li key={x.cp.ma}>
                      <Link prefetch={false} href={`/co-phieu/${x.cp.ma}`} className="relative flex items-center px-3 py-[3px] hover:bg-nen-noi">
                        <span
                          className={`absolute inset-y-0.5 left-0 ${k === 0 ? "bg-tang/15" : "bg-giam/15"}`}
                          style={{ width: `${(Math.abs(x.diem) / dinhGop) * 100}%` }}
                        />
                        <span className="relative font-semibold">{x.cp.ma}</span>
                        <span className={`so relative ml-auto ${k === 0 ? "text-tang" : "text-giam"}`}>
                          {dau(x.diem)}
                          {Math.abs(x.diem).toLocaleString("vi-VN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </O>
          <O ten="Vàng và tài sản số" className="flex-1">
            <div className="grid flex-1 grid-cols-2 gap-px bg-vien">
              {taiSanKhac.map((x) => (
                <Link key={x.ten} href={x.href} className="bg-nen-phu px-4 py-3 hover:bg-nen-noi">
                  <p className="text-[11px] text-chu-phu">{x.ten}</p>
                  <So t={x.gia} className="mt-0.5 block text-[15px] font-semibold" />
                  {x.pt != null && <p className={`so text-[12px] ${mauTangGiam(x.pt)}`}>{phanTram(x.pt)}</p>}
                </Link>
              ))}
            </div>
          </O>
        </div>

        {/* Cột 3: khối ngoại + phái sinh */}
        <div className="flex min-w-0 flex-col gap-3">
          <O
            id="khoi-ngoai"
            ten="Khối ngoại"
            phu={
              <span className={nnTong >= 0 ? "text-tang" : "text-giam"}>
                ròng <So t={`${dau(nnTong)}${trieuDong(Math.abs(nnTong))}`} />
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-px bg-vien">
              {[nnMua, nnBan].map((nhom, k) => (
                <ul key={k} className="bg-nen-phu py-1.5">
                  {nhom.slice(0, 7).map((x) => (
                    <li key={x.cp.ma}>
                      <Link prefetch={false} href={`/co-phieu/${x.cp.ma}`} className="relative flex items-center px-3 py-[3px] hover:bg-nen-noi">
                        <span
                          className={`absolute inset-y-0.5 left-0 ${k === 0 ? "bg-tang/15" : "bg-giam/15"}`}
                          style={{ width: `${(Math.abs(x.nn) / dinhNN) * 100}%` }}
                        />
                        <span className="relative font-semibold">{x.cp.ma}</span>
                        <So t={trieuDong(Math.abs(x.nn))} className={`relative ml-auto ${k === 0 ? "text-tang" : "text-giam"}`} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </O>
          <O ten="Phái sinh" phu="basis so với VN30" className="flex-1">
            <ul>
              {hopDong.map((h) => (
                <li key={h.ma} className="border-b border-vien last:border-b-0">
                  <Link prefetch={false} href={`/bieu-do?loai=ck&ma=${h.ma}`} className="flex items-baseline gap-2 px-4 py-1.5 hover:bg-nen-noi">
                    <span className="font-semibold">{h.ma}</span>
                    <span className="so ml-auto">{diem(h.diem)}</span>
                    <span className={`so w-14 text-right ${h.phanTram == null ? "" : mauTangGiam(h.phanTram)}`}>{h.phanTram == null ? "—" : phanTram(h.phanTram)}</span>
                    <span className="so w-12 text-right text-chu-phu">
                      {h.basis == null ? "—" : `${dau(h.basis)}${Math.abs(h.basis).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </O>
        </div>
      </div>

      {/* Cổ phiếu nổi bật, thế giới, hàng hoá */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <O ten="Cổ phiếu nổi bật" href="/bo-loc">
          <CoPhieuNoiBat bang={bangNoiBat} />
        </O>
        <O ten="Chỉ số thế giới" phu="giá gần nhất" id="the-gioi">
          <DongTheGioi ds={theGioi?.chiSo ?? []} />
        </O>
        <O ten="Hàng hoá và tỷ giá" phu="hợp đồng gần nhất, tham khảo">
          <DongTheGioi ds={theGioi?.hangHoa ?? []} />
        </O>
      </div>

      {/* Sự kiện và tin thị trường */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <O ten="Sự kiện sắp tới" href="/lich-su-kien">
          <ul>
            {suKienToi.map((e) => (
              <li key={`${e.ngay}${e.tieuDe}`} className="flex items-baseline gap-3 border-b border-vien px-4 py-2 last:border-b-0">
                <span className="so w-11 shrink-0 text-chu-phu">{ngayNgan(e.ngay)}</span>
                <span className="h-2 w-2 shrink-0 self-center rounded-full" style={{ background: LOAI_SU_KIEN.find((l) => l.ma === e.loai)?.mau }} />
                <span className="min-w-0">{e.tieuDe}</span>
              </li>
            ))}
          </ul>
        </O>
        <O ten="Tin thị trường" phu="báo chí, mới nhất" href="/bao-chi">
          <ul>
            {baoChi.slice(0, 5).map((b) => (
              <DongTin key={b.link} b={b} anAnh />
            ))}
          </ul>
        </O>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2.55fr)_minmax(0,1fr)]">
        <O ten="Tin doanh nghiệp" phu={tinQuanTrong.length >= 4 ? "mức quan trọng cao" : "mới nhất"} href="/tin-tuc">
          <ul>
            {tinHienThi.map((t, i) => (
              <li key={i} className="flex gap-3 border-b border-vien px-3 py-1.5 last:border-b-0">
                <span className="so w-12 shrink-0 text-[12px] text-chu-phu">{ngayNgan(t.ngay)}</span>
                <Link prefetch={false} href={`/co-phieu/${t.ma}`} className="w-10 shrink-0 font-semibold hover:text-nhan">
                  {t.ma}
                </Link>
                <span className="min-w-0 truncate" title={t.tieuDe}>
                  {t.tieuDe}
                </span>
              </li>
            ))}
          </ul>
        </O>

        <O ten="Danh mục của bạn" href="/bang-gia">
          <TheoDoiGon
            coPhieu={ds.map(({ ma, gia, phanTram, tran, giaSan, thamChieu }) => ({ ma, gia, phanTram, tran, giaSan, thamChieu }))}
          />
        </O>
      </div>

      {/* Thanh trạng thái như phần mềm giao dịch */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 rounded-full bg-nen-phu px-5 py-2 text-[11px] text-chu-phu">
        <span className="flex items-center gap-1.5 text-nhan">
          <span className="cham-song h-1.5 w-1.5 rounded-full bg-nhan" />
          <span className="font-semibold tracking-wider">FINLO</span>
        </span>
        <span>
          Cập nhật <span className="so">{capNhat}</span>
        </span>
        <span>
          <span className="so">{ds.length.toLocaleString("vi-VN")}</span> mã
        </span>
        <span className="hidden sm:inline">
          Tra mã <kbd className="rounded border border-vien px-1 text-chu">/</kbd> hoặc{" "}
          <kbd className="rounded border border-vien px-1 text-chu">Ctrl K</kbd>
        </span>
        <span className="ml-auto hidden md:inline">Dữ liệu tham khảo, không phải khuyến nghị đầu tư</span>
      </div>
    </div>
  );
}
