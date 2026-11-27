import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Trình duyệt giữ trang đã xem 5 phút: chuyển qua lại giữa các tab không phải tải lại
    // (dữ liệu trên server cũng chỉ làm mới mỗi phút nên không mất tính cập nhật)
    staleTimes: { dynamic: 300, static: 300 },
  },
  // Giữ một địa chỉ chính là www (trước đây Vercel tự chuyển, nay host khác thì tự làm trong app)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "finlo.id.vn" }],
        destination: "https://www.finlo.id.vn/:path*",
        permanent: true,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
