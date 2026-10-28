// Logo Finlo: chữ F trắng và chữ L xanh lá trên nền đen
// nenDen: vẽ cả ô nền đen (dùng trên nền sáng); bỏ nền khi đặt trên thanh đen
export function LogoFL({ kichThuoc = 28, nenDen = true }: { kichThuoc?: number; nenDen?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width={kichThuoc} height={kichThuoc} aria-hidden>
      {nenDen && <rect width="48" height="48" fill="#0B0F0D" />}
      <path d="M9 10h17v6h-11v5h8v5h-8v12h-6z" fill="#FFFFFF" />
      <path d="M28 10h6v22h6v6h-12z" fill="var(--nhan-sang)" />
    </svg>
  );
}

export function Logo({ nenDen = true, className = "" }: { nenDen?: boolean; className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoFL nenDen={nenDen} />
      <span className="text-lg font-bold tracking-tight">
        Fin<span className="text-nhan-sang">lo</span>
      </span>
    </span>
  );
}
