# serializers.py
from rest_framework import serializers
from .models import Task,TaskFile,Approvals

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ['workspace', 'created_by']


class TaskFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskFile
        fields = ['id', 'task', 'user', 'file', 'uploaded_at']
        read_only_fields = ['task', 'user', 'uploaded_at']



class ApprovalSerializer(serializers.ModelSerializer):
    # Fetch the username directly so the frontend can display it
    approver_name = serializers.CharField(source='approver.username', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = Approvals
        fields = ['id', 'task', 'task_title', 'approver', 'approver_name', 'status', 'comment', 'updated_at']
        # The user only sends 'status' and 'comment'. Everything else is locked.
        read_only_fields = ['id', 'task', 'task_title', 'approver', 'approver_name', 'updated_at']