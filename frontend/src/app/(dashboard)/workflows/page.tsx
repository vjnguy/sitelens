import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, GitBranch, Play, Pause, Settings, Clock } from "lucide-react";

export default function WorkflowsPage() {
  const workflows: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    lastRun: string | null;
    executionCount: number;
  }[] = [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your automation workflows
          </p>
        </div>
        <Link href="/workflows/builder">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </Link>
      </div>

      {/* Workflow Templates */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Start Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="text-base">DXF File Monitor</CardTitle>
              <CardDescription>
                Watch a folder and extract metadata when new DXF files are added
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">Trigger: File Upload</Badge>
                <Badge variant="outline">Action: Parse DXF</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="text-base">Version Notification</CardTitle>
              <CardDescription>
                Send Slack/email notifications when CAD files are updated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">Trigger: File Change</Badge>
                <Badge variant="outline">Action: Notify</Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="text-base">Daily Report</CardTitle>
              <CardDescription>
                Generate a daily summary of all CAD file changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">Trigger: Schedule</Badge>
                <Badge variant="outline">Action: Report</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active Workflows */}
      {workflows.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Workflows</h2>
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GitBranch className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{workflow.name}</p>
                        <Badge
                          variant={workflow.isActive ? "success" : "secondary"}
                        >
                          {workflow.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {workflow.description}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last run: {workflow.lastRun || "Never"}
                        </span>
                        <span>{workflow.executionCount} executions</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon">
                      {workflow.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Link href={`/workflows/builder?id=${workflow.id}`}>
                      <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create your first workflow to automate your engineering processes.
              Start with a template or build from scratch.
            </p>
            <Link href="/workflows/builder">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Workflow
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
