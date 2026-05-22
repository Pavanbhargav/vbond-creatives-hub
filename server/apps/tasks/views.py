# views.py
from rest_framework import generics,status
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import Task, TaskFile
from apps.workspace.models import Workspace, WorkspaceMembers
from .serializers import TaskSerializer,TaskFileSerializer,ApprovalSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Approvals
class TaskListCreateView(generics.ListCreateAPIView):
    """
    GET /api/workspaces/<workspace_id>/tasks/
    - Admins get all tasks in the workspace.
    - Members get ONLY tasks assigned to them.
    
    POST /api/workspaces/<workspace_id>/tasks/
    - Only Admins can create tasks.
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.kwargs.get('workspace_id')
        
        # 1. Check if the user is actually in this workspace
        try:
            membership = WorkspaceMembers.objects.get(
                workspace_id=workspace_id, 
                user=self.request.user
            )
            
        
        except WorkspaceMembers.DoesNotExist:
            raise PermissionDenied("You do not have access to this workspace.")

        # 2. If Admin, return ALL tasks for this workspace
        if membership.role == 'admin':   
            return Task.objects.filter(workspace_id=workspace_id)
        
        # 3. If Member, return ONLY tasks assigned to them
        return Task.objects.filter(workspace_id=workspace_id, assignee=self.request.user)

    def perform_create(self, serializer):
        workspace_id = self.kwargs.get('workspace_id')
        workspace = get_object_or_404(Workspace, id=workspace_id)

        # 1. Rule Check: Requesting user MUST be an admin
        try:
            membership = WorkspaceMembers.objects.get(
                workspace=workspace, 
                user=self.request.user
            )
            if membership.role != 'admin':
                raise PermissionDenied("Only workspace admins can create tasks.")
        except WorkspaceMembers.DoesNotExist:
            raise PermissionDenied("You do not have access to this workspace.")

        # 2. Save the task, automatically injecting the workspace and the creator
        serializer.save(
            workspace=workspace, 
            created_by=self.request.user
        )

class TaskUploadView(APIView):
    """
    POST /api/tasks/<task_id>/upload/
    - Allows uploading files to a specific task.
    - Only the assignee or workspace admins can upload files.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = MultiPartParser, FormParser


    def post(self,request,task_id):
        task = get_object_or_404(Task, id=task_id)
        is_assignee = (task.assignee == request.user)
        is_admin = WorkspaceMembers.objects.filter(workspace=task.workspace,user = request.user, role='admin').exists()
        if not (is_assignee or is_admin):
            raise PermissionDenied("Only the task assignee or workspace admins can upload files.")
        files = request.FILES.getlist('file')
        if not files:
            return Response(
                {"error": "No files provided. Please attach files using the 'file' key."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        uploaded_files = []
        for f in files:
            task_file = TaskFile.objects.create(
                task=task,
                user=request.user,
                file=f
            )
            # Serialize the saved file to return to the frontend
            uploaded_files.append(TaskFileSerializer(task_file).data)

        return Response({
            "detail": f"Successfully uploaded {len(files)} file(s).",
            "files": uploaded_files
        }, status=status.HTTP_201_CREATED)

class FileView(generics.ListAPIView):
    serializer_class = TaskFileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        task_id = self.kwargs.get("task_id")

        task = get_object_or_404(
            Task,
            id=task_id
        )

        # Permission check
        is_workspace_member = WorkspaceMembers.objects.filter(
            workspace=task.workspace,
            user=self.request.user
        ).exists()

        if not is_workspace_member:
            raise PermissionDenied(
                "You do not have access to these files."
            )

        return TaskFile.objects.filter(
            task=task
        ).select_related("user")

class TaskApprovalListView(generics.ListAPIView):
    """
    GET /api/tasks/<task_id>/approvals/
    Returns the full approval chain for a specific task.
    """
    serializer_class = ApprovalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        task_id = self.kwargs.get('task_id')
        # Return all approvals for this task, ordered by creation
        return Approvals.objects.filter(task_id=task_id).order_by('id')


class SubmitApprovalDecisionView(generics.UpdateAPIView):
    """
    PATCH /api/tasks/<task_id>/approve/
    Allows the logged-in user to submit their decision (status and comment).
    Automatically updates the parent Task if necessary.
    """
    serializer_class = ApprovalSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        task_id = self.kwargs.get('task_id')
        
        # 1. Securely fetch the exact approval record for the LOGGED-IN user.
        # This prevents User A from approving on behalf of User B.
        approval = get_object_or_404(
            Approvals, 
            task_id=task_id, 
            approver=self.request.user
        )
        return approval

    def perform_update(self, serializer):
        # 2. Save the user's decision ('approved', 'rework', etc.) and their comment
        approval = serializer.save()
        
        # 3. MAGIC LOGIC: Check if we need to update the main Task status!
        task = approval.task
        
        # Grab all approval records for this task
        all_approvals = Approvals.objects.filter(task=task)
        
        # Rule A: If ANY single person says 'rework', the entire task goes back to Rework.
        if all_approvals.filter(status='rework').exists():
            if task.status != 'Rework':
                task.status = 'Rework'
                task.reworks += 1
                task.save()
                
        # Rule B: If ALL people have said 'approved', the task is officially Approved!
        # (Meaning: there are no records that are NOT 'approved')
        elif not all_approvals.exclude(status='approved').exists():
            if task.status != 'Approved':
                task.status = 'Approved'
                task.approved_at = timezone.now()
                task.save()
        