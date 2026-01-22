import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  Layers,
  Database,
  Activity,
  Plus,
  ArrowRight,
  MapPin,
  Brain,
  Globe,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const fullName = "Developer";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {fullName}</h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your GIS projects
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Create your first project
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Layers</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Add GeoJSON or connect APIs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Connected sources</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Analyses</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Create your first GIS project in minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">New Project</p>
                  <p className="text-sm text-muted-foreground">
                    Start a map workspace
                  </p>
                </div>
              </div>
              <Link href="/projects">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Connect Data</p>
                  <p className="text-sm text-muted-foreground">
                    Add property or spatial data
                  </p>
                </div>
              </div>
              <Link href="/datasources">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">AI Assistant</p>
                  <p className="text-sm text-muted-foreground">
                    Ask spatial questions
                  </p>
                </div>
              </div>
              <Link href="/assistant">
                <Button size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest analyses and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No activity yet</p>
              <p className="text-sm text-muted-foreground">
                Create a project to see activity here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Available Data Sources</CardTitle>
          <CardDescription>
            Connect to Australian open data and property APIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Data.gov.au", status: "available", color: "bg-blue-500", icon: Globe },
              { name: "NSW Spatial", status: "available", color: "bg-green-600", icon: MapPin },
              { name: "VIC Planning", status: "coming soon", color: "bg-purple-500", icon: Layers },
              { name: "QLD Globe", status: "coming soon", color: "bg-orange-500", icon: Globe },
            ].map((source) => (
              <div
                key={source.name}
                className="flex items-center gap-3 p-4 border rounded-lg"
              >
                <div
                  className={`h-10 w-10 rounded-lg ${source.color}/10 flex items-center justify-center`}
                >
                  <source.icon className={`h-5 w-5 ${source.color.replace("bg-", "text-")}`} />
                </div>
                <div>
                  <p className="font-medium">{source.name}</p>
                  <Badge
                    variant={
                      source.status === "available" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {source.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Link href="/datasources">
              <Button variant="outline" className="gap-2">
                View All Sources
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
