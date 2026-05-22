from django.contrib import admin
from .models import Task,TaskFile,Approvals
# Register your models here.

admin.site.register(Task)
admin.site.register(TaskFile)
admin.site.register(Approvals)