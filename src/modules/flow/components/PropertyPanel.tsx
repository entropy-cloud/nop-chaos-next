import { useState, useEffect } from "react"
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
import { Separator } from "@/components/ui/separator"
import { Trash2, Settings } from "lucide-react"
import type { Node, Edge } from "@xyflow/react"
import { useTranslation } from "react-i18next"

interface PropertyPanelProps {
  selectedNode: Node | null
  selectedEdge: Edge | null
  onUpdateNode: (id: string, data: Record<string, unknown>) => void
  onUpdateEdge: (id: string, data: Record<string, unknown>) => void
  onDeleteNode: (id: string) => void
  onDeleteEdge: (id: string) => void
}

const iconOptions = [
  { value: "circle", label: "flow.iconShapes.circle" },
  { value: "square", label: "flow.iconShapes.square" },
  { value: "diamond", label: "flow.iconShapes.diamond" },
  { value: "star", label: "flow.iconShapes.star" },
  { value: "hexagon", label: "flow.iconShapes.hexagon" },
]

const colorOptions = [
  { value: "#22c55e", label: "flow.colors.green" },
  { value: "#3b82f6", label: "flow.colors.blue" },
  { value: "#eab308", label: "flow.colors.yellow" },
  { value: "#ef4444", label: "flow.colors.red" },
  { value: "#8b5cf6", label: "flow.colors.purple" },
  { value: "#ec4899", label: "flow.colors.pink" },
  { value: "#06b6d4", label: "flow.colors.cyan" },
  { value: "#f97316", label: "flow.colors.orange" },
]

const lineStyleOptions = [
  { value: "solid", label: "flow.lineStyles.solid" },
  { value: "dashed", label: "flow.lineStyles.dashed" },
  { value: "dotted", label: "flow.lineStyles.dotted" },
]

export function PropertyPanel({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
}: PropertyPanelProps) {
  const { t } = useTranslation()
  const [nodeData, setNodeData] = useState({
    label: "",
    description: "",
    icon: "circle",
    color: "#3b82f6",
    timeout: "",
    retryCount: "0",
    async: false,
  })

  const [edgeData, setEdgeData] = useState({
    label: "",
    conditionType: "always",
    condition: "",
    description: "",
    lineStyle: "solid",
    priority: "0",
  })

  useEffect(() => {
    if (selectedNode) {
      setNodeData({
        label: (selectedNode.data.label as string) || "",
        description: (selectedNode.data.description as string) || "",
        icon: (selectedNode.data.icon as string) || "circle",
        color: (selectedNode.data.color as string) || "#3b82f6",
        timeout: String(selectedNode.data.timeout || ""),
        retryCount: String(selectedNode.data.retryCount ?? 0),
        async: (selectedNode.data.async as boolean) || false,
      })
    }
  }, [selectedNode])

  useEffect(() => {
    if (selectedEdge) {
      setEdgeData({
        label: (selectedEdge.label as string) || "",
        conditionType: (selectedEdge.data?.conditionType as string) || "always",
        condition: (selectedEdge.data?.condition as string) || "",
        description: (selectedEdge.data?.description as string) || "",
        lineStyle: (selectedEdge.data?.lineStyle as string) || "solid",
        priority: String(selectedEdge.data?.priority ?? 0),
      })
    }
  }, [selectedEdge])

  const handleNodeChange = (key: string, value: unknown) => {
    if (!selectedNode) return
    const newData = { ...nodeData, [key]: value }
    setNodeData(newData)
    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      ...newData,
      retryCount: parseInt(newData.retryCount) || 0,
      timeout: newData.timeout ? parseInt(newData.timeout) : undefined,
    })
  }

  const handleEdgeChange = (key: string, value: unknown) => {
    if (!selectedEdge) return
    const newData = { ...edgeData, [key]: value }
    setEdgeData(newData)
    onUpdateEdge(selectedEdge.id, {
      label: newData.label,
      data: {
        conditionType: newData.conditionType,
        condition: newData.condition,
        description: newData.description,
        lineStyle: newData.lineStyle,
        priority: parseInt(newData.priority) || 0,
      },
    })
  }

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="w-64 border-l p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Settings className="h-4 w-4" />
          <span className="text-sm">{t("flow.propertyPanel")}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          {t("flow.propertyPanelDescription")}
        </p>
      </div>
    )
  }

  if (selectedNode) {
    return (
      <div className="w-64 border-l p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{t("flow.nodeProperty")}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onDeleteNode(selectedNode.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <Label className="text-xs">ID</Label>
            <Input value={selectedNode.id} disabled className="h-8 text-xs" />
          </div>

          <div>
            <Label className="text-xs">{t("flow.name")}</Label>
            <Input
              value={nodeData.label}
              onChange={(e) => handleNodeChange("label", e.target.value)}
              className="h-8"
            />
          </div>

          <div>
            <Label className="text-xs">{t("flow.description")}</Label>
            <Textarea
              value={nodeData.description}
              onChange={(e) => handleNodeChange("description", e.target.value)}
              className="text-xs"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-xs">{t("flow.shape")}</Label>
            <Select
              value={nodeData.icon}
              onValueChange={(v) => handleNodeChange("icon", v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">{t("flow.color")}</Label>
            <Select
              value={nodeData.color}
              onValueChange={(v) => handleNodeChange("color", v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: opt.value }}
                      />
                      {t(opt.label)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <Label className="text-xs">{t("flow.timeout")}</Label>
            <Input
              type="number"
              value={nodeData.timeout}
              onChange={(e) => handleNodeChange("timeout", e.target.value)}
              className="h-8"
              placeholder={t("flow.timeoutPlaceholder")}
            />
          </div>

          <div>
            <Label className="text-xs">{t("flow.retryCount")}</Label>
            <Input
              type="number"
              value={nodeData.retryCount}
              onChange={(e) => handleNodeChange("retryCount", e.target.value)}
              className="h-8"
              min="0"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("flow.asyncExecution")}</Label>
            <Switch
              checked={nodeData.async}
              onCheckedChange={(v) => handleNodeChange("async", v)}
            />
          </div>
        </div>
      </div>
    )
  }

  if (selectedEdge) {
    return (
      <div className="w-64 border-l p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{t("flow.edgeProperty")}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onDeleteEdge(selectedEdge.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <Label className="text-xs">ID</Label>
            <Input value={selectedEdge.id} disabled className="h-8 text-xs" />
          </div>

          <div>
            <Label className="text-xs">{t("flow.label")}</Label>
            <Input
              value={edgeData.label}
              onChange={(e) => handleEdgeChange("label", e.target.value)}
              className="h-8"
              placeholder={t("flow.labelPlaceholder")}
            />
          </div>

          <div>
            <Label className="text-xs">{t("flow.conditionType")}</Label>
            <Select
              value={edgeData.conditionType}
              onValueChange={(v) => handleEdgeChange("conditionType", v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">
                  {t("flow.conditionTypes.always")}
                </SelectItem>
                <SelectItem value="expression">
                  {t("flow.conditionTypes.expression")}
                </SelectItem>
                <SelectItem value="script">
                  {t("flow.conditionTypes.script")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {edgeData.conditionType !== "always" && (
            <div>
              <Label className="text-xs">
                {edgeData.conditionType === "expression"
                  ? t("flow.expression")
                  : t("flow.script")}
              </Label>
              <Textarea
                value={edgeData.condition}
                onChange={(e) => handleEdgeChange("condition", e.target.value)}
                className="text-xs"
                rows={2}
              />
            </div>
          )}

          <div>
            <Label className="text-xs">{t("flow.description")}</Label>
            <Textarea
              value={edgeData.description}
              onChange={(e) => handleEdgeChange("description", e.target.value)}
              className="text-xs"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-xs">{t("flow.lineStyle")}</Label>
            <Select
              value={edgeData.lineStyle}
              onValueChange={(v) => handleEdgeChange("lineStyle", v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lineStyleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">{t("flow.priority")}</Label>
            <Input
              type="number"
              value={edgeData.priority}
              onChange={(e) => handleEdgeChange("priority", e.target.value)}
              className="h-8"
              min="0"
            />
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground">
            <div>
              {t("flow.sourceNode")}:{" "}
              <span className="font-mono">{selectedEdge.source}</span>
            </div>
            <div>
              {t("flow.targetNode")}:{" "}
              <span className="font-mono">{selectedEdge.target}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
