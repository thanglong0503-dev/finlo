"use client";

import { useState, type FormEvent } from "react";

// Không có máy chủ nhận thư: form chỉ soạn sẵn email rồi mở ứng dụng thư (hoặc Gmail) để người dùng tự gửi
export function FormDoiTac({ email, hinhThuc }: { email: string; hinhThuc: string[] }) {
  const [ten, setTen] = useState("");
  const [toChuc, setToChuc] = useState("");
  const [lienHe, setLienHe] = useState("");
  const [loai, setLoai] = useState(hinhThuc[0]);
  const [noiDung, setNoiDung] = useState("");
  const [daChep, setDaChep] = useState(false);

  const tieuDe = `[Đối tác Finlo] ${loai}${toChuc ? ` - ${toChuc}` : ""}`;
  const than = [
    `Họ tên: ${ten}`,
    `Tổ chức: ${toChuc || "(không ghi)"}`,
    `Email/điện thoại liên hệ: ${lienHe}`,
    `Hình thức hợp tác: ${loai}`,
    "",
    noiDung,
  ].join("\n");
  const q = `subject=${encodeURIComponent(tieuDe)}&body=${encodeURIComponent(than)}`;
  const du = ten.trim() && lienHe.trim() && noiDung.trim();

  const gui = (e: FormEvent) => {
    e.preventDefault();
    if (du) window.location.href = `mailto:${email}?${q}`;
  };
  const chep = async () => {
    try {
      await navigator.clipboard.writeText(`Gửi tới: ${email}\nTiêu đề: ${tieuDe}\n\n${than}`);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 2000);
    } catch {}
  };

  const o = "mt-1.5 w-full rounded-xl border border-vien bg-nen px-3.5 py-2.5 text-chu outline-none focus:border-chu";
  return (
    <form onSubmit={gui} className="mt-4 grid gap-4 rounded-3xl bg-nen-phu p-5 sm:grid-cols-2 sm:p-6">
      <label className="text-[14px] text-chu-phu">
        Họ tên
        <input required value={ten} onChange={(e) => setTen(e.target.value)} className={o} />
      </label>
      <label className="text-[14px] text-chu-phu">
        Tổ chức
        <input value={toChuc} onChange={(e) => setToChuc(e.target.value)} placeholder="Không bắt buộc" className={o} />
      </label>
      <label className="text-[14px] text-chu-phu">
        Email hoặc số điện thoại
        <input required value={lienHe} onChange={(e) => setLienHe(e.target.value)} className={o} />
      </label>
      <label className="text-[14px] text-chu-phu">
        Hình thức hợp tác
        <select value={loai} onChange={(e) => setLoai(e.target.value)} className={o}>
          {hinhThuc.map((h) => (
            <option key={h}>{h}</option>
          ))}
          <option>Khác</option>
        </select>
      </label>
      <label className="text-[14px] text-chu-phu sm:col-span-2">
        Nội dung đề xuất
        <textarea required rows={5} value={noiDung} onChange={(e) => setNoiDung(e.target.value)} className={o} />
      </label>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" disabled={!du} className="h-11 rounded-full bg-chu px-6 font-semibold text-nen hover:opacity-90 disabled:opacity-40">
          Mở ứng dụng thư
        </button>
        <a
          href={du ? `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(tieuDe)}&body=${encodeURIComponent(than)}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!du}
          className={`h-11 rounded-full bg-nen-noi px-6 leading-11 font-semibold text-chu ${du ? "hover:bg-vien" : "pointer-events-none opacity-40"}`}
        >
          Soạn bằng Gmail
        </a>
        <button type="button" onClick={chep} disabled={!du} className="h-11 rounded-full px-4 font-medium text-chu-phu hover:text-chu disabled:opacity-40">
          {daChep ? "Đã chép" : "Chép nội dung"}
        </button>
      </div>
    </form>
  );
}
