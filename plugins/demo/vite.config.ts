import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const basePackages = [
  "react",
  "react-dom",
  "react-dom/client",
  "react-router-dom",
  "lucide-react",
  "clsx",
  "tailwind-merge",
  "class-variance-authority",
  "recharts",
  "sonner",
  "zustand",
  "@tanstack/react-query",
  "@xyflow/react",
]

const radixPackages = [
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-select",
  "@radix-ui/react-tabs",
  "@radix-ui/react-tooltip",
  "@radix-ui/react-separator",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-label",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-slot",
]

const allExternals = [
  ...basePackages,
  ...radixPackages,
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-i18next",
  "i18next",
]

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    lib: {
      entry: "src/main.tsx",
      formats: ["system"],
      fileName: (format) => `plugin-demo.${format}.js`,
    },
    rollupOptions: {
      external: allExternals,
    },
    minify: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 4173,
    host: true,
  },
})
