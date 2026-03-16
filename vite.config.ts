import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
