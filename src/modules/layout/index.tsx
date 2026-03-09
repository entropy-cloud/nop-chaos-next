import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

const dashboardStats = [
  { title: "用户数", value: 12345 },
  { title: "订单数", value: 1234 },
  { title: "收入", value: 56789 },
  { title: "转化率", value: 89 },
]

export function LayoutDemo() {
  const { t } = useTranslation()
  const stats = useMemo(() => dashboardStats, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("layoutDemo.title")}
        </h1>
        <p className="text-muted-foreground">{t("layoutDemo.subtitle")}</p>
      </div>

      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">{t("layoutDemo.tabs.grid")}</TabsTrigger>
          <TabsTrigger value="sidebar">
            {t("layoutDemo.tabs.sidebar")}
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            {t("layoutDemo.tabs.dashboard")}
          </TabsTrigger>
          <TabsTrigger value="form">{t("layoutDemo.tabs.form")}</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("layoutDemo.grid.title")}</CardTitle>
              <CardDescription>
                {t("layoutDemo.grid.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-muted flex items-center justify-center font-medium"
                  >
                    {i}
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 h-24 rounded-lg bg-primary/10 flex items-center justify-center">
                  col-span-2
                </div>
                <div className="h-24 rounded-lg bg-primary/20 flex items-center justify-center">
                  1
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sidebar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("layoutDemo.sidebar.title")}</CardTitle>
              <CardDescription>
                {t("layoutDemo.sidebar.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex h-[400px]">
                <div className="w-64 border-r bg-muted/50 p-4">
                  <h4 className="font-medium mb-4">
                    {t("layoutDemo.sidebar.menu")}
                  </h4>
                  <div className="space-y-2">
                    {[
                      t("layoutDemo.sidebar.items.home"),
                      t("layoutDemo.sidebar.items.products"),
                      t("layoutDemo.sidebar.items.orders"),
                      t("layoutDemo.sidebar.items.users"),
                      t("layoutDemo.sidebar.items.settings"),
                    ].map((item) => (
                      <div
                        key={item}
                        className="px-3 py-2 rounded-md hover:bg-muted cursor-pointer"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <h4 className="font-medium mb-4">
                    {t("layoutDemo.sidebar.mainContent")}
                  </h4>
                  <p className="text-muted-foreground">
                    {t("layoutDemo.sidebar.mainContentDescription")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("layoutDemo.dashboard.title")}</CardTitle>
              <CardDescription>
                {t("layoutDemo.dashboard.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                {stats.map((stat) => (
                  <Card key={stat.title}>
                    <CardHeader className="pb-2">
                      <CardDescription>
                        {t(`layoutDemo.dashboard.stats.${stat.title}`)}
                      </CardDescription>
                      <CardTitle className="text-2xl">{stat.value}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("layoutDemo.dashboard.trendChart")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] bg-muted/50 rounded-lg flex items-center justify-center">
                      {t("layoutDemo.dashboard.chartArea")}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("layoutDemo.dashboard.recentActivity")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <div key={i} className="p-2 rounded-md bg-muted/50">
                            {t("layoutDemo.dashboard.activityRecord", {
                              number: i,
                            })}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("layoutDemo.form.title")}</CardTitle>
              <CardDescription>
                {t("layoutDemo.form.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("layoutDemo.form.name")}</Label>
                    <Input placeholder={t("layoutDemo.form.namePlaceholder")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("layoutDemo.form.email")}</Label>
                    <Input
                      type="email"
                      placeholder={t("layoutDemo.form.emailPlaceholder")}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t("layoutDemo.form.province")}</Label>
                    <Input
                      placeholder={t("layoutDemo.form.provincePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("layoutDemo.form.city")}</Label>
                    <Input placeholder={t("layoutDemo.form.cityPlaceholder")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("layoutDemo.form.district")}</Label>
                    <Input
                      placeholder={t("layoutDemo.form.districtPlaceholder")}
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline">
                    {t("layoutDemo.form.cancel")}
                  </Button>
                  <Button>{t("layoutDemo.form.submit")}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
