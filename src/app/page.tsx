import Link from "next/link";
import { connection } from "next/server";
import QRCode from "qrcode";
import { Suspense, type ReactNode } from "react";
import { DuongNho } from "@/components/DuongNho";
import { KhoiMo } from "@/components/KhungCho";
import { CaiDatApp } from "@/components/trang-chu/CaiDatApp";
import { BangDieuKhien, KhungChoTongQuan } from "@/components/trang-chu/TongQuan";
import { diem, giaNghin, phanTram } from "@/lib/dinh-dang";
import { layBangGia, layChiSo } from "@/lib/mofi";

// Trang chủ: giới thiệu Finlo, bảng tổng quan thị trường trực tiếp, các lớp tài sản, cài ứng dụng và hỏi đáp
export default function TrangChu() {
  return (
    <>
      <GioiThieu />

      <section className="pt-6 pb-20">
        <TieuDeMuc
          ten="Thị trường hôm nay"
          moTa="Số liệu phiên cập nhật mỗi phút trong giờ giao dịch."
          href="/bang-gia"
          nhanLink="Mở bảng giá"
        />
        <Suspense fallback={<KhungChoTongQuan />}>
          <BangDieuKhien />
        </Suspense>
      </section>

      <LyDo />
      <LopTaiSan />
      <CaiApp />
      <HoiDap />
      <KetThuc />
    </>
  );
}

function TieuDeMuc({ ten, moTa, href, nhanLink }: { ten: string; moTa?: string; href?: string; nhanLink?: string }) {
  return (
    <div className="mx-auto mb-8 flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4">
      <div>
        <h2 className="text-[32px] leading-tight font-bold tracking-[-0.03em] sm:text-[40px]">{ten}</h2>
        {moTa && <p className="mt-2 text-[16px] text-chu-phu">{moTa}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex h-10 items-center rounded-full border border-vien px-5 font-semibold hover:bg-nen-phu">
          {nhanLink} →
        </Link>
      )}
    </div>
  );
}

// ---------------- Giới thiệu ----------------

function GioiThieu() {
  return (
    <section className="relative overflow-hidden">
      {/* Quầng sáng xanh mờ phía sau khung điện thoại */}
      <div
        className="pointer-events-none absolute top-10 right-[-10%] h-[520px] w-[620px] rounded-full opacity-25 blur-[120px]"
        style={{ background: "var(--nhan)" }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-16 lg:grid-cols-[1.1fr_1fr] lg:pt-20 lg:pb-24">
        <div>
          <h1 className="text-[40px] leading-[1.2] font-bold tracking-[-0.035em] sm:text-[56px] lg:text-[64px]">
            Mọi lớp tài sản.
            <br />
            Một màn hình.
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-chu-phu sm:text-[19px]">
            Bảng giá cập nhật mỗi phút, phân tích kỹ thuật, định giá FL và hồ sơ doanh nghiệp cho hơn 1.500 mã chứng
            khoán, cùng vàng và tài sản số. Miễn phí, không cần tài khoản.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/bang-gia"
              className="inline-flex h-12 items-center rounded-full bg-chu px-7 text-[15px] font-semibold text-nen hover:bg-nhan hover:text-white"
            >
              Mở bảng giá
            </Link>
            <a
              href="#cai-app"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-nen-noi px-7 text-[15px] font-semibold hover:bg-vien"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="4" y="1.5" width="8" height="13" rx="2" />
                <path d="M7 12h2" strokeLinecap="round" />
              </svg>
              Cài ứng dụng
            </a>
          </div>
          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
            {[
              ["1.500+", "mã cổ phiếu"],
              ["60 giây", "làm mới bảng giá"],
              ["0 đồng", "không thu phí"],
            ].map(([so, nhan]) => (
              <div key={nhan}>
                <dt className="text-[24px] font-bold tracking-[-0.03em] sm:text-[28px]">{so}</dt>
                <dd className="mt-1 text-chu-phu">{nhan}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Suspense fallback={<KhungDienThoai>{<KhoiMo className="m-4 h-[480px] rounded-2xl" />}</KhungDienThoai>}>
          <DienThoaiMau />
        </Suspense>
      </div>
    </section>
  );
}

function KhungDienThoai({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[340px] lg:mr-0">
      <div className="rounded-[46px] border border-vien bg-nen-noi p-2.5 shadow-[0_40px_120px_-30px_rgba(25,194,107,0.35)]">
        <div className="h-[600px] overflow-hidden rounded-[38px] bg-nen">{children}</div>
      </div>
    </div>
  );
}

// Khung điện thoại hiển thị số liệu thật: VN-Index và các mã vốn hoá lớn nhất
async function DienThoaiMau() {
  await connection();
  const [bangGia, chiSo] = await Promise.all([layBangGia(), layChiSo()]);
  const vni = chiSo.find((c) => c.ma === "VNINDEX");
  const ds = [...bangGia.coPhieu].sort((a, b) => (b.vonHoa ?? 0) - (a.vonHoa ?? 0)).slice(0, 6);
  return (
    <KhungDienThoai>
      <div className="flex items-center justify-between px-6 pt-4 text-[11px] font-semibold">
        <span>{bangGia.phien?.gio ?? ""}</span>
        <span className="h-5 w-20 rounded-full bg-nen-noi" />
        <span className="text-chu-phu">Finlo</span>
      </div>
      <div className="px-5 pt-5">
        <p className="text-[20px] font-bold">Thị trường</p>
        {vni && (
          <div className="mt-3 rounded-2xl bg-nen-phu p-4">
            <p className="text-[12px] text-chu-phu">VN-Index</p>
            <div className="flex items-end justify-between">
              <p className="so text-[24px] font-semibold">{diem(vni.diem)}</p>
              <p className={`so text-[13px] ${vni.phanTram >= 0 ? "text-tang" : "text-giam"}`}>{phanTram(vni.phanTram)}</p>
            </div>
            <div className="mt-2">
              <DuongNho diem={vni.lichSu} tang={vni.lichSu[vni.lichSu.length - 1] >= vni.lichSu[0]} />
            </div>
          </div>
        )}
        <p className="mt-5 mb-1 text-[12px] text-chu-phu">Vốn hoá lớn nhất</p>
        <ul>
          {ds.map((cp) => (
            <li key={cp.ma} className="flex items-center gap-3 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nen-noi text-[10px] font-bold">
                {cp.ma.slice(0, 3)}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{cp.ma}</span>
                <span className="block truncate text-[11px] text-chu-phu">{cp.san}</span>
              </span>
              <span className="so ml-auto text-[13px]">{giaNghin(cp.gia)}</span>
              <span
                className={`so w-[68px] rounded-lg py-1 text-center text-[12px] font-medium text-white ${
                  cp.phanTram > 0 ? "bg-tang" : cp.phanTram < 0 ? "bg-giam" : "bg-dung"
                }`}
              >
                {phanTram(cp.phanTram)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </KhungDienThoai>
  );
}

// ---------------- Vì sao Finlo ----------------

const BIEU_TUONG: Record<string, ReactNode> = {
  nhanh: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
  chiBao: (
    <>
      <path d="M3 17l5-5 4 3 7-8" />
      <path d="M15 7h4v4" />
    </>
  ),
  sau: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  mienPhi: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0" />
    </>
  ),
};

function LyDo() {
  const ds = [
    { bt: "nhanh", ten: "Cập nhật mỗi phút", moTa: "Bảng giá, chỉ số và khối ngoại làm mới liên tục trong giờ giao dịch. Tài sản số theo thời gian thực." },
    { bt: "chiBao", ten: "Chỉ báo riêng FL", moTa: "FL Xu hướng, FL Dòng tiền, FL Vùng giá và FL Giá trị, thiết kế riêng cho thị trường Việt Nam." },
    { bt: "sau", ten: "Phân tích sâu từng mã", moTa: "Hồ sơ doanh nghiệp, báo cáo tài chính, so sánh ngành và giao dịch nội bộ trong một trang." },
    { bt: "mienPhi", ten: "Miễn phí, riêng tư", moTa: "Không cần đăng ký. Danh mục theo dõi lưu ngay trên máy bạn, không gửi đi đâu." },
  ];
  return (
    <section className="py-20">
      <TieuDeMuc ten="Vì sao chọn Finlo" moTa="Công cụ của nhà đầu tư cá nhân, gọn và nhanh." />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {ds.map((x) => (
          <div key={x.ten}>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-nhan-nhat text-nhan">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {BIEU_TUONG[x.bt]}
              </svg>
            </span>
            <h3 className="mt-5 text-[18px] font-bold">{x.ten}</h3>
            <p className="mt-2 leading-relaxed text-chu-phu">{x.moTa}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------- Các lớp tài sản ----------------

function LopTaiSan() {
  const ds = [
    { ten: "Chứng khoán", moTa: "Hơn 1.500 mã HOSE, HNX, UPCOM với bảng giá, bộ lọc và biểu đồ kỹ thuật.", href: "/bang-gia", nut: "Xem bảng giá" },
    { ten: "Biểu đồ kỹ thuật", moTa: "Biểu đồ tương tác với chỉ báo phổ biến và bộ chỉ báo FL của Finlo.", href: "/bieu-do", nut: "Mở biểu đồ" },
    { ten: "Tài sản số", moTa: "Bitcoin, Ethereum và top 30 theo vốn hoá, giá và sổ lệnh trực tiếp.", href: "/tai-san-so", nut: "Xem tài sản số" },
    { ten: "Kim loại quý", moTa: "Vàng miếng, vàng nhẫn của các thương hiệu lớn và vàng thế giới.", href: "/kim-loai-quy", nut: "Xem giá vàng" },
  ];
  return (
    <section className="py-20">
      <TieuDeMuc ten="Mọi thứ bạn cần để theo dõi thị trường" />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {ds.map((x, i) => (
          <Link
            key={x.ten}
            href={x.href}
            className="group flex flex-col rounded-3xl border border-vien bg-nen-phu p-7 transition-colors hover:border-nhan/50"
          >
            <span className="chu-vien-ro text-[64px] leading-none font-bold tracking-[-0.04em] transition-colors group-hover:[-webkit-text-stroke-color:var(--nhan)]">
              0{i + 1}
            </span>
            <h3 className="mt-4 text-[22px] font-bold tracking-[-0.02em]">{x.ten}</h3>
            <p className="mt-2 flex-1 leading-relaxed text-chu-phu">{x.moTa}</p>
            <span className="mt-8 inline-flex h-10 w-fit items-center rounded-full bg-nen-noi px-5 font-semibold group-hover:bg-chu group-hover:text-nen">
              {x.nut}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------- Cài ứng dụng ----------------

async function CaiApp() {
  // Mã QR mở trang chủ trên điện thoại để cài; tạo sẵn lúc build
  const qr = await QRCode.toString("https://www.finlo.id.vn/?nguon=qr#cai-app", {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  return (
    <section id="cai-app" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-12 overflow-hidden rounded-[32px] border border-vien bg-nen-phu p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:p-16">
          <div>
            <h2 className="text-[32px] leading-tight font-bold tracking-[-0.03em] sm:text-[44px]">
              Finlo trên máy tính
              <br />
              và điện thoại
            </h2>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-chu-phu">
              Cài Finlo như một ứng dụng riêng: mở từ màn hình chính hoặc thanh tác vụ, cửa sổ gọn không có thanh trình
              duyệt. Không cần kho ứng dụng, luôn là bản mới nhất.
            </p>
            <ul className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
              {["Mở nhanh như app", "Không tốn dung lượng", "Windows, macOS, Android, iPhone", "Tự cập nhật"].map((x) => (
                <li key={x} className="flex items-center gap-2.5">
                  <svg viewBox="0 0 16 16" width="16" height="16" className="shrink-0 text-nhan" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {x}
                </li>
              ))}
            </ul>
            <div className="mt-9">
              <CaiDatApp />
            </div>
          </div>

          <div className="mx-auto w-fit text-center">
            <div className="rounded-3xl bg-white p-5">
              <div className="h-44 w-44 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
            </div>
            <p className="mt-4 font-semibold">Quét để mở trên điện thoại</p>
            <p className="mt-1 text-[12px] text-chu-phu">Rồi chọn &quot;Thêm vào màn hình chính&quot;</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------- Hỏi đáp ----------------

function HoiDap() {
  const ds = [
    {
      h: "Dữ liệu của Finlo lấy từ đâu?",
      d: "Giá chứng khoán, chỉ số, báo cáo tài chính và tin doanh nghiệp lấy từ kho dữ liệu Mofi. Tài sản số lấy trực tiếp từ Binance. Giá vàng tổng hợp từ các thương hiệu lớn.",
    },
    {
      h: "Giá có trễ không?",
      d: "Bảng giá cổ phiếu làm mới mỗi phút trong giờ giao dịch, nên có thể chậm hơn bảng điện của công ty chứng khoán vài chục giây. Tài sản số cập nhật theo thời gian thực.",
    },
    {
      h: "Các chỉ báo FL là gì?",
      d: "Là bộ chỉ báo do Finlo thiết kế: FL Xu hướng chấm điểm xu hướng, FL Dòng tiền đo tiền vào/ra, FL Vùng giá báo phá vỡ, FL Giá trị ước tính vùng rẻ/đắt theo lịch sử định giá của chính mã.",
    },
    {
      h: "Finlo có thu phí hay cần tài khoản không?",
      d: "Không. Mọi tính năng đều miễn phí và dùng được ngay. Danh mục theo dõi được lưu trong trình duyệt của bạn.",
    },
    {
      h: "Thông tin trên Finlo có phải khuyến nghị đầu tư?",
      d: "Không. Số liệu và tín hiệu chỉ để tham khảo; bạn tự chịu trách nhiệm với quyết định đầu tư của mình.",
    },
  ];
  return (
    <section className="py-20">
      <TieuDeMuc ten="Câu hỏi thường gặp" />
      <div className="mx-auto max-w-7xl space-y-3 px-4">
        {ds.map((x) => (
          <details key={x.h} className="group rounded-2xl bg-nen-phu px-6 open:pb-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
              {x.h}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nen-noi transition-transform group-open:rotate-45">
                <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M6 1v10M1 6h10" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <p className="max-w-3xl leading-relaxed text-chu-phu">{x.d}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function KetThuc() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-28 text-center">
      {/* Chữ Finlo viền nét cỡ lớn làm nền */}
      <span
        className="chu-vien-nen pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-[28vw] leading-none font-bold tracking-[-0.05em] select-none lg:text-[300px]"
        aria-hidden
      >
        Finlo
      </span>
      <h2 className="relative mx-auto max-w-3xl text-[36px] leading-tight font-bold tracking-[-0.035em] sm:text-[52px]">
        Bắt đầu theo dõi thị trường ngay hôm nay
      </h2>
      <div className="relative mt-9 flex flex-wrap justify-center gap-3">
        <Link
          href="/bang-gia"
          className="inline-flex h-12 items-center rounded-full bg-chu px-8 text-[15px] font-semibold text-nen hover:bg-nhan hover:text-white"
        >
          Mở bảng giá
        </Link>
        <Link href="/bo-loc" className="inline-flex h-12 items-center rounded-full bg-nen-noi px-8 text-[15px] font-semibold hover:bg-vien">
          Lọc cổ phiếu
        </Link>
      </div>
    </section>
  );
}
