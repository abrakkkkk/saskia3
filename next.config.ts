import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // A Vercel restaurava o cache do Turbopack de um deploy anterior e servia o globals.css antigo com o JS novo.
  experimental: { turbopackFileSystemCacheForBuild: false },
  // htmlparser2 (dependência do sanitize-html) é ESM puro: externo, o require() falha no Node da Vercel.
  transpilePackages: ["sanitize-html", "htmlparser2", "domhandler", "domutils", "domelementtype", "entities"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-src 'self' https://drive.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // Os PDFs do acervo abrem em prévia (iframe) dentro do próprio sistema; a regra acima proíbe qualquer moldura.
        // Mais específica e depois da geral: vence nas chaves repetidas.
        source: "/api/documentos/:slug",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Só a moldura: qualquer default-src/object-src aqui impede o leitor de PDF do Chrome de abrir o arquivo.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
