"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { FileBox, Mail, Bell, Code } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "parse-dxf": FileBox,
  "send-email": Mail,
  notification: Bell,
  "custom-code": Code,
};

interface ActionNodeData {
  label: string;
  icon: string;
  description: string;
}

export const ActionNode = memo(({ data }: NodeProps<ActionNodeData>) => {
  const Icon = iconMap[data.icon] || FileBox;

  return (
    <div className="bg-background border-2 border-green-500 rounded-lg shadow-md min-w-[200px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-green-500"
      />
      <div className="bg-green-500 text-white px-3 py-1 rounded-t-md text-xs font-medium">
        Action
      </div>
      <div className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded bg-green-500/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-green-500" />
        </div>
        <div>
          <p className="font-medium text-sm">{data.label}</p>
          <p className="text-xs text-muted-foreground">{data.description}</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  );
});

ActionNode.displayName = "ActionNode";
