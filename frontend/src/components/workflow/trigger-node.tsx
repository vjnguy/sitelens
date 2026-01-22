"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { FileUp, Webhook, Clock } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "file-upload": FileUp,
  FileUp: FileUp,
  webhook: Webhook,
  schedule: Clock,
};

interface TriggerNodeData {
  label: string;
  icon: string;
  description: string;
}

export const TriggerNode = memo(({ data }: NodeProps<TriggerNodeData>) => {
  const Icon = iconMap[data.icon] || FileUp;

  return (
    <div className="bg-background border-2 border-blue-500 rounded-lg shadow-md min-w-[200px]">
      <div className="bg-blue-500 text-white px-3 py-1 rounded-t-md text-xs font-medium">
        Trigger
      </div>
      <div className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded bg-blue-500/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <p className="font-medium text-sm">{data.label}</p>
          <p className="text-xs text-muted-foreground">{data.description}</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
});

TriggerNode.displayName = "TriggerNode";
