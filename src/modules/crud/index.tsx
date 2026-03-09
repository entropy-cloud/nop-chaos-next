import { useState } from "react"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

interface Order {
  id: number
  orderNo: string
  customer: string
  amount: number
  status: "pending" | "processing" | "completed" | "cancelled"
  items: OrderItem[]
}

interface OrderItem {
  id: number
  productName: string
  quantity: number
  price: number
}

const mockOrders: Order[] = [
  {
    id: 1,
    orderNo: "ORD-001",
    customer: "张三",
    amount: 1200,
    status: "completed",
    items: [
      { id: 1, productName: "产品 A", quantity: 2, price: 300 },
      { id: 2, productName: "产品 B", quantity: 1, price: 600 },
    ],
  },
  {
    id: 2,
    orderNo: "ORD-002",
    customer: "李四",
    amount: 3500,
    status: "processing",
    items: [{ id: 1, productName: "产品 C", quantity: 5, price: 700 }],
  },
  {
    id: 3,
    orderNo: "ORD-003",
    customer: "王五",
    amount: 800,
    status: "pending",
    items: [{ id: 1, productName: "产品 D", quantity: 4, price: 200 }],
  },
]

export function CrudDemo() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState(mockOrders)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    customer: "",
    status: "pending" as Order["status"],
  })

  const statusConfig: Record<
    string,
    {
      label: string
      variant:
        | "default"
        | "secondary"
        | "destructive"
        | "outline"
        | "success"
        | "warning"
    }
  > = {
    pending: { label: t("crud.statuses.pending"), variant: "secondary" },
    processing: { label: t("crud.statuses.processing"), variant: "warning" },
    completed: { label: t("crud.statuses.completed"), variant: "success" },
    cancelled: { label: t("crud.statuses.cancelled"), variant: "destructive" },
  }

  const handleCreate = () => {
    setSelectedOrder(null)
    setFormData({ customer: "", status: "pending" })
    setIsDialogOpen(true)
  }

  const handleEdit = (order: Order) => {
    setSelectedOrder(order)
    setFormData({ customer: order.customer, status: order.status })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setOrders(orders.filter((o) => o.id !== id))
  }

  const handleSubmit = () => {
    if (selectedOrder) {
      setOrders(
        orders.map((o) =>
          o.id === selectedOrder.id ? { ...o, ...formData } : o
        )
      )
    } else {
      const newOrder: Order = {
        id: Date.now(),
        orderNo: `ORD-${String(orders.length + 1).padStart(3, "0")}`,
        amount: 0,
        items: [],
        ...formData,
      }
      setOrders([...orders, newOrder])
    }
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("crud.title")}
          </h1>
          <p className="text-muted-foreground">{t("crud.subtitle")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t("crud.newOrder")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedOrder ? t("crud.editOrder") : t("crud.newOrder")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("crud.customerName")}</Label>
                <Input
                  value={formData.customer}
                  onChange={(e) =>
                    setFormData({ ...formData, customer: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("crud.status")}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as Order["status"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      {t("crud.statuses.pending")}
                    </SelectItem>
                    <SelectItem value="processing">
                      {t("crud.statuses.processing")}
                    </SelectItem>
                    <SelectItem value="completed">
                      {t("crud.statuses.completed")}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {t("crud.statuses.cancelled")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {selectedOrder ? t("common.update") : t("common.create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("crud.orderList")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("crud.orderNo")}</TableHead>
                <TableHead>{t("crud.customer")}</TableHead>
                <TableHead>{t("crud.amount")}</TableHead>
                <TableHead>{t("crud.status")}</TableHead>
                <TableHead>{t("crud.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNo}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>¥{order.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[order.status].variant}>
                      {statusConfig[order.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(order)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedOrder && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("crud.orderDetail")} - {selectedOrder.orderNo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("crud.productName")}</TableHead>
                  <TableHead>{t("crud.quantity")}</TableHead>
                  <TableHead>{t("crud.unitPrice")}</TableHead>
                  <TableHead>{t("crud.subtotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>¥{item.price}</TableCell>
                    <TableCell>
                      ¥{(item.quantity * item.price).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
