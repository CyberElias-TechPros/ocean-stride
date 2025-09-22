// @ts-nocheck
export default {
  server: {
    host: "::",
    port: 8080,
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