import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { useTabStore } from "@/stores/tabs"
import { toast, Toaster } from "sonner"

export { OrderDetail } from "./OrderDetail"

interface Order {
  id: number
  orderNo: string
  customer: string
  email: string
  phone: string
  amount: number
  status: "pending" | "processing" | "completed" | "cancelled"
  createdAt: string
  items: OrderItem[]
}

interface OrderItem {
  id: number
  orderId: number
  productName: string
  quantity: number
  price: number
}

interface OrderFormData {
  customer: string
  email: string
  phone: string
  status: "pending" | "processing" | "completed" | "cancelled"
}

const initialOrders: Order[] = [
  {
    id: 1,
    orderNo: "ORD-2024-001",
    customer: "张三",
    email: "zhangsan@example.com",
    phone: "13800138000",
    amount: 12800,
    status: "completed",
    createdAt: "2024-01-15 10:30",
    items: [
      {
        id: 1,
        orderId: 1,
        productName: "MacBook Pro 14寸",
        quantity: 1,
        price: 12800,
      },
    ],
  },
  {
    id: 2,
    orderNo: "ORD-2024-002",
    customer: "李四",
    email: "lisi@example.com",
    phone: "13900139000",
    amount: 798,
    status: "processing",
    createdAt: "2024-01-16 09:15",
    items: [
      {
        id: 1,
        orderId: 2,
        productName: "AirPods Pro",
        quantity: 2,
        price: 399,
      },
    ],
  },
  {
    id: 3,
    orderNo: "ORD-2024-003",
    customer: "王五",
    email: "wangwu@example.com",
    phone: "13700137000",
    amount: 2994,
    status: "pending",
    createdAt: "2024-01-17 14:20",
    items: [
      {
        id: 1,
        orderId: 3,
        productName: "Apple Pencil",
        quantity: 3,
        price: 998,
      },
    ],
  },
]

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

export function OrderManagement() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [formData, setFormData] = useState<OrderFormData>({
    customer: "",
    email: "",
    phone: "",
    status: "pending",
  })
  const { addTab, setActiveKey } = useTabStore()

  useEffect(() => {
    toast.success(t("orders.toast.loaded"), {
      description: t("orders.toast.loadedDesc"),
    })
  }, [t])

  const handleViewDetail = (order: Order) => {
    const tabKey = `/orders/detail/${order.id}`

    addTab({
      key: tabKey,
      label: `${t("orders.orderDetail")} - ${order.orderNo}`,
      labelKey: "orders.orderDetail",
      path: `/orders/detail/${order.id}`,
      closable: true,
    })

    setActiveKey(tabKey)
    navigate(`/orders/detail/${order.id}`)
  }

  const handleCreateOrder = () => {
    setFormData({
      customer: "",
      email: "",
      phone: "",
      status: "pending",
    })
    setIsDrawerOpen(true)
  }

  const handleSubmitOrder = () => {
    const newOrder: Order = {
      id: Date.now(),
      orderNo: `ORD-2024-${String(orders.length + 1).padStart(3, "0")}`,
      customer: formData.customer,
      email: formData.email,
      phone: formData.phone,
      amount: 0,
      status: formData.status,
      createdAt: new Date().toISOString(),
      items: [],
    }

    setOrders([newOrder, ...orders])
    setIsDrawerOpen(false)

    toast.success(t("orders.toast.created"), {
      description: `${t("orders.table.orderNo")} ${newOrder.orderNo}`,
    })
  }

  const handleDeleteOrder = (id: number) => {
    setOrders(orders.filter((o) => o.id !== id))
    toast.success(t("orders.toast.deleted"), {
      description: t("orders.toast.deletedDesc"),
    })
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors closeButton />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">
            {t("orders.title")}
          </h1>
          <p className="text-muted-foreground">{t("orders.subtitle")}</p>
        </div>
        <Button
          onClick={handleCreateOrder}
          className="gradient-primary text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("orders.newOrder")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("orders.totalOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold gradient-text">{orders.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("orders.statuses.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">
              {orders.filter((o) => o.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("orders.statuses.processing")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500">
              {orders.filter((o) => o.status === "processing").length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("orders.statuses.completed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">
              {orders.filter((o) => o.status === "completed").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{t("orders.orderList")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orders.table.orderNo")}</TableHead>
                <TableHead>{t("orders.table.customer")}</TableHead>
                <TableHead>{t("orders.table.amount")}</TableHead>
                <TableHead>{t("orders.table.status")}</TableHead>
                <TableHead>{t("orders.table.createdAt")}</TableHead>
                <TableHead>{t("orders.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleViewDetail(order)}
                >
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>¥{order.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusConfig(t, order.status).variant}>
                      {getStatusConfig(t, order.status).label}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.createdAt}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteOrder(order.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="w-full sm:max-w-lg">
          <DrawerHeader>
            <DrawerTitle>{t("orders.drawer.title")}</DrawerTitle>
          </DrawerHeader>
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>{t("orders.drawer.customerName")} *</Label>
              <Input
                value={formData.customer}
                onChange={(e) =>
                  setFormData({ ...formData, customer: e.target.value })
                }
                placeholder={t("orders.drawer.customerPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("orders.drawer.email")} *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder={t("orders.drawer.emailPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("orders.drawer.phone")}</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder={t("orders.drawer.phonePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("orders.drawer.status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as OrderFormData["status"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    {t("orders.statuses.pending")}
                  </SelectItem>
                  <SelectItem value="processing">
                    {t("orders.statuses.processing")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("orders.statuses.completed")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("orders.statuses.cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
              {t("orders.drawer.cancel")}
            </Button>
            <Button
              onClick={handleSubmitOrder}
              className="gradient-primary text-white"
            >
              {t("orders.drawer.submit")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
