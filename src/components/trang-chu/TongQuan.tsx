// Bảng tổng quan thị trường trên trang chủ: phiên, chỉ số, ngành, dòng tiền, tin
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { DuongNho } from "@/components/DuongNho";
import { KhoiMo } from "@/components/KhungCho";
import { DongHoPhien } from "@/components/trang-chu/DongHoPhien";
import { TheoDoiGon } from "@/components/trang-chu/TheoDoiGon";
import { diem, mauGia, mauTangGiam, phanTram, thayDoi, trieuDong, tyDong, usd } from "@/lib/dinh-dang";
import { layBangGia, layBangVang, layChiSo, layNganh, layTienSo, layTin, type CoPhieu } from "@/lib/mofi";
import { mauNhiet, tongHopNganh } from "@/lib/nganh";

export function KhungChoTongQuan() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <KhoiMo className="h-12 rounded-2xl" />
      <div className="mt-3 grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <KhoiMo key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.55fr_1fr_1fr]">
        <KhoiMo className="h-[480px] rounded-2xl" />
        <KhoiMo className="h-[480px] rounded-2xl" />
        <KhoiMo className="h-[480px] rounded-2xl" />
      </div>
    </div>
  );
}

// Một ô trong lưới: thanh tiêu đề thấp, chữ thường, liên kết phụ bên phải
function O({ ten, phu, href, children, className = "" }: { ten: string; phu?: ReactNode; href?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col overflow-hidden rounded-2xl bg-nen-phu ${className}`}>
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

const dau = (x: number) => (x > 0 ? "+" : x < 0 ? "−" : "");

export async function BangDieuKhien() {
  await connection();
  const [bangGia, chiSo, nganh, tin, vang, tienSo] = await Promise.all([
    layBangGia(),
    layChiSo(),
    layNganh().catch(() => null),
    layTin().catch(() => null),
    layBangVang().catch(() => null),
    layTienSo().catch(() => null),
  ]);
  const ds = bangGia.coPhieu;
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

  const thanhKhoan = coGD.filter((c) => c.giaTri >= 10e9);
  const tangManh = [...thanhKhoan].sort((a, b) => b.phanTram - a.phanTram).slice(0, 7);
  const giamManh = [...thanhKhoan].sort((a, b) => a.phanTram - b.phanTram).slice(0, 7);

  const theoNN = ds.map((c) => ({ cp: c, nn: nnCua(c) ?? 0 })).filter((x) => x.nn !== 0);
  const nnMua = [...theoNN].sort((a, b) => b.nn - a.nn).slice(0, 7);
  const nnBan = [...theoNN].sort((a, b) => a.nn - b.nn).slice(0, 7);
  const dinhNN = Math.max(1, ...[...nnMua, ...nnBan].map((x) => Math.abs(x.nn)));

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

      {/* Dải chỉ số */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {chiSo.map((cs) => (
          <Link
            key={cs.ma}
            href={cs.ma === "VNINDEX" ? "/chi-so" : `/chi-so/${cs.ma}`}
            className="group flex items-center gap-3 rounded-2xl bg-nen-phu px-4 py-3 hover:bg-nen-noi"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-chu-phu group-hover:text-chu">{cs.ten}</p>
              <p className="so text-[17px] font-semibold">{diem(cs.diem)}</p>
              <p className={`so text-[12px] ${mauTangGiam(cs.phanTram)}`}>
                {thayDoi(cs.thayDoi)} {phanTram(cs.phanTram)}
              </p>
            </div>
            <div className="ml-auto w-24 shrink-0">
              <DuongNho diem={cs.lichSu} tang={cs.lichSu[cs.lichSu.length - 1] >= cs.lichSu[0]} />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Cột 1: bản đồ ngành + độ rộng */}
        <O ten="Bản đồ ngành" phu="cỡ ô theo vốn hoá, màu theo % hôm nay" href="/nganh">
          <div className="flex h-[380px] flex-col gap-1 p-2">
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

        {/* Cột 2: tác động chỉ số + tăng/giảm mạnh */}
        <div className="flex min-w-0 flex-col gap-3">
          <O ten="Tác động lên VN-Index" phu="điểm, ước tính">
            <div className="grid grid-cols-2 gap-px bg-vien">
              {[keoLen, deXuong].map((nhom, k) => (
                <ul key={k} className="bg-nen-phu py-1.5">
                  {nhom.map((x) => (
                    <li key={x.cp.ma}>
                      <Link href={`/co-phieu/${x.cp.ma}`} className="relative flex items-center px-3 py-[3px] hover:bg-nen-noi">
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
          <O ten="Biến động mạnh" phu="GTGD từ 10 tỷ" href="/bo-loc" className="flex-1">
            <div className="grid flex-1 grid-cols-2 gap-px bg-vien">
              {[tangManh, giamManh].map((nhom, k) => (
                <ul key={k} className="bg-nen-phu py-1.5">
                  {nhom.map((cp) => (
                    <li key={cp.ma}>
                      <Link href={`/co-phieu/${cp.ma}`} className="flex items-center gap-2 px-3 py-[3px] hover:bg-nen-noi">
                        <span className="font-semibold">{cp.ma}</span>
                        <span className={`so ml-auto ${mauGia(cp)}`}>{phanTram(cp.phanTram)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </O>
        </div>

        {/* Cột 3: khối ngoại + danh mục */}
        <div className="flex min-w-0 flex-col gap-3">
          <O
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
                  {nhom.map((x) => (
                    <li key={x.cp.ma}>
                      <Link href={`/co-phieu/${x.cp.ma}`} className="relative flex items-center px-3 py-[3px] hover:bg-nen-noi">
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
          <O ten="Tài sản khác" className="flex-1">
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
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2.55fr)_minmax(0,1fr)]">
        <O ten="Tin doanh nghiệp" phu={tinQuanTrong.length >= 4 ? "mức quan trọng cao" : "mới nhất"} href="/tin-tuc">
          <ul>
            {tinHienThi.map((t, i) => (
              <li key={i} className="flex gap-3 border-b border-vien px-3 py-1.5 last:border-b-0">
                <span className="so w-12 shrink-0 text-[12px] text-chu-phu">{t.ngay.slice(5).split("-").reverse().join("/")}</span>
                <Link href={`/co-phieu/${t.ma}`} className="w-10 shrink-0 font-semibold hover:text-nhan">
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
