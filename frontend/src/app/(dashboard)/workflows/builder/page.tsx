"use client";

import { useCallback, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Play,
  ArrowLeft,
  FileUp,
  Webhook,
  Clock,
  FileBox,
  Mail,
  Bell,
  Code,
} from "lucide-react";
import Link from "next/link";
import { TriggerNode } from "@/components/workflow/trigger-node";
import { ActionNode } from "@/components/workflow/action-node";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
};

const initialNodes: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 250, y: 100 },
    data: {
      label: "File Upload",
      icon: "FileUp",
      description: "When a DXF file is uploaded",
    },
  },
];

const initialEdges: Edge[] = [];

const triggerOptions = [
  {
    id: "file-upload",
    label: "File Upload",
    icon: FileUp,
    description: "When a file is uploaded",
  },
  {
    id: "webhook",
    label: "Webhook",
    icon: Webhook,
    description: "When a webhook is received",
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: Clock,
    description: "Run on a schedule",
  },
];

const actionOptions = [
  {
    id: "parse-dxf",
    label: "Parse DXF",
    icon: FileBox,
    description: "Extract metadata from DXF files",
  },
  {
    id: "send-email",
    label: "Send Email",
    icon: Mail,
    description: "Send an email notification",
  },
  {
    id: "notification",
    label: "Notification",
    icon: Bell,
    description: "Send a push notification",
  },
  {
    id: "custom-code",
    label: "Custom Code",
    icon: Code,
    description: "Run custom JavaScript/Python",
  },
];

export default function WorkflowBuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [selectedPanel, setSelectedPanel] = useState<"triggers" | "actions">(
    "actions"
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (
    type: "trigger" | "action",
    data: { label: string; icon: string; description: string }
  ) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: {
        x: Math.random() * 300 + 200,
        y: Math.random() * 200 + 150,
      },
      data,
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges,
    };
    console.log("Saving workflow:", workflow);
    alert("Workflow saved! (Check console for data)");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="font-semibold text-lg border-0 bg-transparent focus-visible:ring-0 w-64"
          />
          <Badge variant="outline">Draft</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Test Run
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-72 border-r bg-background p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <div className="flex gap-2 mb-4">
                <Button
                  variant={selectedPanel === "triggers" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPanel("triggers")}
                  className="flex-1"
                >
                  Triggers
                </Button>
                <Button
                  variant={selectedPanel === "actions" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPanel("actions")}
                  className="flex-1"
                >
                  Actions
                </Button>
              </div>

              {selectedPanel === "triggers" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase">
                    Available Triggers
                  </Label>
                  {triggerOptions.map((trigger) => (
                    <Card
                      key={trigger.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() =>
                        addNode("trigger", {
                          label: trigger.label,
                          icon: trigger.id,
                          description: trigger.description,
                        })
                      }
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center">
                          <trigger.icon className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{trigger.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {trigger.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {selectedPanel === "actions" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase">
                    Available Actions
                  </Label>
                  {actionOptions.map((action) => (
                    <Card
                      key={action.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() =>
                        addNode("action", {
                          label: action.label,
                          icon: action.id,
                          description: action.description,
                        })
                      }
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-green-500/10 flex items-center justify-center">
                          <action.icon className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{action.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/30"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Panel position="bottom-center" className="mb-4">
              <Card>
                <CardContent className="p-2 text-xs text-muted-foreground">
                  Drag nodes from the sidebar • Connect nodes by dragging from
                  handles • Click a node to configure
                </CardContent>
              </Card>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
