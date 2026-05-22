"use client";

import { useEffect, useState } from "react";

import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";

import {
  createTask,
  uploadTaskFile,
  showTaskFile,
  approvalList,
  approveTask,
} from "@/api/tasksapi";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";

import {
  Plus,
  ListTodo,
  Upload,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Download,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TaskPage() {
  const {
    selectedWorkspace,
    isAdmin,
  } = useWorkspaceStore();

  const { user } = useAuthStore();

  const {
    tasks,
    fetchTasks,
    loading,
  } = useTaskStore();

  const [isDialogOpen, setIsDialogOpen] =
    useState(false);

  const [isCreating, setIsCreating] =
    useState(false);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "approvals">("files");
  
  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [taskApprovals, setTaskApprovals] = useState<any[]>([]);
  
  const [approvalStatus, setApprovalStatus] = useState("approved");
  const [approvalComment, setApprovalComment] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [uploadDialogOpen, setUploadDialogOpen] =
    useState(false);

  const [selectedTaskId, setSelectedTaskId] =
    useState<number | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [formData, setFormData] =
    useState({
      title: "",
      description: "",
      task_type: "",
      platform: "",
      priority: "Medium",
      status: "Briefed",
      deadline: "",
      estimated_hours: 4,
    });

  useEffect(() => {
    if (selectedWorkspace) {
      fetchTasks(selectedWorkspace.id);
    }
  }, [selectedWorkspace, fetchTasks]);

  const handleCreateTask = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!selectedWorkspace) return;

    setIsCreating(true);

    try {
      await createTask(
        selectedWorkspace.id,
        formData
      );

      toast.success(
        "Task created successfully"
      );

      setIsDialogOpen(false);

      setFormData({
        title: "",
        description: "",
        task_type: "",
        platform: "",
        priority: "Medium",
        status: "Briefed",
        deadline: "",
        estimated_hours: 4,
      });

      fetchTasks(selectedWorkspace.id);
    } catch (error) {
      toast.error(
        "Failed to create task"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedTaskId) {
      toast.error(
        "Please select a file"
      );
      return;
    }

    setIsUploading(true);

    try {
      await uploadTaskFile(
        selectedTaskId,
        selectedFile
      );

      toast.success(
        "File uploaded successfully"
      );

      setUploadDialogOpen(false);

      setSelectedFile(null);
    } catch (error) {
      toast.error(
        "Failed to upload file"
      );
    } finally {
      setIsUploading(false);
    }
  };
  const openTaskDetails = async (taskId: number) => {
    setSelectedTaskId(taskId);
    setDetailsDialogOpen(true);
    setActiveTab("files");
    setIsLoadingDetails(true);
    try {
      const [files, approvals] = await Promise.all([
        showTaskFile(taskId),
        approvalList(taskId)
      ]);
      setTaskFiles(files || []);
      setTaskApprovals(approvals || []);
    } catch (error) {
      toast.error("Failed to load task details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleApproveSubmit = async () => {
    if (!selectedTaskId) return;
    setIsSubmittingApproval(true);
    try {
      await approveTask(selectedTaskId, {
        status: approvalStatus,
        comment: approvalComment
      });
      toast.success("Approval decision submitted successfully");
      
      const approvals = await approvalList(selectedTaskId);
      setTaskApprovals(approvals || []);
      
      setApprovalComment("");
      setApprovalStatus("approved");
      
      if (selectedWorkspace) fetchTasks(selectedWorkspace.id);
    } catch (error) {
      toast.error("Failed to submit approval");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const getApprovalIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle className="text-green-500 h-5 w-5" />;
      case 'rejected': return <XCircle className="text-red-500 h-5 w-5" />;
      case 'rework': return <RefreshCw className="text-yellow-500 h-5 w-5" />;
      default: return <Clock className="text-gray-500 h-5 w-5" />;
    }
  };

  const getPriorityColor = (
    priority: string
  ) => {
    switch (priority) {
      case "Critical":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

      case "High":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";

      case "Medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";

      case "Low":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";

      default:
        return "";
    }
  };

  if (!selectedWorkspace) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">
          Please select a workspace to
          view tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tasks
          </h1>

          <p className="text-muted-foreground mt-2">
            Manage tasks for{" "}
            {selectedWorkspace.name}
          </p>
        </div>

        {/* CREATE TASK */}
        {isAdmin && (
          <Dialog
            open={isDialogOpen}
            onOpenChange={
              setIsDialogOpen
            }
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Create New Task
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={
                  handleCreateTask
                }
                className="space-y-5 mt-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  {/* TITLE */}
                  <div className="space-y-2 col-span-2">
                    <Label>
                      Task Title
                    </Label>

                    <Input
                      required
                      value={
                        formData.title
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          title:
                            e.target
                              .value,
                        })
                      }
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div className="space-y-2 col-span-2">
                    <Label>
                      Description
                    </Label>

                    <Input
                      value={
                        formData.description
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description:
                            e.target
                              .value,
                        })
                      }
                    />
                  </div>

                  {/* TASK TYPE */}
                  <div className="space-y-2">
                    <Label>
                      Task Type
                    </Label>

                    <Input
                      required
                      placeholder="Banner / Poster"
                      value={
                        formData.task_type
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          task_type:
                            e.target
                              .value,
                        })
                      }
                    />
                  </div>

                  {/* PLATFORM */}
                  <div className="space-y-2">
                    <Label>
                      Platform
                    </Label>

                    <Input
                      required
                      placeholder="Instagram"
                      value={
                        formData.platform
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platform:
                            e.target
                              .value,
                        })
                      }
                    />
                  </div>

                  {/* PRIORITY */}
                  <div className="space-y-2">
                    <Label>
                      Priority
                    </Label>

                    <Select
                      value={
                        formData.priority
                      }
                      onValueChange={(
                        value
                      ) =>
                        setFormData({
                          ...formData,
                          priority:
                            value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="Critical">
                          Critical
                        </SelectItem>

                        <SelectItem value="High">
                          High
                        </SelectItem>

                        <SelectItem value="Medium">
                          Medium
                        </SelectItem>

                        <SelectItem value="Low">
                          Low
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* DEADLINE */}
                  <div className="space-y-2">
                    <Label>
                      Deadline
                    </Label>

                    <Input
                      required
                      type="date"
                      value={
                        formData.deadline
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deadline:
                            e.target
                              .value,
                        })
                      }
                    />
                  </div>

                  {/* ESTIMATED HOURS */}
                  <div className="space-y-2">
                    <Label>
                      Est. Hours
                    </Label>

                    <Input
                      type="number"
                      min={1}
                      value={
                        formData.estimated_hours
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_hours:
                            parseInt(
                              e.target
                                .value
                            ) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setIsDialogOpen(
                        false
                      )
                    }
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={
                      isCreating
                    }
                  >
                    {isCreating
                      ? "Creating..."
                      : "Create Task"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* TASK TABLE */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ListTodo className="h-12 w-12 text-muted-foreground/40 mb-4" />

          <h3 className="text-lg font-medium">
            No tasks found
          </h3>

          <p className="text-muted-foreground text-sm mt-2">
            {isAdmin
              ? "Create a task to get started."
              : "No tasks assigned yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  Title
                </TableHead>

                <TableHead>
                  Type
                </TableHead>

                <TableHead>
                  Platform
                </TableHead>

                <TableHead>
                  Priority
                </TableHead>

                <TableHead>
                  Status
                </TableHead>

                <TableHead>
                  Deadline
                </TableHead>

                <TableHead>
                  Est. Hrs
                </TableHead>

                <TableHead>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {tasks.map((task) => (
                <TableRow
                  key={task.id}
                >
                  <TableCell className="font-medium">
                    {task.title}
                  </TableCell>

                  <TableCell>
                    {
                      task.task_type
                    }
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {
                      task.platform
                    }
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={`border-0 ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {
                        task.priority
                      }
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {
                        task.status
                      }
                    </Badge>
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {new Date(
                      task.deadline
                    ).toLocaleDateString()}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {
                      task.estimated_hours
                    }
                    h
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Upload File"
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setUploadDialogOpen(true);
                        }}
                      >
                        <Upload size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Details & Approvals"
                        onClick={() => openTaskDetails(task.id)}
                      >
                        <Eye size={18} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* FILE UPLOAD DIALOG */}
      <Dialog
        open={uploadDialogOpen}
        onOpenChange={
          setUploadDialogOpen
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Upload Task File
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Select File
              </Label>

              <Input
                type="file"
                onChange={(e) => {
                  if (
                    e.target.files?.[0]
                  ) {
                    setSelectedFile(
                      e.target
                        .files[0]
                    );
                  }
                }}
              />
            </div>

            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected:{" "}
                {
                  selectedFile.name
                }
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setUploadDialogOpen(
                    false
                  )
                }
              >
                Cancel
              </Button>

              <Button
                onClick={
                  handleFileUpload
                }
                disabled={
                  isUploading
                }
              >
                {isUploading
                  ? "Uploading..."
                  : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TASK DETAILS DIALOG */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Details & Approvals</DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 border-b pb-2 mt-4">
            <Button 
              variant={activeTab === "files" ? "default" : "ghost"} 
              onClick={() => setActiveTab("files")}
            >
              <FileText className="mr-2 h-4 w-4" /> Files
            </Button>
            <Button 
              variant={activeTab === "approvals" ? "default" : "ghost"} 
              onClick={() => setActiveTab("approvals")}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Approvals
            </Button>
          </div>

          <div className="py-4">
            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : activeTab === "files" ? (
              <div className="space-y-4">
                {taskFiles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No files uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {taskFiles.map((file) => (
                      <Card key={file.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex flex-col truncate pr-2">
                            <span className="font-medium truncate" title={file.file.split('/').pop()}>
                              {file.file.split('/').pop()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(file.uploaded_at).toLocaleString()}
                            </span>
                          </div>
                          <a href={file.file} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* APPROVAL CHAIN */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Approval Chain</h3>
                  {taskApprovals.length === 0 ? (
                    <p className="text-muted-foreground">No approvals configured for this task.</p>
                  ) : (
                    <div className="space-y-3">
                      {taskApprovals.map((approval) => (
                        <div key={approval.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                          {getApprovalIcon(approval.status)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{approval.approver_name}</span>
                              <Badge variant="outline" className="capitalize">{approval.status}</Badge>
                            </div>
                            {approval.comment && (
                              <p className="text-sm mt-2 text-muted-foreground bg-muted p-2 rounded-md">
                                "{approval.comment}"
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                              Updated: {new Date(approval.updated_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DECISION FORM */}
                {taskApprovals.some(a => a.approver === user?.id && a.status === 'pending') && (
                  <div className="pt-4 border-t space-y-4">
                    <h3 className="font-medium text-lg">Submit Your Decision</h3>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Decision</Label>
                        <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved">Approve</SelectItem>
                            <SelectItem value="rework">Request Rework</SelectItem>
                            <SelectItem value="rejected">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Comments</Label>
                        <textarea 
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Add your feedback..."
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                        />
                      </div>
                      
                      <Button 
                        onClick={handleApproveSubmit} 
                        disabled={isSubmittingApproval || (approvalStatus !== 'approved' && !approvalComment.trim())}
                      >
                        {isSubmittingApproval ? "Submitting..." : "Submit Decision"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}