# Technology Stack

**Analysis Date:** 2026-03-12

## Languages

**Primary:**
- TypeScript 5.8.3 - All application source code in `src/`
- Deno (TypeScript) - Supabase Edge Functions in `supabase/functions/`

**Secondary:**
- CSS - Global styles at `src/index.css`, component styles via Tailwind

## Runtime

**Environment:**
- Browser (SPA) - No server-side rendering; pure client-side React app
- Deno runtime for Supabase Edge Functions

**Package Manager:**
- npm (primary, `package-lock.json` present)
- bun also used (`bun.lock`, `bun.lockb` present)

**Lockfiles:**
- `package-lock.json` - npm lockfile (present)
- `bun.lockb` - bun binary lockfile (present)

## Frameworks

**Core:**
- React 18.3.1 - UI framework; entry at `src/main.tsx`
- React Router DOM 6.30.1 - Client-side routing; configured in `src/App.tsx`
- TanStack React Query 5.83.0 - Server state management; `QueryClientProvider` wraps app in `src/App.tsx`

**UI Component System:**
- shadcn/ui (via `components.json`) - Component library, slate base color, CSS variables
- Radix UI primitives - Full suite installed (accordion, dialog, dropdown, select, tabs, toast, tooltip, etc.)
- Tailwind CSS 3.4.17 - Utility-first CSS; config at `tailwind.config.ts`
- tailwindcss-animate 1.0.7 - Animation utilities
- class-variance-authority 0.7.1 - Variant-based component styling
- clsx 2.1.1 + tailwind-merge 2.6.0 - Class name utilities; combined in `src/lib/utils`
- lucide-react 0.462.0 - Icon library
- next-themes 0.3.0 - Dark/light mode theming; `darkMode: ["class"]` in Tailwind config

**Forms:**
- react-hook-form 7.61.1 - Form state management
- @hookform/resolvers 3.10.0 - Schema validation adapters
- zod 3.25.76 - Schema validation

**Data & Charts:**
- recharts 2.15.4 - Chart components
- date-fns 3.6.0 - Date utilities
- react-day-picker 8.10.1 - Date picker component

**UI Extras:**
- embla-carousel-react 8.6.0 - Carousel component
- react-resizable-panels 2.1.9 - Resizable panel layouts
- vaul 0.9.9 - Drawer (bottom sheet) component
- cmdk 1.1.1 - Command palette component
- input-otp 1.4.2 - OTP input component
- canvas-confetti 1.9.4 - Confetti animation (used on ride completion)
- sonner 1.7.4 - Toast notification system

**Maps:**
- @react-google-maps/api 2.20.8 - Google Maps React wrapper; used in `src/components/GoogleMapView.tsx`

**Build/Dev:**
- Vite 5.4.19 - Build tool and dev server; config at `vite.config.ts`
- @vitejs/plugin-react-swc 3.11.0 - React Fast Refresh with SWC compiler
- PostCSS 8.5.6 + Autoprefixer 10.4.21 - CSS processing; config at `postcss.config.js`
- lovable-tagger 1.1.13 - Development-only component tagger (active only in `mode === "development"`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.99.1 - Database, auth, realtime, storage client; client at `src/integrations/supabase/client.ts`
- `react-router-dom` ^6.30.1 - All page routing defined in `src/App.tsx`
- `@react-google-maps/api` ^2.20.8 - Map rendering for ride tracking in `src/components/GoogleMapView.tsx`

**Infrastructure:**
- `@tanstack/react-query` ^5.83.0 - Data fetching/caching layer
- `zod` ^3.25.76 - Input validation throughout the app
- `react-hook-form` ^7.61.1 - All form handling

## Configuration

**Path Aliases:**
- `@/*` maps to `./src/*` — configured in both `tsconfig.json` and `vite.config.ts`

**TypeScript:**
- Target: ES2020
- Mode: not strict (strict=false, noImplicitAny=false, strictNullChecks=false)
- Config files: `tsconfig.json` (root), `tsconfig.app.json` (app), `tsconfig.node.json` (node tooling)

**Build:**
- Dev server port: 8080, host: `::`
- Build output: `dist/` (Vite default)
- ESM modules only (`"type": "module"` in `package.json`)

**Linting:**
- ESLint 9.32.0 with typescript-eslint; config at `eslint.config.js`
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- `@typescript-eslint/no-unused-vars` is turned off

## Platform Requirements

**Development:**
- Node.js (version not pinned; no `.nvmrc` or `.node-version`)
- npm or bun for package management

**Production:**
- Static SPA — deployable to any static hosting (Vercel, Netlify, etc.)
- Supabase project: `yrhdcigbbahylzfzbsnk` (hosted on `supabase.co`)
- Edge Functions run on Deno within Supabase infrastructure

---

*Stack analysis: 2026-03-12*
