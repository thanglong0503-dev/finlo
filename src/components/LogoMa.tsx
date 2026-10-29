// Logo doanh nghiệp tròn trên nền trắng; mã chưa có logo thì hiện chữ viết tắt
export function LogoMa({ ma, url, co = 24 }: { ma: string; url?: string | null; co?: number }) {
  const kieu = { width: co, height: co };
  if (!url)
    return (
      <span
        style={{ ...kieu, fontSize: Math.max(8, co * 0.32) }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-nen-noi font-bold text-chu-phu"
        aria-hidden
      >
        {ma.slice(0, 3)}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ảnh nhỏ từ máy chủ ngoài, không cần tối ưu qua Vercel
    <img
      src={url}
      alt=""
      width={co}
      height={co}
      loading="lazy"
      decoding="async"
      style={kieu}
      className="inline-block shrink-0 rounded-full bg-white object-contain p-[2px]"
    />
  );
}
