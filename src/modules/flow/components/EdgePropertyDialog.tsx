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
import type { Edge } from "@xyflow/react"

interface EdgePropertyDialogProps {
  edge: Edge | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}

export function EdgePropertyDialog({
  edge,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: EdgePropertyDialogProps) {
  const { t } = useTranslation()

  const conditionTypeOptions = [
    { value: "always", label: t("flow.conditionTypes.always") },
    { value: "expression", label: t("flow.conditionTypes.expression") },
    { value: "script", label: t("flow.conditionTypes.script") },
  ]

  const lineStyleOptions = [
    { value: "solid", label: t("flow.lineStyles.solid") },
    { value: "dashed", label: t("flow.lineStyles.dashed") },
    { value: "dotted", label: t("flow.lineStyles.dotted") },
  ]

  const [formData, setFormData] = useState({
    label: "",
    conditionType: "always",
    condition: "",
    description: "",
    lineStyle: "solid",
    priority: "0",
  })

  useEffect(() => {
    if (edge) {
      setFormData({
        label: (edge.label as string) || "",
        conditionType: (edge.data?.conditionType as string) || "always",
        condition: (edge.data?.condition as string) || "",
        description: (edge.data?.description as string) || "",
        lineStyle: (edge.data?.lineStyle as string) || "solid",
        priority: String(edge.data?.priority ?? 0),
      })
    }
  }, [edge])

  const handleSave = () => {
    if (!edge) return
    onUpdate(edge.id, {
      label: formData.label,
      conditionType: formData.conditionType,
      condition: formData.condition,
      description: formData.description,
      lineStyle: formData.lineStyle,
      priority: parseInt(formData.priority) || 0,
    })
    onOpenChange(false)
  }

  if (!edge) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {t("flow.edgeProperty")} - {edge.id}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.label")}</Label>
            <Input
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
              className="col-span-3"
              placeholder={t("flow.labelPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.conditionType")}</Label>
            <Select
              value={formData.conditionType}
              onValueChange={(v) =>
                setFormData({ ...formData, conditionType: v })
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conditionTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.conditionType !== "always" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                {formData.conditionType === "expression"
                  ? t("flow.expression")
                  : t("flow.script")}
              </Label>
              <Textarea
                value={formData.condition}
                onChange={(e) =>
                  setFormData({ ...formData, condition: e.target.value })
                }
                className="col-span-3"
                rows={3}
                placeholder={
                  formData.conditionType === "expression"
                    ? t("flow.expressionPlaceholder")
                    : t("flow.scriptPlaceholder")
                }
              />
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.description")}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="col-span-3"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.lineStyle")}</Label>
            <Select
              value={formData.lineStyle}
              onValueChange={(v) => setFormData({ ...formData, lineStyle: v })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lineStyleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">{t("flow.priority")}</Label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              className="col-span-3"
              min="0"
            />
          </div>

          <div className="col-span-4 text-sm text-muted-foreground">
            <div>
              {t("flow.sourceNode")}:{" "}
              <span className="font-mono">{edge.source}</span>
            </div>
            <div>
              {t("flow.targetNode")}:{" "}
              <span className="font-mono">{edge.target}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={() => onDelete(edge.id)}>
            {t("flow.deleteEdge")}
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
