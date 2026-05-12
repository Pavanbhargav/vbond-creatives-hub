from django.db import models
from django.core.exceptions import ValidationError
from apps.accounts.models import User

class Workspace(models.Model):
    """
    A workspace can be Personal (only members) or Organizational (has teams & admins).
    """
    TYPE_CHOICES = [
        ('personal', 'Personal'),
        ('organizational', 'Organizational')
    ]
    name = models.CharField(max_length=150)
    workspace_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='personal')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.workspace_type})"

class WorkspaceMembers(models.Model):
    """
    Connects a User to a Workspace with a specific role.
    """
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member')
    ]
    # FIX: Changed related_name from 'teams' to 'members'
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workspaces')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')

    class Meta:
        unique_together = ('workspace', 'user')

    def clean(self):
        if self.workspace.workspace_type == 'personal' and self.role == 'admin':
            # Allow only if this user is the workspace creator (first/only admin)
            already_has_admin = WorkspaceMembers.objects.filter(
                workspace=self.workspace, role='admin'
            ).exists()
            if already_has_admin:
                raise ValidationError("Personal workspaces can only have one admin (the creator).")

    def __str__(self):
        return f"{self.user.username} - {self.workspace.name} ({self.role})"

class Team(models.Model):
    """
    Teams only exist within Organizational workspaces.
    """
    # This related_name correctly stays 'teams'
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='teams')
    name = models.CharField(max_length=100)
    members = models.ManyToManyField(User, related_name='org_teams')

    def clean(self):
        if self.workspace.workspace_type == 'personal':
            raise ValidationError("Personal workspaces cannot have teams.")

    def __str__(self):
        return f"{self.name} ({self.workspace.name})"