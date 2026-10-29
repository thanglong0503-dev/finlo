import type { MetadataRoute } from "next";

// Khai báo ứng dụng web: trình duyệt cho phép "Cài Finlo" như một app riêng (máy tính, Android, iPhone)
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Finlo — Theo dõi đa lớp tài sản",
    short_name: "Finlo",
    description: "Chứng khoán, kim loại quý và tài sản số trên cùng một màn hình.",
    lang: "vi",
    start_url: "/?nguon=app",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["finance"],
    icons: [
      { src: "/app/finlo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app/finlo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app/finlo-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Bảng giá", url: "/bang-gia" },
      { name: "Biểu đồ kỹ thuật", url: "/bieu-do" },
      { name: "Bộ lọc cổ phiếu", url: "/bo-loc" },
    ],
  };
}
