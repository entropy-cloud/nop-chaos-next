import { useTranslation } from "react-i18next"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function Settings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.personalInfo.title")}</CardTitle>
            <CardDescription>
              {t("settings.personalInfo.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("settings.personalInfo.name")}</Label>
                <Input id="name" defaultValue="Admin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  {t("settings.personalInfo.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="admin@example.com"
                />
              </div>
            </div>
            <Button>{t("settings.personalInfo.saveChanges")}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.systemConfig.title")}</CardTitle>
            <CardDescription>
              {t("settings.systemConfig.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="api-url">
                  {t("settings.systemConfig.apiUrl")}
                </Label>
                <Input id="api-url" defaultValue="/api" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">
                  {t("settings.systemConfig.timezone")}
                </Label>
                <Input id="timezone" defaultValue="Asia/Shanghai" />
              </div>
            </div>
            <Separator />
            <Button>{t("settings.systemConfig.saveConfig")}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.about.title")}</CardTitle>
            <CardDescription>{t("settings.about.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("settings.about.version")}
                </span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("settings.about.framework")}
                </span>
                <span>React 18 + TypeScript</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("settings.about.uiComponents")}
                </span>
                <span>shadcn/ui + Tailwind CSS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("settings.about.stateManagement")}
                </span>
                <span>Zustand</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("settings.about.dataFetching")}
                </span>
                <span>TanStack Query</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
