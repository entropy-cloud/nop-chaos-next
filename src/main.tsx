import React from "react"
import ReactDOM from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import { router } from "./routes"
import { ThemeProvider } from "./providers/ThemeProvider"
import { worker } from "./mocks/browser"
import { registerBuiltinComponents } from "./lib/builtinComponents"
import "./i18n"
import "./index.css"

if (import.meta.env.DEV) {
  worker.start()
}

registerBuiltinComponents()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
