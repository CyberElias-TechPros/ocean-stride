export default {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [],
  resolve: {
    alias: {
      "@": "./src",
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
};