from django.contrib import admin
from .models import Workspace,WorkspaceMembers,Team
# Register your models here.
admin.site.register(Workspace)
admin.site.register(WorkspaceMembers)
admin.site.register(Team)