import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function ChartDemo() {
  const { t } = useTranslation()

  const lineData = [
    { name: t("chart.months.jan"), value: 4000 },
    { name: t("chart.months.feb"), value: 3000 },
    { name: t("chart.months.mar"), value: 2000 },
    { name: t("chart.months.apr"), value: 2780 },
    { name: t("chart.months.may"), value: 1890 },
    { name: t("chart.months.jun"), value: 2390 },
  ]

  const barData = [
    { name: t("chart.products.productA"), value: 4000 },
    { name: t("chart.products.productB"), value: 3000 },
    { name: t("chart.products.productC"), value: 2000 },
    { name: t("chart.products.productD"), value: 2780 },
    { name: t("chart.products.productE"), value: 1890 },
  ]

  const pieData = [
    { name: t("chart.channels.directVisit"), value: 400, color: "#8884d8" },
    { name: t("chart.channels.emailMarketing"), value: 300, color: "#82ca9d" },
    { name: t("chart.channels.affiliateAds"), value: 200, color: "#ffc658" },
    { name: t("chart.channels.videoAds"), value: 100, color: "#ff7300" },
  ]

  const areaData = [
    { name: t("chart.months.jan"), uv: 4000, pv: 2400 },
    { name: t("chart.months.feb"), uv: 3000, pv: 1398 },
    { name: t("chart.months.mar"), uv: 2000, pv: 9800 },
    { name: t("chart.months.apr"), uv: 2780, pv: 3908 },
    { name: t("chart.months.may"), uv: 1890, pv: 4800 },
    { name: t("chart.months.jun"), uv: 2390, pv: 3800 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("chart.title")}
        </h1>
        <p className="text-muted-foreground">{t("chart.subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("chart.lineChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("chart.barChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("chart.pieChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("chart.areaChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="uv"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                />
                <Area
                  type="monotone"
                  dataKey="pv"
                  stackId="1"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
