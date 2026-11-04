import Link from "next/link";
import { NutTaiAnhBanTin } from "@/components/NutTaiAnhBanTin";
import { ngayDayDu, ngayNgan, type BanTin, type MaBanTin, type NganhBanTin, type NgoaiMa } from "@/lib/cuoi-phien";
import { diem, giaNghin, mauTangGiam, phanTram, thayDoi, tyDong } from "@/lib/dinh-dang";

function The({ tieuDe, children }: { tieuDe: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-nen-phu p-4">
      <h2 className="font-semibold">{tieuDe}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

const LienKetMa = ({ ma }: { ma: string }) => (
  <Link href={`/co-phieu/${ma}`} prefetch={false} className="font-semibold text-nhan hover:underline">
    {ma}
  </Link>
);

const Dong = ({ trai, phai, mau = "" }: { trai: React.ReactNode; phai: string; mau?: string }) => (
  <li className="flex justify-between gap-3 py-1">
    <span className="min-w-0 truncate">{trai}</span>
    <span className={`shrink-0 tabular-nums ${mau}`}>{phai}</span>
  </li>
);

const DsNganh = ({ ds }: { ds: NganhBanTin[] }) => (
  <ul>{ds.length ? ds.map((n) => <Dong key={n.ten} trai={n.ten} phai={phanTram(n.phanTram)} mau={mauTangGiam(n.phanTram)} />) : <li className="py-1 text-chu-phu">Không có ngành nào</li>}</ul>
);

const DsMa = ({ ds, giaTri = false }: { ds: MaBanTin[]; giaTri?: boolean }) => (
  <ul>
    {ds.map((m) => (
      <Dong key={m.ma} trai={<><LienKetMa ma={m.ma} /> <span className="text-chu-phu tabular-nums">{giaNghin(m.gia)}</span></>} phai={giaTri ? tyDong(m.giaTri) : phanTram(m.phanTram)} mau={giaTri ? "" : mauTangGiam(m.phanTram)} />
    ))}
  </ul>
);

const DsNgoai = ({ ds }: { ds: NgoaiMa[] }) => (
  <ul>{ds.map((m) => <Dong key={m.ma} trai={<LienKetMa ma={m.ma} />} phai={tyDong(Math.abs(m.rong) * 1e6)} mau={mauTangGiam(m.rong)} />)}</ul>
);

const MAU_HUONG = { tang: "text-tang", giam: "text-giam", trung: "text-dung" } as const;

export function BanTinNoiDung({ b, cacNgay }: { b: BanTin; cacNgay: string[] }) {
  const { tang, giam, dung, tran, san } = b.doRong;
  const tong = Math.max(1, tang + giam + dung);
  const rong = b.ngoai.mua - b.ngoai.ban;
  const viTri = cacNgay.indexOf(b.ngay);
  const moiHon = cacNgay[viTri - 1];
  const cuHon = cacNgay[viTri + 1];

  return (
    <article className="mt-5 space-y-5">
      <header>
        <p className="text-[12px] text-chu-phu tabular-nums">Phiên {ngayDayDu(b.ngay)}</p>
        <h2 className="mt-1 text-2xl leading-[1.3] font-bold tracking-[-0.02em]">{b.tieuDe}</h2>
        <div className="mt-3 max-w-3xl space-y-2 text-chu-phu">
          {b.doan.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </div>
        <div className="mt-4">
          <NutTaiAnhBanTin banTin={b} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {b.chiSo.map((c) => (
          <div key={c.ma} className="rounded-2xl bg-nen-phu p-4">
            <p className="text-chu-phu">{c.ten}</p>
            <p className="mt-1 text-[22px] font-bold tabular-nums">{diem(c.diem)}</p>
            <p className={`text-[12px] tabular-nums ${mauTangGiam(c.phanTram)}`}>
              {thayDoi(c.thayDoi)} ({phanTram(c.phanTram)})
            </p>
          </div>
        ))}
      </div>

      <The tieuDe="Độ rộng thị trường">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${tang} mã tăng, ${dung} mã đứng giá, ${giam} mã giảm`}>
          <span className="bg-tang" style={{ width: `${(tang / tong) * 100}%` }} />
          <span className="bg-dung" style={{ width: `${(dung / tong) * 100}%` }} />
          <span className="bg-giam" style={{ width: `${(giam / tong) * 100}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 tabular-nums">
          <span className="text-tang">{tang} tăng ({tran} trần)</span>
          <span className="text-dung">{dung} đứng giá</span>
          <span className="text-giam">{giam} giảm ({san} sàn)</span>
          <span className="text-chu-phu">Giá trị giao dịch {tyDong(b.giaTri)}{b.soVoiTb != null ? ` (${phanTram(b.soVoiTb)} so với trung bình)` : ""}</span>
        </div>
      </The>

      <div className="grid gap-4 md:grid-cols-2">
        <The tieuDe="Ngành tăng tốt nhất"><DsNganh ds={b.nganhTang} /></The>
        <The tieuDe="Ngành giảm mạnh nhất"><DsNganh ds={b.nganhGiam} /></The>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <The tieuDe="Mã tăng mạnh"><DsMa ds={b.maTang} /></The>
        <The tieuDe="Mã giảm mạnh"><DsMa ds={b.maGiam} /></The>
        <The tieuDe="Giao dịch lớn nhất"><DsMa ds={b.maGiaTri} giaTri /></The>
      </div>

      <The tieuDe={`Khối ngoại ${rong >= 0 ? "mua" : "bán"} ròng ${tyDong(Math.abs(rong) * 1e6)}`}>
        <p className="text-chu-phu tabular-nums">Mua {tyDong(b.ngoai.mua * 1e6)} · Bán {tyDong(b.ngoai.ban * 1e6)}</p>
        <div className="mt-2 grid gap-x-8 gap-y-3 md:grid-cols-2">
          <div>
            <p className="text-[12px] text-chu-phu">Mua ròng nhiều nhất</p>
            <DsNgoai ds={b.ngoai.muaRong} />
          </div>
          <div>
            <p className="text-[12px] text-chu-phu">Bán ròng nhiều nhất</p>
            <DsNgoai ds={b.ngoai.banRong} />
          </div>
        </div>
        <Link href="/dong-tien-ngoai" className="mt-2 inline-block text-chu-phu hover:text-nhan">
          Xem dòng tiền nhiều phiên →
        </Link>
      </The>

      {b.tinHieu && b.tinHieu.length > 0 && (
        <The tieuDe="Tín hiệu kỹ thuật của phiên">
          <ul className="divide-y divide-vien">
            {b.tinHieu.map((t) => (
              <li key={t.k} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <Link href={`/quet-tin-hieu?loai=${t.k}`} prefetch={false} className={`font-semibold hover:underline ${MAU_HUONG[t.huong]}`}>
                  {t.ten}
                </Link>
                <span className="text-[12px] text-chu-phu tabular-nums">{t.so} mã</span>
                <span className="flex flex-wrap gap-x-2">
                  {t.ma.map((m) => (
                    <LienKetMa key={m} ma={m} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </The>
      )}

      <nav className="flex justify-between gap-3" aria-label="Các phiên khác">
        {cuHon ? <Link href={`/ban-tin/${cuHon}`} prefetch={false} className="text-chu-phu hover:text-nhan">← Phiên {ngayNgan(cuHon)}</Link> : <span />}
        {moiHon && <Link href={`/ban-tin/${moiHon}`} prefetch={false} className="text-chu-phu hover:text-nhan">Phiên {ngayNgan(moiHon)} →</Link>}
      </nav>

      <section>
        <h2 className="font-semibold">Các bản tin trước</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {cacNgay.map((n) => (
            <li key={n}>
              <Link href={`/ban-tin/${n}`} prefetch={false} aria-current={n === b.ngay ? "page" : undefined} className={`inline-flex h-8 items-center rounded-full px-3 tabular-nums ${n === b.ngay ? "bg-chu font-semibold text-nen" : "bg-nen-noi text-chu-phu hover:text-chu"}`}>
                {ngayNgan(n)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[12px] text-chu-phu">
        Bản tin do máy tổng hợp từ số liệu chốt phiên của Mofi theo quy tắc cố định, cập nhật buổi tối mỗi ngày giao dịch. Biến động ngành tính bình quân theo vốn hoá. Chỉ để tham khảo, không phải khuyến nghị đầu tư.
      </p>
    </article>
  );
}
