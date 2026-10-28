// Khung mờ hiển thị trong lúc chờ dữ liệu, có hình dạng gần giống nội dung thật
// để trang hiện ra ngay và không bị "nhảy" khi dữ liệu về

export function KhoiMo({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-nen-phu ${className}`} />;
}

// Lưới các ô số liệu (thẻ chỉ số, thẻ tổng quan)
export function LuoiMo({ so = 4, cao = "h-24", cot = "md:grid-cols-4" }: { so?: number; cao?: string; cot?: string }) {
  return (
    <div className={`mt-6 grid grid-cols-2 gap-px border border-vien bg-vien ${cot}`}>
      {Array.from({ length: so }, (_, i) => (
        <div key={i} className="bg-nen p-4">
          <KhoiMo className="h-3 w-20" />
          <KhoiMo className={`mt-3 w-full ${cao === "h-24" ? "h-12" : cao}`} />
        </div>
      ))}
    </div>
  );
}

// Bảng nhiều dòng
export function BangMo({ dong = 10 }: { dong?: number }) {
  return (
    <div className="mt-6 border border-vien">
      <div className="border-b border-vien px-3 py-2.5">
        <KhoiMo className="h-3 w-32" />
      </div>
      {Array.from({ length: dong }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-vien px-3 py-3 last:border-b-0">
          <KhoiMo className="h-3 w-12" />
          <KhoiMo className="h-3 flex-1" />
          <KhoiMo className="h-3 w-16" />
          <KhoiMo className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

// Trang chỉ số: thanh chọn chỉ số, tiêu đề, biểu đồ và khung hiệu suất
export function KhungChoChiSo() {
  return (
    <>
      <KhoiMo className="mt-4 h-14" />
      <KhoiMo className="mt-6 h-16 w-64" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <KhoiMo className="h-[470px]" />
        <KhoiMo className="h-[470px]" />
      </div>
    </>
  );
}
