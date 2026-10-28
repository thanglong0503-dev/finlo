import { connection } from "next/server";

// Tạm thời: đo xem server Vercel có tải được dữ liệu Mofi không. Xoá sau khi chẩn đoán xong.
export async function GET() {
  await connection();
  const ketQua: Record<string, unknown> = {};
  for (const path of ["spot/d/VNM.json", "tong-hop/gia-moi-nhat.json"]) {
    const batDau = Date.now();
    try {
      const res = await fetch(`https://data.mofi.vn/${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const text = await res.text();
      ketQua[path] = { status: res.status, ms: Date.now() - batDau, bytes: text.length, dau: text.slice(0, 80) };
    } catch (e) {
      ketQua[path] = { loi: String(e), ms: Date.now() - batDau };
    }
  }
  return Response.json(ketQua);
}
