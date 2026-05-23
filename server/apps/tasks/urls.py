# tasks/urls.py
from django.urls import path
from .views import TaskListCreateView,TaskUploadView,TaskApprovalListView,SubmitApprovalDecisionView,TaskFileListView,PendingApprovalsListView,TaskFileDetailView,TaskHistoryListView

urlpatterns = [
    # It still expects the workspace_id to filter securely!
    path('workspace/<int:workspace_id>/', TaskListCreateView.as_view(), name='task-list-create'),
    path('workspace/<int:workspace_id>/pending-approvals/', PendingApprovalsListView.as_view(), name='pending-approvals-list'),
    path('<int:task_id>/upload/', TaskUploadView.as_view(), name='task-upload'),
    path('<int:task_id>/files/', TaskFileListView.as_view(), name='task-file-list'),
    path('files/<int:task_file_id>/', TaskFileDetailView.as_view(), name='task-file-detail'),
    path('<int:task_id>/approvals/', TaskApprovalListView.as_view(), name='task-approval-list'),
    path('<int:task_id>/history/', TaskHistoryListView.as_view(), name='task-history-list'),
    path('<int:task_id>/approve/', SubmitApprovalDecisionView.as_view(), name='task-approve'),
]