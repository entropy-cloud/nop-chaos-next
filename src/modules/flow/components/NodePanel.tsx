import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, GripVertical } from "lucide-react"
import type { DragEvent } from "react"
import { useTranslation } from "react-i18next"

interface NodeTypeInfo {
  type: string
  label: string
  labelKey?: string
  color: string
  icon?: string
  description?: string
  nodeType?: string
}

interface NodeGroup {
  name: string
  icon?: string
  nodes: NodeTypeInfo[]
}

const nodeGroups: NodeGroup[] = [
  {
    name: "flow.nodeGroups.basic",
    nodes: [
      {
        type: "start",
        label: "flow.startNode",
        color: "#22c55e",
        nodeType: "start",
        description: "flow.nodeDescriptions.start",
      },
      {
        type: "end",
        label: "flow.endNode",
        color: "#ef4444",
        nodeType: "end",
        description: "flow.nodeDescriptions.end",
      },
    ],
  },
  {
    name: "flow.nodeGroups.flowControl",
    nodes: [
      {
        type: "condition",
        label: "flow.conditionNode",
        color: "#eab308",
        nodeType: "condition",
        description: "flow.nodeDescriptions.condition",
      },
      {
        type: "parallel",
        label: "flow.nodeTypes.parallel",
        color: "#8b5cf6",
        description: "flow.nodeDescriptions.parallel",
      },
      {
        type: "loop",
        label: "flow.nodeTypes.loop",
        color: "#06b6d4",
        description: "flow.nodeDescriptions.loop",
      },
    ],
  },
  {
    name: "flow.nodeGroups.task",
    nodes: [
      {
        type: "task",
        label: "flow.nodeTypes.task",
        color: "#3b82f6",
        description: "flow.nodeDescriptions.task",
      },
      {
        type: "script",
        label: "flow.nodeTypes.script",
        color: "#f97316",
        description: "flow.nodeDescriptions.script",
      },
      {
        type: "api",
        label: "flow.nodeTypes.api",
        color: "#ec4899",
        description: "flow.nodeDescriptions.api",
      },
      {
        type: "email",
        label: "flow.nodeTypes.email",
        color: "#14b8a6",
        description: "flow.nodeDescriptions.email",
      },
    ],
  },
  {
    name: "flow.nodeGroups.dataProcessing",
    nodes: [
      {
        type: "transform",
        label: "flow.nodeTypes.transform",
        color: "#6366f1",
        description: "flow.nodeDescriptions.transform",
      },
      {
        type: "filter",
        label: "flow.nodeTypes.filter",
        color: "#84cc16",
        description: "flow.nodeDescriptions.filter",
      },
      {
        type: "merge",
        label: "flow.nodeTypes.merge",
        color: "#a855f7",
        description: "flow.nodeDescriptions.merge",
      },
    ],
  },
]

interface NodePanelProps {
  onDragStart: (
    event: DragEvent<HTMLDivElement>,
    nodeType: NodeTypeInfo
  ) => void
}

export function NodePanel({ onDragStart }: NodePanelProps) {
  const { t } = useTranslation()
  const [openGroups, setOpenGroups] = useState<string[]>(
    nodeGroups.map((g) => g.name)
  )

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    )
  }

  return (
    <div className="w-56 border-r pr-2 overflow-y-auto">
      <h3 className="font-semibold mb-3 text-sm px-2">
        {t("flow.nodePanelTitle")}
      </h3>
      <div className="space-y-1">
        {nodeGroups.map((group) => (
          <Collapsible
            key={group.name}
            open={openGroups.includes(group.name)}
            onOpenChange={() => toggleGroup(group.name)}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded cursor-pointer">
              <span>{t(group.name)}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  openGroups.includes(group.name) && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 px-1">
              {group.nodes.map((node) => (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, node)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded border cursor-grab hover:shadow-md transition-all active:cursor-grabbing",
                    "border-border"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-white text-xs",
                      node.type === "condition" && "rotate-45 rounded-none",
                      node.type === "start" && "rounded-full",
                      node.type === "end" && "rounded-full"
                    )}
                    style={{ backgroundColor: node.color }}
                  >
                    <span
                      className={node.type === "condition" ? "-rotate-45" : ""}
                    >
                      {t(node.label)[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm truncate">{t(node.label)}</span>
                    </div>
                    {node.description && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {t(node.description)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}

export type { NodeTypeInfo }
