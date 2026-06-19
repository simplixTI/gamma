import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo.png", "logo.dark.png"],
      manifest: {
        name: "Gamma - Transporte Aquático",
        short_name: "Gamma",
        description: "Serviço de transporte aquático na Ilha da Gigoia, Barra da Tijuca.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#00A8E8",
        lang: "pt-BR",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // Don't cache Supabase API or Google Maps calls
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/(maps|fonts)\.googleapis\.com\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "google-apis-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
        navigateFallbackDenylist: [/^\/api\//, /^\/functions\//],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Stub the native-only Capacitor push plugin for web/dev builds.
      // On iOS/Android Capacitor resolves the real plugin at runtime.
      "@capacitor/push-notifications": path.resolve(__dirname, "./src/mocks/capacitor-push-notifications.ts"),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy mapping library into its own async chunk
          'vendor-maps': ['@react-google-maps/api'],
          // Split charting library — only used in Earnings/History screens
          'vendor-charts': ['recharts'],
          // Core React runtime
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
}));
