import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Package } from "lucide-react"
import { useTabStore } from "@/stores/tabs"

const orderData: Record<
  string,
  {
    id: number
    orderNo: string
    customer: string
    email: string
    phone: string
    amount: number
    status: "pending" | "processing" | "completed" | "cancelled"
    createdAt: string
    items: Array<{
      id: number
      productName: string
      quantity: number
      price: number
    }>
  }
> = {
  "1": {
    id: 1,
    orderNo: "ORD-2024-001",
    customer: "张三",
    email: "zhangsan@example.com",
    phone: "13800138000",
    amount: 12800,
    status: "completed",
    createdAt: "2024-01-15 10:30",
    items: [
      { id: 1, productName: "MacBook Pro 14寸", quantity: 1, price: 12800 },
    ],
  },
  "2": {
    id: 2,
    orderNo: "ORD-2024-002",
    customer: "李四",
    email: "lisi@example.com",
    phone: "13900139000",
    amount: 798,
    status: "processing",
    createdAt: "2024-01-16 09:15",
    items: [{ id: 1, productName: "AirPods Pro", quantity: 2, price: 399 }],
  },
  "3": {
    id: 3,
    orderNo: "ORD-2024-003",
    customer: "王五",
    email: "wangwu@example.com",
    phone: "13700137000",
    amount: 2994,
    status: "pending",
    createdAt: "2024-01-17 14:20",
    items: [{ id: 1, productName: "Apple Pencil", quantity: 3, price: 998 }],
  },
}

const getStatusConfig = (t: (key: string) => string, key: string) => {
  const labels: Record<string, string> = {
    pending: t("orders.statuses.pending"),
    processing: t("orders.statuses.processing"),
    completed: t("orders.statuses.completed"),
    cancelled: t("orders.statuses.cancelled"),
  }
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
  > = {
    pending: "secondary",
    processing: "warning",
    completed: "success",
    cancelled: "destructive",
  }
  return { label: labels[key] || key, variant: variants[key] || "default" }
}

export function OrderDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setActiveKey } = useTabStore()

  const order = id ? orderData[id] : null

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="glass-card p-8">
          <CardContent className="text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {t("orders.detail.notFound")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("orders.detail.notFoundDesc")}: {id}
            </p>
            <Button
              onClick={() => {
                setActiveKey("/orders")
                navigate("/orders")
              }}
            >
              {t("orders.detail.backToList")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setActiveKey("/orders")
            navigate("/orders")
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">
            {t("orders.detail.title")} - {order.orderNo}
          </h1>
          <p className="text-muted-foreground">{t("orders.detail.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t("orders.detail.basicInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("orders.table.orderNo")}
                </p>
                <p className="font-medium">{order.orderNo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("orders.table.status")}
                </p>
                <Badge variant={getStatusConfig(t, order.status).variant}>
                  {getStatusConfig(t, order.status).label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("orders.table.customer")}
                </p>
                <p className="font-medium">{order.customer}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("orders.drawer.email")}
                </p>
                <p className="font-medium">{order.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("orders.drawer.phone")}
                </p>
                <p className="font-medium">{order.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("orders.table.createdAt")}
                </p>
                <p className="font-medium">{order.createdAt}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t("orders.detail.orderAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold gradient-text">
              ¥{order.amount.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {t("orders.detail.itemsCount", { count: order.items.length })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t("orders.detail.orderItems")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orders.detail.productName")}</TableHead>
                <TableHead>{t("orders.detail.quantity")}</TableHead>
                <TableHead>{t("orders.detail.unitPrice")}</TableHead>
                <TableHead>{t("orders.detail.subtotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.productName}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>¥{item.price.toLocaleString()}</TableCell>
                  <TableCell>
                    ¥{(item.quantity * item.price).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
