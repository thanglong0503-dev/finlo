import { connection } from "next/server";
import { dangKyGia } from "@/lib/tram-gia";

// Luồng giá trực tiếp (Server-Sent Events): giữ kết nối mở, phút nào Mofi có ảnh chụp mới thì đẩy ngay phần đổi.
// Chỉ dùng được trên máy chủ chạy liên tục (Vibe Host). Trên Vercel trả 204 để trình duyệt quay về hỏi định kỳ.
export async function GET(req: Request) {
  await connection();
  if (process.env.VERCEL) return new Response(null, { status: 204 });

  const tu = new URL(req.url).searchParams.get("tu");
  const ma = new TextEncoder();
  let huy = () => {};

  const luong = new ReadableStream<Uint8Array>({
    start(dk) {
      const gui = (tin: string) => {
        try {
          dk.enqueue(ma.encode(tin));
        } catch {
          huy();
        }
      };
      // Báo trình duyệt chờ 5 giây trước khi tự nối lại nếu mất kết nối
      gui("retry: 5000\n\n");
      const boNghe = dangKyGia(gui, tu);
      // Gửi dòng chú thích mỗi 25 giây để proxy không cắt kết nối im lặng
      const nhip = setInterval(() => gui(": ping\n\n"), 25_000);
      huy = () => {
        clearInterval(nhip);
        boNghe();
        try {
          dk.close();
        } catch {
          // Luồng đã đóng
        }
      };
      req.signal.addEventListener("abort", () => huy(), { once: true });
    },
    cancel() {
      huy();
    },
  });

  return new Response(luong, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
