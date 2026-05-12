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