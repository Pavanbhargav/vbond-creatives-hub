# apps/workspace/urls.py
from django.urls import path
from .views import CreateOrganizationalWorkspaceView, ListUserWorkspacesView, TeamListCreateView,UpdateWorkspaceMemberRoleView,TeamDetailView,AddTeamMemberView

urlpatterns = [
    path('', ListUserWorkspacesView.as_view(), name='workspace-list'),
    path('create-org/', CreateOrganizationalWorkspaceView.as_view(), name='create-org-workspace'),
    path('<int:workspace_id>/teams/', TeamListCreateView.as_view(), name='team-list-create'),
    path('<int:workspace_id>/members/<int:pk>/role/', UpdateWorkspaceMemberRoleView.as_view(), name='update-member-role'),
    path(
    'teams/<int:pk>/',
    TeamDetailView.as_view(),
    name='team-detail'),
path('<int:workspace_id>/teams/<int:team_id>/members/', AddTeamMemberView.as_view(), name='add-team-member'),
]