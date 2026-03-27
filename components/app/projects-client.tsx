"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit2, FolderKanban, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createProject, deleteProject, updateProject } from "@/lib/actions/project-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function ProjectForm({
  defaultValues,
  submitLabel,
  onSubmit,
  pending
}: {
  defaultValues?: { name: string; description: string };
  submitLabel: string;
  onSubmit: (values: { name: string; description?: string }) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, description });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Magento Migration"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-description">Description</Label>
        <Textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={pending}>{submitLabel}</Button>
      </DialogFooter>
    </form>
  );
}

export function ProjectsClient({ initialProjects }: { initialProjects: ProjectRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const projects = useMemo(() => initialProjects, [initialProjects]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Create a project and track completed tasks by day.</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>Add a new project workspace.</DialogDescription>
            </DialogHeader>
            <ProjectForm
              submitLabel="Create"
              pending={pending}
              onSubmit={(values) => {
                startTransition(async () => {
                  try {
                    await createProject(values);
                    toast.success("Project created");
                    setCreateOpen(false);
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to create project");
                  }
                });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {!projects.length ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FolderKanban className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground">Create your first project to start logging completed work.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="line-clamp-1 text-base">{project.name}</CardTitle>
                <p className="line-clamp-2 text-sm text-muted-foreground">{project.description || "No description"}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/projects/${project.id}/week`}>Open</Link>
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="outline">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>Update project details.</DialogDescription>
                      </DialogHeader>
                      <ProjectForm
                        defaultValues={{
                          name: project.name,
                          description: project.description ?? ""
                        }}
                        submitLabel="Save"
                        pending={pending}
                        onSubmit={(values) => {
                          startTransition(async () => {
                            try {
                              await updateProject({ id: project.id, ...values });
                              toast.success("Project updated");
                              router.refresh();
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Failed to update project");
                            }
                          });
                        }}
                      />
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete project?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will remove the project and all tasks permanently.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            startTransition(async () => {
                              try {
                                await deleteProject({ id: project.id });
                                toast.success("Project deleted");
                                router.refresh();
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Failed to delete project");
                              }
                            });
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
