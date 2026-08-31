// @ts-nocheck
export default {
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [".e2b.app"],
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
    headers: {
      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' http://localhost:8787 https://accounts.google.com https://*.googleapis.com",
        "img-src 'self' data: https: blob:",
        "frame-src 'self' https://accounts.google.com"
      ].join('; ')
    }
  },
  plugins: [],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    target: "esnext",
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
};
