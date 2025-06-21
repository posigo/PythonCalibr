from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User, Group
from django.db.models import Q
# Утилиты для работы с датой/временем с учетом временных зон
from django.utils import timezone
from .models import UserProfile
from .serializers_old import (
    UserSerializer,
    UserProfileSerializer,
    GroupSerializer,
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    # UserWithGroupsSerializer, 
    VerifiedUserSerializer
)
from .permissions import (
    IsSuperUser,
    IsAdminUser,
    IsExtUser,
    IsUser,
    IsVerifiedUser,
    CanDeleteUser,
    CanAssignGroups
)
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken, OutstandingToken, BlacklistedToken

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Кастомное представление для получения JWT токенов
    """
    serializer_class = CustomTokenObtainPairSerializer

class RegisterViewSet(viewsets.GenericViewSet):
    """
    Представление для регистрации пользователей
    """
    serializer_class = RegisterSerializer
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Добавляем пользователя в группу users по умолчанию
        users_group = Group.objects.get(name='users')
        user.groups.add(users_group)
        
        return Response(
            {'detail': 'Пользователь успешно зарегистрирован. Ожидайте подтверждения.'},
            status=status.HTTP_201_CREATED
        )

class UserViewSet(viewsets.ModelViewSet):       
    """
    Представление для работы с пользователями
    Наследуемся от этого класса, чтобы получить все стандартные CRUD операции (Create, Read, Update, Delete)
    """
    queryset = User.objects.all()               #  будут доступны (все пользователи)
    serializer_class = UserSerializer           # сериализатор для преобразования данных
    permission_classes = [IsAuthenticated]      #  Базовые права доступа - только для аутентифицированных пользователей
    
    # Кастомизация прав доступа
    def get_permissions(self):
        """
        Определение прав доступа в зависимости от действия
        """
        if self.action in ['retrieve']:             # retrieve (GET /users/id/)
            self.permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]
        if self.action in ['list']:             # list (GET /users/) 
            self.permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]
        elif self.action in ['update', 'partial_update']:       # update (PUT) и partial_update (PATCH)
            self.permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]
        elif self.action == 'destroy':                          # destroy (DELETE)
            self.permission_classes = [IsAuthenticated, CanDeleteUser]
        return super().get_permissions()                        # Применяет сконфигурированные права доступа
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Получение информации о текущем пользователе
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['delete'])
    def me(self, request):
        """
        Удаление текущего пользователя
        DELETE /api/users/me/
        """
        user = request.user
        
        # Дополнительная проверка (хотя IsAuthenticated уже проверяет)
        if not user.is_authenticated:
            return Response(
                {'detail': 'Требуется аутентификация'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Логирование перед удалением
        print(f"Удаление пользователя {user.username} (ID: {user.id})")
        
        # Мягкое удаление (если используется)
        # user.is_active = False
        # user.set_unusable_password()
        # user.save()
        
        # Полное удаление
        user.delete()
        
        return Response(
            {'detail': 'Ваш аккаунт успешно удален'},
            status=status.HTTP_204_NO_CONTENT
        )
    

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        Выход из системы (инвалидация токена)
        """
        print("DDSASdsa")
        try:
            refresh_token = request.data['refresh']
            print(f"refresh_token: {refresh_token}")
            token = RefreshToken(refresh_token)
            
            # token = OutstandingToken.objects.get(token=refresh_token)
            # print("OutstandingToken.objects.get(token=refresh_token)...")
            print(f"token: {token}")
            # BlacklistedToken.objects.get_or_create(token=token)
            # print(f"BlacklistedToken.objects.get_or_create(token=token)...")
            token.blacklist()            
            print(f"token.blacklist()...")
            return Response({'detail': 'Успешный выход из системы.'}, status=status.HTTP_205_RESET_CONTENT)
        # except OutstandingToken.DoesNotExist:
        #     return Response({'detail': 'Недействительный токен'}, status=400)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    # def get_serializer_class(self):
    #     if self.action == 'list':
    #         return UserWithGroupsSerializer
    #     return UserSerializer
    
    # def get_queryset(self):
    #     if self.action == 'list':
    #         return User.objects.filter(
    #             Q(profile__is_verified=True) | Q(is_superuser=True)
    #         ).select_related('profile').prefetch_related('groups')
    #     return super().get_queryset()
    
    def get_serializer_class(self):
        if self.action == 'verified':
            return VerifiedUserSerializer
        return super().get_serializer_class()
    
    @action(detail=False, methods=['get'])
    def verified(self, request):
        """
        Список подтвержденных пользователей с superuser в конце
        """
        # Получаем подтвержденных пользователей
        # verified_users = User.objects.filter(
        #     profile__is_verified=True
        # ).exclude(is_superuser=True).select_related('profile').prefetch_related('groups')
        verified_users = User.objects.filter(
            profile__is_verified=True
        ).exclude(
            Q(is_superuser=True) | Q(id=request.user.id)
        ).select_related('profile').prefetch_related('groups')
        
        # verified_users2 = User.objects.filter(
        #     profile__is_verified=True
        # ).exclude(is_superuser=True).select_related('profile').prefetch_related('groups')
        # verified_users = verified_users2.exclude(id=request.user.id)

        queryset =  sorted(
            list(verified_users) + list(User.objects.filter(is_superuser=True).prefetch_related('groups')),
            key=lambda x: (not x.is_superuser, x.username)
            ) if request.user.is_superuser == False  else sorted(
                list(verified_users),
                key=lambda x: (x.username)
            )
        # if request.user.is_superuser == False:
        #     superusers = User.objects.filter(is_superuser=True).prefetch_related('groups')
        
        #     # Объединяем и сортируем
        #     queryset2 = sorted(
        #         list(verified_users) + list(superusers),
        #         key=lambda x: (not x.is_superuser, x.username)
        #     )
        #     queryset=queryset2
        # else: 
        #     queryset2 = sorted(
        #         list(verified_users),
        #         key=lambda x: (x.username))
        #     queryset=queryset2
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    # Добавим проверку в самом методе destroy для дополнительной безопасности
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Дополнительная проверка (дублирует permission для ясности)
        if not (request.user == instance or 
                request.user.is_superuser or
                (request.user.groups.filter(name='admins').exists() and 
                    instance.groups.filter(name__in=['users', 'extusers']).exists())):
            return Response(
                {'detail': 'У вас нет прав для удаления этого пользователя'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        return super().destroy(request, *args, **kwargs) 
    
    @action(detail=True, methods=['post'])
    def assign_group(self, request, pk=None):
        """
        Назначение группы пользователю и подтверждение
        POST /api/users/{id}/assign_group/
        Body: {"group": "group_name"}
        """
        user = self.get_object()
        group_name = request.data.get('group')

        if not group_name:
            return Response(
                {'detail': 'Не указана группа'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            group = Group.objects.get(name=group_name)
        except Group.DoesNotExist:
            return Response(
                {'detail': 'Группа не существует'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверка прав
        if not CanAssignGroups().has_object_permission(request, self, user):
            return Response(
                {'detail': 'У вас нет прав для назначения этой группы'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Назначение группы
        user.groups.clear()
        user.groups.add(group)

        # Подтверждение пользователя
        if hasattr(user, 'profile'):
            user.profile.is_verified = True
            user.profile.verification_date = timezone.now()
            user.profile.save()

        return Response(
            {
                'detail': f'Пользователь добавлен в группу {group_name} и подтвержден',
                'user_id': user.id,
                'group': group_name,
                'is_verified': True
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'])
    def change_group(self, request, pk=None):
        """
        Изменение группы пользователя
        PATCH /api/users/{id}/change_group/
        Body: {"new_group": "group_name"}
        """
        user = self.get_object()
        new_group_name = request.data.get('new_group')

        if not new_group_name:
            return Response(
                {'detail': 'Не указана новая группа'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_group = Group.objects.get(name=new_group_name)
        except Group.DoesNotExist:
            return Response(
                {'detail': 'Группа не существует'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверка прав
        if new_group_name == 'admins' and not request.user.is_superuser:
            return Response(
                {'detail': 'Только superuser может назначать группу admins'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not request.user.is_superuser and not request.user.groups.filter(name='admins').exists():
            return Response(
                {'detail': 'У вас нет прав для изменения групп'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Изменение группы
        user.groups.clear()
        user.groups.add(new_group)

        return Response(
            {
                'detail': f'Группа пользователя изменена на {new_group_name}',
                'user_id': user.id,
                'new_group': new_group_name
            },
            status=status.HTTP_200_OK
        )

class GroupViewSet(viewsets.ModelViewSet):
    """
    Представление для работы с группами
    """
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]

class UserProfileViewSet(viewsets.ModelViewSet):
    """
    Представление для работы с профилями пользователей
    """
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]
    
    @action(detail=True, methods=['patch'])
    def verify(self, request, pk=None):
        """
        Подтверждение пользователя
        """
        profile = self.get_object()
        if profile.is_verified:
            return Response(
                {'detail': 'Пользователь уже подтвержден'},
                status=status.HTTP_400_BAD_REQUEST
            )
        profile.is_verified = True
        profile.verification_date = timezone.now()
        profile.save()
        return Response({'detail': 'Пользователь подтвержден.'})