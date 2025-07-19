from rest_framework import permissions
# from func_admins.models import UserGroups

class IsAuthenticated(permissions.BasePermission):
    """
    Базовое разрешение, проверяющее что пользователь аутентифицирован.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

class IsSuperUser(IsAuthenticated):
    """
    Разрешение только для суперпользователей.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser

class IsAdmin(IsAuthenticated):
    """
    Разрешение для администраторов (группа admins).
    """
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='admins').exists()

class IsExtUser(IsAuthenticated):
    """
    Разрешение для внешних пользователей (группа extusers).
    """
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='extusers').exists()

class IsUser(IsAuthenticated):
    """
    Разрешение для обычных пользователей (группа users).
    """
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='users').exists()

# class CalculationsPermissions(permissions.BasePermission):
#     """
#     Комплексные разрешения для CalculationsViewSet в зависимости от группы пользователя.
#     """
#     def has_permission(self, request, view):
#         # Суперпользователи и администраторы имеют все права
#         if request.user.is_superuser or request.user.groups.filter(name=UserGroups.ADMINS).exists():
#             return True
            
#         # Внешние пользователи имеют полные права (CRUD)
#         if request.user.groups.filter(name=UserGroups.EXTUSERS).exists():
#             return True
            
#         # Обычные пользователи имеют права только на чтение
#         if request.method in permissions.SAFE_METHODS and \
#            request.user.groups.filter(name=UserGroups.USERS).exists():
#             return True
            
#         return False

# class DefaultPermissions(permissions.BasePermission):
#     """
#     Разрешения по умолчанию для остальных ViewSets.
#     """
#     def has_permission(self, request, view):
#         # Суперпользователи и администраторы имеют все права
#         if request.user.is_superuser or request.user.groups.filter(name=UserGroups.ADMINS).exists():
#             return True
            
#         # Внешние пользователи имеют права на чтение и создание
#         if request.user.groups.filter(name=UserGroups.EXTUSERS).exists():
#             return request.method in ['GET', 'POST', 'HEAD', 'OPTIONS']
            
#         # Обычные пользователи имеют права только на чтение
#         if request.method in permissions.SAFE_METHODS and \
#            request.user.groups.filter(name=UserGroups.USERS).exists():
#             return True
            
#         return False