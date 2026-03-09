import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

interface CustomNodeData {
  label: string
  labelKey?: string
  description?: string
  icon?: string
  color?: string
  timeout?: number
  retryCount?: number
  async?: boolean
  nodeType?: string
}

const iconShapes: Record<string, string> = {
  circle: "rounded-full",
  square: "rounded-lg",
  diamond: "rotate-45 rounded-sm",
  star: "clip-path-star",
  hexagon: "clip-path-hexagon",
}

export const CustomNode = memo(({ data, selected }: NodeProps) => {
  const { t } = useTranslation()
  const nodeData = data as unknown as CustomNodeData
  const shape = iconShapes[nodeData.icon || "circle"] || iconShapes.circle
  const bgColor = nodeData.color || "hsl(var(--primary))"
  const isDiamond = nodeData.icon === "diamond"
  const displayLabel = nodeData.labelKey
    ? t(nodeData.labelKey, { defaultValue: nodeData.label })
    : nodeData.label

  return (
    <div
      className={cn(
        "relative flex items-center justify-center transition-all duration-200",
        selected && "ring-2 ring-offset-2 ring-blue-500"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      <div
        className={cn(
          "flex items-center justify-center w-16 h-16 bg-white shadow-md",
          shape,
          isDiamond && "w-12 h-12"
        )}
        style={{
          backgroundColor: bgColor,
          opacity: 0.9,
        }}
      >
        <span
          className={cn(
            "text-white text-xs font-medium text-center px-1 truncate",
            isDiamond && "[-rotate-45]"
          )}
        >
          {displayLabel}
        </span>
      </div>

      {nodeData.async && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
      )}

      {nodeData.description && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap">
          {nodeData.description.slice(0, 10)}...
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  )
})

CustomNode.displayName = "CustomNode"

export const StartNode = memo(({ data, selected }: NodeProps) => {
  const { t } = useTranslation()
  const nodeData = data as unknown as CustomNodeData
  const displayLabel = nodeData.labelKey
    ? t(nodeData.labelKey, { defaultValue: nodeData.label })
    : nodeData.label || t("flow.startNode")

  return (
    <div
      className={cn(
        "flex items-center justify-center w-16 h-16 rounded-full bg-primary shadow-md transition-all",
        selected && "ring-2 ring-offset-2 ring-primary"
      )}
    >
      <span className="text-primary-foreground font-medium">
        {displayLabel}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary-foreground !border-2 !border-primary"
      />
    </div>
  )
})

StartNode.displayName = "StartNode"

export const EndNode = memo(({ data, selected }: NodeProps) => {
  const { t } = useTranslation()
  const nodeData = data as unknown as CustomNodeData
  const displayLabel = nodeData.labelKey
    ? t(nodeData.labelKey, { defaultValue: nodeData.label })
    : nodeData.label || t("flow.endNode")

  return (
    <div
      className={cn(
        "flex items-center justify-center w-16 h-16 rounded-full bg-destructive shadow-md transition-all",
        selected && "ring-2 ring-offset-2 ring-destructive"
      )}
    >
      <span className="text-destructive-foreground font-medium">
        {displayLabel}
      </span>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-destructive-foreground !border-2 !border-destructive"
      />
    </div>
  )
})

EndNode.displayName = "EndNode"

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const { t } = useTranslation()
  const nodeData = data as unknown as CustomNodeData
  const displayLabel = nodeData.labelKey
    ? t(nodeData.labelKey, { defaultValue: nodeData.label })
    : nodeData.label || t("flow.conditionNode")

  return (
    <div
      className={cn(
        "relative transition-all",
        selected && "ring-2 ring-offset-2 ring-yellow-500"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-border"
      />

      <div className="w-0 h-0 border-l-[30px] border-r-[30px] border-b-[50px] border-l-transparent border-r-transparent border-b-secondary" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-secondary-foreground text-xs font-medium">
          {displayLabel}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!w-3 !h-3 !bg-destructive !border-2 !border-background"
      />
    </div>
  )
})

ConditionNode.displayName = "ConditionNode"

export const nodeTypesMap = {
  custom: CustomNode,
  start: StartNode,
  end: EndNode,
  condition: ConditionNode,
}
