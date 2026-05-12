# apps/accounts/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.accounts.models import User
from apps.workspace.models import Workspace, WorkspaceMembers

@receiver(post_save, sender=User)
def create_personal_workspace(sender, instance, created, **kwargs):
    """
    Automatically creates a Personal workspace and adds
    the user as a member whenever a new User is created.
    """
    if created:
        workspace = Workspace.objects.create(
            name=f"{instance.username}'s Workspace",
            workspace_type='personal'
        )
        WorkspaceMembers.objects.create(
            workspace=workspace,
            user=instance,
            role='admin'   # Personal workspaces only allow 'member' role
        )