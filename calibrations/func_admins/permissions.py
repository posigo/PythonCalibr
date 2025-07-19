from rest_framework import permissions
from rest_framework.permissions import BasePermission
from django.contrib.auth.models import Group

class IsSuperUser(BasePermission):
    """
    Разрешение только для суперпользователя
    """
    # def has_permission(self, request, view):
    #     return request.user and request.user.is_superuser

    # def has_object_permission(self, request, view, obj):
    #     return request.user and request.user.is_superuser
    
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser

class IsAdminUser(BasePermission):
    """
    Разрешение только для пользователей из группы admins
    """
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='admins').exists()

class IsExtUser(BasePermission):
    """
    Разрешение только для пользователей из группы extusers
    """
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='extusers').exists()

class IsUser(BasePermission):
    """
    Разрешение только для пользователей из группы users
    """
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='users').exists()

class IsAdminOrSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool (
            request.user and 
            (request.user.is_superuser or 
             request.user.groups.filter(name='admins').exists())
        )

class IsVerifiedUser(BasePermission):
    """
    Разрешение только для подтвержденных пользователей
    """
    def has_permission(self, request, view):
        return request.user and request.user.profile.is_verified
    
class CanEditUser(BasePermission):
    """Разрешение на редактирование пользователей"""
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user == obj:     
            return True
        if request.user.is_superuser:
            return True
        if request.user.groups.filter(name='admins').exists():
            return obj.groups.filter(name__in=['users', 'extusers']).exists()
        return False

class CanDeleteUser(BasePermission):
    """
    Проверяет права на удаление пользователей:
    - Любой пользователь может удалить себя
    - admins могут удалять users и extusers
    - superuser может удалять всех
    """    
    # Метод проверки общего доступа к эндпоинту (вызывается первым)
    # Работает до проверки конкретного объекта
    def has_permission(self, request, view):
        # Разрешаем всем аутентифицированным доступ к эндпоинту иначе доступ запрещён (401 Unauthorized)
        return request.user.is_authenticated        
    
    # Метод проверки прав для конкретного объекта (пользователя)
    # Вызывается после has_permission
    # obj - это конкретный пользователь, которого пытаются удалить
    def has_object_permission(self, request, view, obj):    
        # Пользователь может удалить себя
        if request.user == obj:     # сли пользователь пытается удалить СЕБЯ (свой аккаунт) 
            return True

        # Superuser может удалять всех
        if request.user.is_superuser:
            return True
            
        # Admins могут удалять users и extusers
        if request.user.groups.filter(name='admins').exists():
            return obj.groups.filter(name__in=['users', 'extusers']).exists()
            
        return False        # Возвращает HTTP 403 Forbidden
    
class CanAssignGroups(BasePermission):
    """
    Проверяет права на назначение групп:
    - superuser может назначать любые группы
    - admins могут назначать только users/extusers
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        group_name = request.data.get('group')
        
        if request.user.is_superuser:
            return True
            
        if request.user.groups.filter(name='admins').exists():
            return group_name in ['users', 'extusers']
            
        return False

class CanEditCalculations(BasePermission):
    """
    Разрешение на редактирование расчетов (для extusers)
    """
    def has_permission(self, request, view):
        # SAFE_METHODS (GET, HEAD, OPTIONS) — "безопасные" HTTP-методы, не изменяющие данные.
        # Если запрос использует безопасный метод — доступ разрешен всем (даже анонимным пользователям).
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.groups.filter(name='extusers').exists()

class CanViewHistory(BasePermission):
    """
    Разрешение на просмотр истории (для admins и superuser)
    """
    def has_permission(self, request, view):
        return (request.user and 
                (request.user.is_superuser or 
                 request.user.groups.filter(name='admins').exists()))

class CanManageNotifications(BasePermission):
    """
    Разрешение на управление уведомлениями (для admins и superuser)
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (request.user and 
                (request.user.is_superuser or 
                 request.user.groups.filter(name='admins').exists()))

class CanManageUsers(BasePermission):
    """
    Разрешение на управление пользователями
    """
    def has_permission(self, request, view):
        if request.method == 'POST':  # Регистрация доступна всем
            return True
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (request.user and 
                (request.user.is_superuser or 
                 request.user.groups.filter(name='admins').exists()))