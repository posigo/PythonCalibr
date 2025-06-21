from django.urls import path, include
from rest_framework.routers import DefaultRouter
# from .views_old import (
#     CustomTokenObtainPairView,    
#     RegisterViewSet,
#     UserViewSet,
#     GroupViewSet,
#     UserProfileViewSet,
# )
from .views import (
    AuthViewSet,
    UserViewSet, 
    GroupViewSet, 
    NotificationViewSet, 
    ActionHistoryViewSet,
    CustomTokenObtainPairView, 
    # LogoutView,
)
from rest_framework_simplejwt.views import TokenRefreshView



router = DefaultRouter()
# router.register(r'register', RegisterViewSet, basename='register')
# router.register(r'users', UserViewSet, basename='users')
# router.register(r'groups', GroupViewSet, basename='groups')
# router.register(r'profiles', UserProfileViewSet, basename='profiles')
router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')  # Регистрируем AuthViewSet
router.register(r'users', UserViewSet, basename='user')
router.register(r'groups', GroupViewSet, basename='group')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'history', ActionHistoryViewSet, basename='history')


# urlpatterns = [
#     path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
#     path('', include(router.urls)),
# ]
urlpatterns = [
    path('', include(router.urls)),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # path('logout/', LogoutView.as_view(), name='logout'),
]