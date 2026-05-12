from rest_framework import serializers
from .models import Workspace,WorkspaceMembers,Team

class WorkspaceMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = WorkspaceMembers
        fields = ['id', 'username', 'role']


class WorkspaceSerializer(serializers.ModelSerializer):
    members = WorkspaceMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'workspace_type', 'created_at', 'members']
        read_only_fields = ['workspace_type', 'created_at']


class CreateOrgWorkspaceSerializer(serializers.Serializer):
    """
    Validates input for creating an Organizational workspace.
    workspace_type is locked to 'organizational' — not user-supplied.
    """
    name = serializers.CharField(max_length=150)

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Workspace name cannot be blank.")
        return value.strip()


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'workspace', 'name', 'members']
        read_only_fields = ['workspace']

class UpdateWorkspaceMemberRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceMembers
        fields = ['role']