from django.urls import path
from .views import SignupView, LoginView, RefreshTokenView, LogoutView,UserDetailView,UserListView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', RefreshTokenView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', UserDetailView.as_view(),name='user_detail'),
    path('users/',UserListView.as_view(),name='user_list')
]