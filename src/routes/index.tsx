import { createBrowserRouter } from "react-router-dom"
import { MainLayout } from "@/layouts"
import { Login } from "@/modules/auth"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Dashboard } from "@/modules/dashboard"
import { OrderDetail } from "@/modules/orders"
import { DynamicPageWrapper } from "@/components/DynamicPageWrapper"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: "orders/detail/:id",
        element: <OrderDetail />,
      },
      {
        path: "*",
        element: <DynamicPageWrapper />,
      },
    ],
  },
])
