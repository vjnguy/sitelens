"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  MapPin,
  Calendar,
  Layers,
  MoreHorizontal,
  FolderKanban,
} from "lucide-react";
import type { Project } from "@/types/gis";

// Mock projects for development
const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    organization_id: "org-1",
    name: "Brisbane CBD Analysis",
    description: "Property analysis for Brisbane CBD development sites",
    bounds: { west: 151.19, south: -33.88, east: 151.22, north: -33.86 },
    settings: { defaultCenter: [151.2093, -33.8688], defaultZoom: 14 },
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T14:30:00Z",
  },
  {
    id: "2",
    organization_id: "org-1",
    name: "Melbourne Metro Assessment",
    description: "Flood and bushfire overlay analysis",
    bounds: { west: 144.9, south: -37.85, east: 145.0, north: -37.79 },
    settings: { defaultCenter: [144.9631, -37.8136], defaultZoom: 13 },
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-18T11:00:00Z",
  },
];

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projects] = useState<Project[]>(MOCK_PROJECTS);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your GIS projects and map workspaces
          </p>
        </div>
        <Button onClick={() => setShowNewProjectDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Create your first project to start analyzing properties and
              visualizing spatial data.
            </p>
            <Button onClick={() => setShowNewProjectDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="mt-3">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Layers className="h-4 w-4" />
                      <span>0 layers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {(() => {
                          const d = new Date(project.updated_at);
                          return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Badge variant="secondary">GIS</Badge>
                    {project.bounds && <Badge variant="outline">Bounded</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* New Project Card */}
          <Card
            className="border-dashed hover:border-primary transition-colors cursor-pointer flex items-center justify-center min-h-[200px]"
            onClick={() => setShowNewProjectDialog(true)}
          >
            <CardContent className="flex flex-col items-center text-center py-8">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">Create New Project</p>
              <p className="text-sm text-muted-foreground">
                Start a new map workspace
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Project Dialog - simplified for now */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>
                Set up a new GIS project workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input placeholder="My GIS Project" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input placeholder="Optional description..." />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNewProjectDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setShowNewProjectDialog(false)}>
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
