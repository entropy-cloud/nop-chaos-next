import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Node } from "@xyflow/react"

interface NodePropertyDialogProps {
  node: Node | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

export function NodePropertyDialog({
  node,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: NodePropertyDialogProps) {
  const { t } = useTranslation()

  const iconOptions = [
    { value: "circle", label: t("flow.iconShapes.circle") },
    { value: "square", label: t("flow.iconShapes.square") },
    { value: "diamond", label: t("flow.iconShapes.diamond") },
    { value: "star", label: t("flow.iconShapes.star") },
    { value: "hexagon", label: t("flow.iconShapes.hexagon") },
  ]

  const colorOptions = [
    { value: "#22c55e", label: t("flow.colors.green") },
    { value: "#3b82f6", label: t("flow.colors.blue") },
    { value: "#eab308", label: t("flow.colors.yellow") },
    { value: "#ef4444", label: t("flow.colors.red") },
    { value: "#8b5cf6", label: t("flow.colors.purple") },
    { value: "#ec4899", label: t("flow.colors.pink") },
    { value: "#06b6d4", label: t("flow.colors.cyan") },
    { value: "#f97316", label: t("flow.colors.orange") },
  ]

  const [formData, setFormData] = useState({
    label: "",
    description: "",
    icon: "circle",
    color: "#3b82f6",
    timeout: "",
    retryCount: "0",
    async: false,
  })

  useEffect(() => {
    if (node) {
      setFormData({
        label: (node.data.label as string) || "",
        description: (node.data.description as string) || "",
        icon: (node.data.icon as string) || "circle",
        color: (node.data.color as string) || "#3b82f6",
        timeout: (node.data.timeout as string) || "",
        retryCount: String(node.data.retryCount ?? 0),
        async: (node.data.async as boolean) || false,
      })
    }
  }, [node])

  const handleSave = () => {
    if (!node) return
    onUpdate(node.id, {
      ...node.data,
      ...formData,
      retryCount: parseInt(formData.retryCount) || 0,
    })
    onOpenChange(false)
  }

  if (!node) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {t("flow.nodeProperty")} - {node.id}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.name")}</Label>
            <Input
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.description")}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="col-span-3"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.icon")}</Label>
            <Select
              value={formData.icon}
              onValueChange={(v) => setFormData({ ...formData, icon: v })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.color")}</Label>
            <Select
              value={formData.color}
              onValueChange={(v) => setFormData({ ...formData, color: v })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: opt.value }}
                      />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.timeout")}</Label>
            <Input
              type="number"
              value={formData.timeout}
              onChange={(e) =>
                setFormData({ ...formData, timeout: e.target.value })
              }
              className="col-span-3"
              placeholder={t("flow.timeoutPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.retryCount")}</Label>
            <Input
              type="number"
              value={formData.retryCount}
              onChange={(e) =>
                setFormData({ ...formData, retryCount: e.target.value })
              }
              className="col-span-3"
              min="0"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.asyncExecution")}</Label>
            <Switch
              checked={formData.async}
              onCheckedChange={(v) => setFormData({ ...formData, async: v })}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={() => onDelete(node.id)}>
            {t("flow.deleteNode")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave}>{t("common.save")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
