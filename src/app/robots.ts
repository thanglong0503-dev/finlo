import type { MetadataRoute } from "next";

// Cho công cụ tìm kiếm lập chỉ mục các trang, nhưng không vào /api; chặn hẳn các bot thu thập dữ liệu cho AI
const BOT_AI = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "PerplexityBot",
  "meta-externalagent",
  "Amazonbot",
  "cohere-ai",
  "Diffbot",
  "omgili",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: BOT_AI, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: "/api/" },
    ],
    host: "https://www.finlo.id.vn",
  };
}
