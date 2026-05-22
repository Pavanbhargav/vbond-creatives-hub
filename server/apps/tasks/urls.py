# tasks/urls.py
from django.urls import path
from .views import TaskListCreateView,TaskUploadView,TaskApprovalListView,SubmitApprovalDecisionView,FileView

urlpatterns = [
    # It still expects the workspace_id to filter securely!
    path('workspace/<int:workspace_id>/', TaskListCreateView.as_view(), name='task-list-create'),
    path('<int:task_id>/upload/', TaskUploadView.as_view(), name='task-upload'),
    path('files/<int:task_file_id>/',FileView.as_view(),name='task-file-detail'),
    path('<int:task_id>/approvals/', TaskApprovalListView.as_view(), name='task-approval-list'),
    path('<int:task_id>/approve/', SubmitApprovalDecisionView.as_view(), name='task-approve'),
]