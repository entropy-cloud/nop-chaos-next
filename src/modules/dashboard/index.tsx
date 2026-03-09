import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ShoppingCart, TrendingUp, Activity } from "lucide-react"
import { useThemeStore } from "@/stores/theme"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

const recentOrders = [
  { id: 1, customer: "张三", amount: "¥1,200", status: "completed" },
  { id: 2, customer: "李四", amount: "¥3,500", status: "processing" },
  { id: 3, customer: "王五", amount: "¥800", status: "pending" },
  { id: 4, customer: "赵六", amount: "¥2,100", status: "completed" },
]

export function Dashboard() {
  const { t } = useTranslation()
  const { style } = useThemeStore()
  const isGlass = style === "glassmorphism"

  const stats = [
    {
      title: t("dashboard.stats.totalUsers"),
      value: "12,345",
      change: "+12%",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: t("dashboard.stats.orders"),
      value: "1,234",
      change: "+5%",
      icon: ShoppingCart,
      color: "text-green-500",
    },
    {
      title: t("dashboard.stats.revenue"),
      value: "¥123,456",
      change: "+8%",
      icon: TrendingUp,
      color: "text-purple-500",
    },
    {
      title: t("dashboard.stats.activity"),
      value: "89%",
      change: "+2%",
      icon: Activity,
      color: "text-orange-500",
    },
  ]

  const statusMap: Record<
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
    completed: { label: t("dashboard.statuses.completed"), variant: "success" },
    processing: {
      label: t("dashboard.statuses.processing"),
      variant: "warning",
    },
    pending: { label: t("dashboard.statuses.pending"), variant: "secondary" },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("dashboard.title")}
        </h1>
        <p className="text-muted-foreground">{t("dashboard.welcome")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className={cn(isGlass && "glass-card")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">{stat.change}</span>{" "}
                {t("dashboard.change")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className={cn("col-span-4", isGlass && "glass-card")}>
          <CardHeader>
            <CardTitle>{t("dashboard.recentOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{order.customer}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.amount}
                    </p>
                  </div>
                  <Badge variant={statusMap[order.status].variant}>
                    {statusMap[order.status].label}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={cn("col-span-3", isGlass && "glass-card")}>
          <CardHeader>
            <CardTitle>{t("dashboard.quickAccess")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/flow"
                className="flex flex-col items-center justify-center rounded-lg border p-4 hover:bg-muted transition-colors"
              >
                <Activity className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">
                  {t("dashboard.quickLinks.flowChart")}
                </span>
              </a>
              <a
                href="/chart"
                className="flex flex-col items-center justify-center rounded-lg border p-4 hover:bg-muted transition-colors"
              >
                <TrendingUp className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">
                  {t("dashboard.quickLinks.charts")}
                </span>
              </a>
              <a
                href="/ai"
                className="flex flex-col items-center justify-center rounded-lg border p-4 hover:bg-muted transition-colors"
              >
                <Users className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">
                  {t("dashboard.quickLinks.aiIntegration")}
                </span>
              </a>
              <a
                href="/crud"
                className="flex flex-col items-center justify-center rounded-lg border p-4 hover:bg-muted transition-colors"
              >
                <ShoppingCart className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">
                  {t("dashboard.quickLinks.masterDetail")}
                </span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
