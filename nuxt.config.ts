import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: "2025-05-02",
  css: ["~/assets/css/tailwind.css"],
  modules: [
    "@nuxtjs/tailwindcss",
    "@pinia/nuxt",
    "@sidebase/nuxt-auth",
    "@nuxt/icon",
    "@vueuse/nuxt",
  ],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  // サーバー設定（ポート3100を使用）
  devServer: {
    port: 3100,
    host: "localhost",
  },

  auth: {
    baseURL: "/api/auth",
    provider: {
      type: "authjs",
    },
    globalAppMiddleware: false,
  },
  routeRules: {
    "/auth/login": { ssr: false },
    "/": { ssr: false },
    "/ws": { ssr: false },
    "/admin/statistics/**": { ssr: false },
    // フロント業務ダッシュボードのSSRエラー対策
    "/admin/front-desk": {
      ssr: false,
      prerender: false,
    },
    // フロント業務運用モードのSSRエラー対策
    "/admin/front-desk/operation": {
      ssr: false,
      prerender: false,
      // レイアウトエラー回避
      experimentalNoScripts: false,
    },
    // 領収書ページのSSRエラー対策
    "/admin/front-desk/accounting/receipt/**": {
      ssr: false,
      prerender: false,
    },
  },
  app: {
    head: {
      title: "Hotel System",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "Hotel room service system" },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap",
        },
      ],
    },
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "layout", mode: "out-in" },
  },

  // Nitro設定
  nitro: {
    // CORS設定
    routeRules: {
      "/api/v1/orders/**": { cors: true },
      "/api/v1/order/**": { cors: true },
      "/ws": { cors: true },
      "/ws/delivery": { cors: true },
    },
    // Nitroミドルウェア（一時的に無効化）
    // handlers: [
    //   {
    //     route: '/**',
    //     handler: '~/server/middleware/websocket.ts'
    //   },
    //   {
    //     route: '/**',
    //     handler: '~/server/middleware/websocket-delivery.ts'
    //   },
    //   {
    //     route: '/**',
    //     handler: '~/server/middleware/authDevice.ts'
    //   }
    // ],
    preset: "node-server",
  },

  // サーバミドルウェアの登録（一時的に無効化）
  // 順序が重要: WebSocketメインハンドラを先に読み込む
  // serverHandlers: [
  //   { route: '', handler: '~/server/middleware/websocket.ts' },
  //   { route: '', handler: '~/server/middleware/websocket-delivery.ts' },
  // ],

  typescript: {
    shim: false,
    strict: true,
  },

  build: {
    transpile: ["vue-sonner"],
  },

  // Composables auto-import configuration
  imports: {
    dirs: ["composables", "composables/**", "utils/**"],
  },

  runtimeConfig: {
    authJs: {
      secret: process.env.NUXT_NEXTAUTH_SECRET || "secret",
    },
    public: {
      authJs: {
        baseUrl: process.env.NUXT_NEXTAUTH_URL,
        verifyClientOnEveryRequest: true,
      },
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3000",
    },
  },

  experimental: {
    watcher: "parcel",
  },

  // ポート固定設定
  vite: {
    server: {
      strictPort: true, // ポート3000が使用できない場合はエラーで停止
    },
  },
});
