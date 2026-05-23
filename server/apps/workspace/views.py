from django.shortcuts import render,get_object_or_404
from rest_framework import generics,status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated,AllowAny
from django.db import transaction
from .models import Workspace, WorkspaceMembers, Team
from .serializers import CreateOrgWorkspaceSerializer, WorkspaceSerializer, TeamSerializer, UpdateWorkspaceMemberRoleSerializer
from apps.accounts.models import User
from django.db import transaction


class CreateOrganizationalWorkspaceView(APIView):
    """
    POST /api/workspaces/create-org/

    Authenticated users can create an Organizational workspace.
    The requesting user is automatically added as an Admin.
    Wrapped in an atomic transaction — if member creation fails,
    the workspace is rolled back too.
    """
    permission_classes = [IsAuthenticated]

    def post(self,request):
        serializer = CreateOrgWorkspaceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            workspace = Workspace.objects.create(
                name=serializer.validated_data['name'],
                workspace_type='organizational'
            )
            WorkspaceMembers.objects.create(
                workspace=workspace,
                user=request.user,
                role='admin'    # Creator becomes admin of org workspace
            )
        return Response(
            WorkspaceSerializer(workspace).data,
            status=status.HTTP_201_CREATED
        )

class ListUserWorkspacesView(generics.ListAPIView):
    """
    GET /api/workspaces/

    Returns all workspaces the authenticated user belongs to.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.filter(
            members__user=self.request.user
        ).prefetch_related('members__user')


class TeamListCreateView(generics.ListCreateAPIView):
    """
    GET /api/workspaces/<workspace_id>/teams/ -> Lists teams for the workspace
    POST /api/workspaces/<workspace_id>/teams/ -> Creates a new team
    """
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.kwargs.get('workspace_id')
        
        is_member = WorkspaceMembers.objects.filter(
            workspace_id=workspace_id, 
            user=self.request.user
        ).exists()
        
        if not is_member:
            raise PermissionDenied("You do not have access to this workspace.")
            
        return Team.objects.filter(workspace_id=workspace_id)

    def perform_create(self, serializer):
        workspace_id = self.kwargs.get('workspace_id')
        workspace = get_object_or_404(Workspace, id=workspace_id)

        # 1. Rule Check: Must be organizational
        if workspace.workspace_type != 'organizational':
            raise ValidationError({"detail": "Teams can only be created in organizational workspaces."})

        # 2. Rule Check: Must be admin
        try:
            membership = WorkspaceMembers.objects.get(workspace=workspace, user=self.request.user)
            if membership.role != 'admin':
                raise PermissionDenied("Only workspace admins can create teams.")
        except WorkspaceMembers.DoesNotExist:
            raise PermissionDenied("You do not have access to this workspace.")

        # 3. ATOMIC TRANSACTION
        with transaction.atomic():
            # Save the team (this automatically links any user IDs sent from the frontend)
            team = serializer.save(workspace=workspace)

            # 🔥 THE MAGIC FIX: Force the admin who made the request into the team!
            team.members.add(self.request.user)

            # Now grab everyone who is officially in the team (Admin + Selected Users)
            all_team_members = team.members.all()

            # Ensure every single one of them exists in the WorkspaceMembers table
            for user in all_team_members:
                WorkspaceMembers.objects.get_or_create(
                    workspace=workspace,
                    user=user,
                    defaults={'role': 'member'} 
                )

class UpdateWorkspaceMemberRoleView(generics.UpdateAPIView):
    """
    PATCH /api/workspaces/<workspace_id>/members/<pk>/role/
    Allows a workspace admin to change the role of a workspace member.
    """
    serializer_class = UpdateWorkspaceMemberRoleSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        workspace_id = self.kwargs.get('workspace_id')
        member_record_id = self.kwargs.get('pk')

        # 1. Check if the requester is an ADMIN of this workspace
        try:
            requester_membership = WorkspaceMembers.objects.get(
                workspace_id=workspace_id, 
                user=self.request.user
            )
            if requester_membership.role != 'admin':
                raise PermissionDenied("Only workspace admins can change member roles.")
        except WorkspaceMembers.DoesNotExist:
            raise PermissionDenied("You do not have access to this workspace.")

        # 2. Fetch the target member's record
        # This ensures the record actually belongs to the specified workspace
        target_member = get_object_or_404(
            WorkspaceMembers, 
            id=member_record_id, 
            workspace_id=workspace_id
        )
        return target_member

    def perform_update(self, serializer):
        instance = self.get_object()
        new_role = serializer.validated_data.get('role', instance.role)

        # 3. Safety Check: Prevent demoting the very last admin
        if instance.role == 'admin' and new_role == 'member':
            admin_count = WorkspaceMembers.objects.filter(
                workspace_id=instance.workspace_id, 
                role='admin'
            ).count()
            
            if admin_count <= 1:
                raise ValidationError({
                    "detail": "Cannot demote this user. Every workspace must have at least one admin."
                })

        serializer.save()

class TeamDetailView(generics.RetrieveAPIView):
    """
    GET /api/workspaces/teams/<id>/

    Returns single team details.
    """

    serializer_class = TeamSerializer

    permission_classes = [IsAuthenticated]

    queryset = Team.objects.all()

    def get_object(self):
        team = super().get_object()

        # SECURITY CHECK
        is_member = WorkspaceMembers.objects.filter(
            workspace=team.workspace,
            user=self.request.user
        ).exists()

        if not is_member:
            raise PermissionDenied(
                "You do not have access to this team."
            )

        return team


class AddTeamMemberView(APIView):
    """
    POST /api/workspaces/<workspace_id>/teams/<team_id>/members/
    Adds a user to a specific team. If they aren't in the workspace yet, 
    they are automatically added as a 'member'.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_id, team_id):
        # 1. Verify the requester is an ADMIN of the workspace
        try:
            requester_membership = WorkspaceMembers.objects.get(
                workspace_id=workspace_id, 
                user=request.user
            )
            if requester_membership.role != 'admin':
                raise PermissionDenied("Only workspace admins can add members to teams.")
        except WorkspaceMembers.DoesNotExist:
            raise PermissionDenied("You do not have access to this workspace.")

        # 2. Get the user_id to add from the request body
        user_id_to_add = request.data.get('user_id')
        if not user_id_to_add:
            return Response({"error": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Ensure the target user actually exists in the database
        target_user = get_object_or_404(User, id=user_id_to_add)

        # 4. Fetch the team (ensure it exists inside this specific workspace)
        team = get_object_or_404(Team, id=team_id, workspace_id=workspace_id)

        # 5. ATOMIC TRANSACTION: Safely add to workspace AND team
        with transaction.atomic():
            # Automatically add them to the workspace if they aren't in it
            WorkspaceMembers.objects.get_or_create(
                workspace_id=workspace_id,
                user=target_user,
                defaults={'role': 'member'} 
            )

            # Now safely add them to the team
            team.members.add(target_user)

        return Response({"detail": f"{target_user.username} was successfully added to the team."}, status=status.HTTP_200_OK)

class TeamPerformanceView(APIView):
    """
    GET /api/workspaces/<workspace_id>/teams/<team_id>/performance/
    Returns performance metrics for all members of the team.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_id, team_id):
        is_member = WorkspaceMembers.objects.filter(
            workspace_id=workspace_id,
            user=request.user
        ).exists()
        if not is_member:
            raise PermissionDenied("You do not have access to this workspace.")
            
        team = get_object_or_404(Team, id=team_id, workspace_id=workspace_id)
        
        from apps.tasks.models import Task
        
        performance_data = []
        for member in team.members.all():
            tasks = Task.objects.filter(workspace_id=workspace_id, assignee=member)
            
            total_tasks = tasks.count()
            active_tasks_qs = tasks.filter(status__in=['Briefed', 'In Progress', 'In Review', 'Rework'])
            active_tasks_count = active_tasks_qs.count()
            done_tasks_qs = tasks.filter(status__in=['Approved', 'Delivered'])
            done_tasks_count = done_tasks_qs.count()
            
            total_reworks = sum(t.reworks for t in tasks)
            
            # Productivity Calculation
            total_est = sum(t.estimated_hours for t in tasks)
            total_act = sum(t.actual_hours for t in tasks)
            
            time_eff = 100
            if total_act > 0:
                time_eff = min((total_est / total_act) * 100, 100)
            elif total_tasks > 0 and total_est > 0:
                time_eff = 100
            elif total_tasks > 0:
                time_eff = 50 # fallback
                
            rework_penalty = max(total_reworks * -8, -40)
            delivery_rate = (done_tasks_count / total_tasks * 30) if total_tasks > 0 else 0
            
            on_time_count = 0
            for t in done_tasks_qs:
                completion_date = t.approved_at or t.submitted_at
                if completion_date and completion_date.date() <= t.deadline:
                    on_time_count += 1
            on_time_rate = (on_time_count / done_tasks_count * 30) if done_tasks_count > 0 else 0
            
            productivity_raw = time_eff + delivery_rate + on_time_rate + rework_penalty
            productivity = int(min(max(productivity_raw, 0), 100))
            if total_tasks == 0:
                productivity = 100
                
            current_tasks = []
            for t in active_tasks_qs.order_by('deadline')[:3]:
                current_tasks.append({
                    'id': t.id,
                    'title': t.title,
                    'status': t.status,
                    'deadline': t.deadline.strftime('%d %b') if t.deadline else None,
                })
                
            # Default skills since User model might not have them
            skills = ['Social Media', 'Banners', 'Branding']
                
            performance_data.append({
                'user': {
                    'id': member.id,
                    'username': member.username,
                    'first_name': member.first_name,
                    'last_name': member.last_name,
                    'skills': skills,
                    'role': 'Sr. Graphic Designer' if member.id % 2 == 0 else 'Graphic Designer' # Dummy role
                },
                'total': total_tasks,
                'active': active_tasks_count,
                'done': done_tasks_count,
                'reworks': total_reworks,
                'productivity': productivity,
                'workload': int(min((active_tasks_count / 8) * 100, 100)),
                'active_count': active_tasks_count,
                'current_tasks': current_tasks
            })
            
        return Response(performance_data)