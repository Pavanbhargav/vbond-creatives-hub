"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuthStore } from "@/store/authStore";
import {
  getTasks,
  getPendingApprovals,
  approvalList,
  showTaskFile,
  approveTask,
  uploadTaskFile,
  getTaskHistory,
} from "@/api/tasksapi";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Paperclip,
  Upload,
  Download,
  User as UserIcon,
} from "lucide-react";

function ApprovalHubContent() {
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get("taskId");

  const { selectedWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();

  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [taskApprovals, setTaskApprovals] = useState<any[]>([]);
  const [taskHistory, setTaskHistory] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Approval Form State
  const [approvalComment, setApprovalComment] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Upload State
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleFileDownload = async (e: React.MouseEvent<HTMLAnchorElement>, fileUrl: string, fileName: string) => {
    e.preventDefault();
    try {
      toast.info(`Downloading ${fileName}...`);
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      // Fallback: just open in new tab
      window.open(fileUrl, '_blank');
    }
  };

  useEffect(() => {
    if (selectedWorkspace) {
      fetchSidebarData();
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    if (activeTasks.length > 0 && initialTaskId && !selectedTask) {
      const task = activeTasks.find((t) => t.id === Number(initialTaskId));
      if (task) handleSelectTask(task);
    }
  }, [activeTasks, initialTaskId]);

  const fetchSidebarData = async () => {
    if (!selectedWorkspace) return;
    setLoading(true);
    try {
      const [allTasks, pending] = await Promise.all([
        getTasks(selectedWorkspace.id),
        getPendingApprovals(selectedWorkspace.id),
      ]);
      setActiveTasks(allTasks || []);
      setPendingTasks(pending || []);
      
      // Auto-select first pending task if none selected and no initialTaskId
      if (pending?.length > 0 && !selectedTask && !initialTaskId) {
        handleSelectTask(pending[0]);
      }
    } catch (error) {
      toast.error("Failed to load approval hub data");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTask = async (task: any) => {
    setSelectedTask(task);
    setLoadingDetails(true);
    setFileToUpload(null);
    setApprovalComment("");
    try {
      const [files, approvals, history] = await Promise.all([
        showTaskFile(task.id),
        approvalList(task.id),
        getTaskHistory(task.id),
      ]);
      setTaskFiles(files || []);
      setTaskApprovals(approvals || []);
      setTaskHistory(history || []);
    } catch (error) {
      toast.error("Failed to load task details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDecision = async (status: "approved" | "rework" | "rejected") => {
    if (!selectedTask) return;
    if (status !== "approved" && !approvalComment.trim()) {
      toast.error("Please provide a comment for rework/rejection.");
      return;
    }

    setIsSubmittingApproval(true);
    try {
      await approveTask(selectedTask.id, {
        status,
        comment: approvalComment,
      });
      toast.success(`Task ${status} successfully`);
      
      // Refresh details
      const [approvals, history] = await Promise.all([
        approvalList(selectedTask.id),
        getTaskHistory(selectedTask.id)
      ]);
      setTaskApprovals(approvals || []);
      setTaskHistory(history || []);
      setApprovalComment("");

      // Refresh sidebar to update pending count
      if (selectedWorkspace) fetchSidebarData();
    } catch (error) {
      toast.error("Failed to submit decision");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedTask || !fileToUpload) return;
    setIsUploading(true);
    try {
      await uploadTaskFile(selectedTask.id, fileToUpload);
      toast.success("File uploaded successfully");
      const files = await showTaskFile(selectedTask.id);
      setTaskFiles(files || []);
      setFileToUpload(null);
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved": return "text-green-500 border-green-500/20 bg-green-500/10";
      case "rework": return "text-red-500 border-red-500/20 bg-red-500/10";
      case "in review": return "text-yellow-500 border-yellow-500/20 bg-yellow-500/10";
      case "in progress": return "text-blue-500 border-blue-500/20 bg-blue-500/10";
      case "submitted": return "text-purple-500 border-purple-500/20 bg-purple-500/10";
      default: return "text-muted-foreground border-muted";
    }
  };

  const getApprovalIcon = (status: string) => {
    switch(status) {
      case 'approved': return <CheckCircle className="text-green-500 h-4 w-4" />;
      case 'rejected': return <XCircle className="text-red-500 h-4 w-4" />;
      case 'rework': return <RefreshCw className="text-red-500 h-4 w-4" />;
      default: return <Clock className="text-yellow-500 h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col p-4 bg-background text-foreground">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Approval Hub</h1>
          <p className="text-xs text-muted-foreground mt-1">Multi-level review • Rework cycles • Revision trail • Full transparency</p>
        </div>
        <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-lg border">
          <span className="text-sm text-muted-foreground">Acting as:</span>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user?.username?.substring(0, 2).toUpperCase() || <UserIcon size={12} />}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{user?.username}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* PENDING REVIEW */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <span className="text-yellow-500">⚡</span>
              <h3 className="font-semibold">Pending Review</h3>
              <Badge className="bg-primary hover:bg-primary/90 rounded-full px-2 py-0.5 text-xs">
                {pendingTasks.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {pendingTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 italic">No tasks pending your review.</p>
              ) : (
                pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border-l-4 ${
                      selectedTask?.id === task.id
                        ? "bg-muted border-l-yellow-500 border-t border-r border-b border-border shadow-md"
                        : "bg-card border-l-transparent border-t border-r border-b border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <h4 className="font-medium text-sm line-clamp-1">{task.title}</h4>
                    <div className="flex gap-1 mt-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      <span className="w-2 h-2 rounded-full bg-yellow-500/30"></span>
                      <span className="w-2 h-2 rounded-full bg-yellow-500/30"></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ALL ACTIVE TASKS */}
          <div className="space-y-3">
            <div className="px-2">
              <h3 className="font-semibold">All Active Tasks</h3>
            </div>
            
            <div className="space-y-2">
              {activeTasks.filter(t => !pendingTasks.find(p => p.id === t.id)).map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border-l-4 ${
                    selectedTask?.id === task.id
                      ? "bg-muted border-l-blue-500 border-t border-r border-b border-border shadow-md"
                      : "bg-card border-l-transparent border-t border-r border-b border-transparent hover:bg-muted/50"
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      task.status === "Approved" ? "text-green-500" :
                      task.status === "Rework" ? "text-red-500" :
                      task.status === "In Review" ? "text-yellow-500" :
                      task.status === "In Progress" ? "text-blue-500" :
                      task.status === "Submitted" ? "text-purple-500" :
                      "text-muted-foreground"
                    }`}>
                      {task.status}
                    </span>
                    <h4 className="text-sm line-clamp-2">{task.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 bg-card rounded-2xl border overflow-y-auto custom-scrollbar flex flex-col">
          {!selectedTask ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a task from the sidebar to view details
            </div>
          ) : loadingDetails ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : (
            <div className="p-8 space-y-8">
              
              {/* HEADER SECTION */}
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-3">{selectedTask.title}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`font-semibold ${getStatusColor(selectedTask.status)}`}>
                        {selectedTask.status}
                      </Badge>
                      <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5 inline-block"></span>
                        {selectedTask.priority}
                      </Badge>
                      <Badge variant="secondary" className="border-none">
                        {selectedTask.task_type}
                      </Badge>
                      <Badge variant="secondary" className="border-none">
                        {selectedTask.platform}
                      </Badge>
                    </div>
                  </div>
                  </div>
                {selectedTask.description && (
                  <p className="mt-4 text-muted-foreground text-sm leading-relaxed max-w-3xl">
                    {selectedTask.description}
                  </p>
                )}
              </div>

              {/* METADATA SECTION */}
              <div className="pt-6 border-t">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Metadata</h4>
                  <div className="flex gap-6 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">Created</span>
                      <span className="font-bold text-sm">
                        {new Date(selectedTask.created_at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">Deadline</span>
                      <span className="font-bold text-sm">
                        {new Date(selectedTask.deadline).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">Reworks</span>
                      <span className="font-bold text-yellow-600 text-sm">{selectedTask.reworks}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">Actual Hours</span>
                      <span className="font-bold text-red-500 text-sm">{selectedTask.actual_hours || 0}h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SUBMITTED FILES */}
              <div className="pt-6 border-t">
                <h4 className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-4">Submitted Files</h4>
                
                {taskFiles.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">No files submitted yet.</div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {taskFiles.map((file) => (
                      <a 
                        key={file.id} 
                        href={file.file} 
                        onClick={(e) => handleFileDownload(e, file.file, file.file.split('/').pop() || 'download')}
                        className="flex items-center gap-2 bg-muted hover:bg-muted/80 transition-colors border rounded-full pl-3 pr-4 py-1.5 group"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600 line-clamp-1 max-w-[150px]">
                          {file.file.split('/').pop()}
                        </span>
                        <Download className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors ml-1" />
                      </a>
                    ))}
                  </div>
                )}
                
                {/* File Upload UI */}
                {/* Only show upload UI if user is assignee or admin */}
                {(selectedTask.assignee === user?.id || useWorkspaceStore.getState().isAdmin) && (
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 bg-muted hover:bg-muted/80 transition-colors rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        <Paperclip className="h-3.5 w-3.5" />
                        {fileToUpload ? fileToUpload.name : "Attach new file"}
                      </div>
                    </label>
                    {fileToUpload && (
                      <Button 
                        size="sm" 
                        onClick={handleFileUpload} 
                        disabled={isUploading}
                        className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isUploading ? "Uploading..." : "Upload"}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* MULTI-LEVEL APPROVAL CHAIN */}
              <div className="pt-8 border-t">
                <h4 className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-4">Multi-Level Approval Chain</h4>
                
                {taskApprovals.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">No approval chain configured for this task.</div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {taskApprovals.map((approval, index) => {
                      const isCurrentUser = approval.approver === user?.id;
                      const isPending = approval.status === 'pending';
                      
                      return (
                        <div 
                          key={approval.id} 
                          className={`min-w-[280px] p-4 rounded-xl border flex flex-col gap-4 ${
                            isCurrentUser && isPending 
                              ? "bg-card border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]" 
                              : "bg-muted/30 border-border"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className={`text-xs font-bold text-white ${
                                  approval.status === 'approved' ? 'bg-green-600' :
                                  approval.status === 'rework' ? 'bg-red-600' :
                                  'bg-orange-500'
                                }`}>
                                  {approval.approver_name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h5 className="font-bold text-sm">{approval.approver_name}</h5>
                                <p className="text-[10px] text-muted-foreground font-medium">Level {index + 1} Approver</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={`uppercase text-[9px] font-bold tracking-wider ${
                              approval.status === 'approved' ? 'text-green-600 border-green-500/30' :
                              approval.status === 'rework' ? 'text-red-600 border-red-500/30' :
                              'text-yellow-600 border-yellow-500/30'
                            }`}>
                              {approval.status}
                            </Badge>
                          </div>
                          
                          {/* Actions for current user if pending */}
                          {isCurrentUser && isPending && (
                            <div className="pt-2 flex flex-col gap-2">
                              <Textarea 
                                placeholder="Add comments/feedback..." 
                                className="bg-background border-border text-sm resize-none min-h-[60px]"
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <Button 
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold h-9"
                                  onClick={() => handleDecision('approved')}
                                  disabled={isSubmittingApproval}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                </Button>
                                <Button 
                                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold h-9"
                                  onClick={() => handleDecision('rework')}
                                  disabled={isSubmittingApproval || !approvalComment.trim()}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" /> Rework
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TIMELINE & COMMENT HISTORY */}
              <div className="pt-8 border-t">
                <h4 className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-4">Task History & Timeline</h4>
                
                {taskHistory.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">No history available yet.</div>
                ) : (
                  <div className="space-y-4 border-l-2 border-muted ml-3">
                    {taskHistory.map((history) => (
                      <div key={history.id} className="relative pl-6 pb-2 last:pb-0">
                        {/* Circle Indicator */}
                        <div className={`absolute -left-3 top-0 h-6 w-6 rounded-full flex items-center justify-center border-2 bg-background ${
                          history.action === 'approved' ? 'border-green-500' : 
                          history.action === 'rework' ? 'border-amber-500' : 
                          history.action === 'file_uploaded' ? 'border-blue-500' :
                          'border-muted-foreground'
                        }`}>
                          {history.action === 'approved' ? <CheckCircle className="h-3 w-3 text-green-500" /> :
                           history.action === 'rework' ? <XCircle className="h-3 w-3 text-amber-500" /> :
                           history.action === 'file_uploaded' ? <Paperclip className="h-3 w-3 text-blue-500" /> :
                           <Clock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        
                        <div className="bg-card border rounded-lg p-3 shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-semibold">{history.username}</span>
                            <Badge variant="outline" className={`text-[10px] uppercase border-0 ${
                              history.action === 'approved' ? 'text-green-600 bg-green-50' :
                              history.action === 'rework' ? 'text-amber-600 bg-amber-50' :
                              history.action === 'file_uploaded' ? 'text-blue-600 bg-blue-50' : ''
                            }`}>
                              {history.action.replace('_', ' ')}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mb-2">
                            {new Date(history.created_at).toLocaleString()}
                          </span>
                          {history.comment && (
                            <p className="text-sm bg-muted/50 p-2 rounded">{history.comment}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ApprovalHubPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>}>
      <ApprovalHubContent />
    </Suspense>
  );
}