import logging
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User, Group
from django.core.mail import send_mail
from django.db import transaction, DatabaseError, models
from django.db.models import Case, Count, BooleanField, Q, OuterRef, Prefetch, Subquery, Value, When
from django.db.models.functions import Coalesce
from django.db.utils import IntegrityError
from django.template.loader import render_to_string
# Утилиты для работы с датой/временем с учетом временных зон
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, generics, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, AllowAny, AND, OR
from rest_framework.settings import api_settings
from rest_framework_simplejwt.exceptions import TokenError 
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken, OutstandingToken, BlacklistedToken
from .models import (
    UserProfile,
    Notification,
    NotificationProfile, 
    ActionHistory
)
from .serializers import (
    UserSerializer, UserProfile, UserProfileSerializer, 
    UserCreateSerializer, UserUpdateSerializer,
    CustomTokenObtainPairSerializer,
    NotificationSerializer,
    NotificationDetailSerializer,
    ActionHistorySerializer,
    GroupSerializer,
    PasswordResetSerializer, PasswordResetConfirmSerializer,
    RegisterSerializer,     
    VerifiedUserSerializer,
    EmptySerializer
)
from .permissions import (
    IsSuperUser,
    IsAdminUser,
    IsExtUser,
    IsUser,
    IsAdminOrSuperUser,
    IsVerifiedUser,
    CanDeleteUser,
    CanAssignGroups,
    CanViewHistory,
    CanManageNotifications,
    CanManageUsers, 
    CanEditUser, 
)
from .services import GroupService, UserCreationService

User = get_user_model()
logger = logging.getLogger(__name__)

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления пользователями
    """
    queryset = User.objects.all().order_by('-date_joined')
    # queryset = UserSerializer.setup_eager_loading(queryset)
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.action == 'verified':
            return VerifiedUserSerializer
        # return super().get_queryset()
        return User.objects.select_related('profile').prefetch_related('groups')

    def get_serializer_class(self): 
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return super().get_serializer_class()
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsAdminOrSuperUser()]  
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), IsAdminOrSuperUser()]
        elif self.action == 'destroy':
            return [IsAuthenticated(), IsAdminOrSuperUser()]
        elif self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), OR(IsAdminUser(), IsSuperUser())]
        elif self.action in ['me', 'verifiedusers', 'get_name_user', 'get_name_users_list']:
            return [IsAuthenticated()]
        elif self.action in ['assign_group', 'change_group', 'unverifiedusers']:
            return [IsAuthenticated(), IsAdminOrSuperUser()]
        return super().get_permissions()
        # return [permission() for permission in permission_classes]
        
    @action(detail=False, methods=['get', 'delete', 'put', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Получение информации о текущем пользователе
        """
        # 1. Явная проверка аутентификации
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"Неаутентифицированный доступ к /me/ методом {request.method}")
            return Response(
                {'detail': 'Требуется авторизация'},
                status=status.HTTP_401_UNAUTHORIZED
        )
        user = request.user
        if request.method == 'GET':            
            response_data = {
                'userid': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'email': user.email,
                'groups': [group.name for group in user.groups.all()],
                'is_superuser': user.is_superuser
            }
            return Response(response_data)
            # serializer = self.get_serializer(request.user)
            # return Response(serializer.data)
        elif request.method == 'DELETE':             
            user = request.user
        
            # Дополнительная проверка (хотя IsAuthenticated уже проверяет)
            if not user.is_authenticated:
                return Response(
                    {'detail': 'Требуется аутентификация'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
            # Логирование перед удалением
            print(f"Удаление пользователя {user.username} (ID: {user.id})")
        
            try:
                with transaction.atomic():
                    
                    # Записываем в историю перед удалением
                    ActionHistory.objects.create(
                        user=user,
                        action_type='user_delete',
                        description=f"Пользователь {user.username} удалил пользователя себя (delete me)",
                        ip_address=request.META.get('REMOTE_ADDR')
                    )
                    
                    # Полное удаление
                    user.delete()
                                        
                    return Response(
                        {'detail': 'Ваш аккаунт успешно удален'},
                        status=status.HTTP_204_NO_CONTENT
                    )
            except Exception as e:
                return Response(
                    {'detail': f'Ошибка при удалении: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                ) 
        elif request.method in ['PUT', 'PATCH']:
            """
            Обновление данных текущего пользователя
            PUT/PATCH /api/users/me/
            """
            try:
                
                # Получаем текущего пользователя и копируем данные запроса
                # request.user - текущий аутентифицированный пользователь (из токена или сессии)
                # request.data - данные запроса (аналог request.POST для REST API)
                # .copy() - создание копии словаря для безопасного изменения
                # user = request.user                    
                data = request.data.copy()
                # Удаляем пустые поля (# Фильтрация пустых значений)
                for field in ['username', 'password', 'first_name', 'email']:
                    if field in data and data[field] in ['', None]:     # Проверка in ['', None] на пустые значения
                        data.pop(field) # удаляет ключ из словаря
                # Проверка наличия данных для обновления
                if not data:
                    return Response(
                        {'detail': 'Нет данных для обновления'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                serializer = UserUpdateSerializer(
                    user, 
                    data=data, 
                    partial=request.method == 'PATCH',
                    context={'request': request}
                )
                serializer.is_valid(raise_exception=True)
                serializer.save()                    
                    
                # Создание истории с проверкой
                if hasattr(user, 'id'):  # Проверка, что user существует
                    ActionHistory.objects.create(
                    user=user,
                    action_type='profile_update',
                    description=f"Обновление профиля {user.username}",
                    ip_address=request.META.get('REMOTE_ADDR', '')[:255]
                )
                print (f'serializer.data={serializer.data}')
                # return Response(serializer.data)
                # Возвращаем обновленные данные в том же формате, что и GET
                return Response({
                    'username': serializer.data['username'],
                    'first_name': serializer.data['first_name'],
                    'email': serializer.data['email'],
                    'groups': [group.name for group in user.groups.all()],
                    'is_superuser': user.is_superuser
                })

            

            # # Валидация и сохранение            
            # # partial=True разрешает частичное обновление (только для PATCH)
            # # raise_exception=True автоматически возвращает 400 при ошибках валидации
            # serializer = UserUpdateSerializer(user, data=data, partial=request.method == 'PATCH')
            # serializer.is_valid(raise_exception=True)   # Автоматический возврат 400 при ошибке 
            # serializer.save()
    
            # # Запись в историю # Подготовка данных для истории\
            # # serializer.validated_data - содержит уже проверенные данные
            # changes = []
            # for field, value in serializer.validated_data.items():
            #     changes.append(f"{field} изменён на '{value}'")
    
            # # request.META - содержит метаданные запроса (IP, заголовки)
            # if changes:
            #     ActionHistory.objects.create(
            #         user=user,
            #         action_type='profile_update',
            #         description=f"Пользователь {user.username} обновил свой профиль: {', '.join(changes)}",
            #         ip_address=request.META.get('REMOTE_ADDR')
            # )    
            #     return Response(serializer.data)
            except Exception as e:
                logger.error(f"Ошибка обновления: {str(e)}", exc_info=True)
                return Response(
                    {'detail': 'Ошибка обновления'},
                    status=status.HTTP_400_BAD_REQUEST
                )

    @action(detail=False, methods=['get'])
    def verifiedusers(self, request):
        """
        Список подтвержденных пользователей с superuser в конце
        Возвращает:
        - 200: список пользователей (возможно пустой)
        - 403: если нет прав доступа
        - 500: при внутренней ошибке сервера
        Формат ответа:
        [
            {
                "id": 1,
                "username": "user1",
                "first_name": "Name",
                "groups": ["group1", "group2"],
                "is_superuser": False
            },
            ...
        ]
        """
        try:
            
            if not request.user.is_authenticated:
                return Response(
                    {'detail': 'Требуется авторизация'},
                    status=status.HTTP_403_FORBIDDEN
            )
            # Аннотация для определения порядка сортировки
            sort_priority = Case(
                When(is_superuser=True, then=Value(1)),
                default=Value(0),
                output_field=BooleanField()
            )
            # Единственный запрос с аннотациями
            users = User.objects.filter(
                Q(profile__is_verified=True) | Q(is_superuser=True)
            ).exclude(
                id=request.user.id
            ).prefetch_related(
                Prefetch('groups', queryset=Group.objects.only('name'))
            ).annotate(
                sort_priority=sort_priority
            ).order_by('sort_priority', 'username')

            # Формирование данных
            def format_user(user):
                return {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'groups': [g.name for g in user.groups.all()],
                    'is_superuser': user.is_superuser
                }
           
            # Пагинация на уровне QuerySet
            page = self.paginate_queryset(users)
            data = [format_user(u) for u in (page if page else users)]        
            
            return self.get_paginated_response(data) if page else Response(data)

            # # Получаем подтвержденных пользователей
            # # verified_users = User.objects.filter(
            # #     profile__is_verified=True
            # # ).exclude(is_superuser=True).select_related('profile').prefetch_related('groups')
        
            # verified_users = User.objects.filter(
            #     profile__is_verified=True
            # ).exclude(
            #     Q(is_superuser=True) | Q(id=request.user.id)
            # ).select_related('profile').prefetch_related('groups')
        
            # # verified_users = User.objects.filter(
            # #     profile__is_verified=True
            # # ).exclude(
            # #     Q(is_superuser=True) | Q(id=request.user.id)
            # # ).select_related('profile').prefetch_related(
            # #     'groups',
            # #     'received_notifications',
            # #     'sent_notifications'
            # # )

            # if request.user.is_superuser:
            #     # Для суперпользователя - простая сортировка по имени
            #     queryset = verified_users.order_by('username')
            # else:
            #     # Для обычных пользователей - суперпользователи в конце
            #     superusers = User.objects.filter(
            #         is_superuser=True
            #     ).prefetch_related('groups')
        
            #     # # Объединяем два QuerySet с правильным порядком
            #     # queryset = verified_users.order_by('username').union(
            #     #     superusers.order_by('username'),
            #     #     all=True
            #     # )
            #     queryset =  sorted(
            #         list(verified_users) + list(superusers),
            #         key=lambda x: (not x.is_superuser, x.username)
            #     ) if request.user.is_superuser == False  else sorted(
            #         list(verified_users),
            #         key=lambda x: (x.username)
            #     )

        
            # # Пагинация
            # page = self.paginate_queryset(queryset)
            # if page is not None:
            #     serializer = self.get_serializer(page, many=True)
            #     return self.get_paginated_response(serializer.data)
            # # Возврат без пагинации
            # serializer = self.get_serializer(queryset, many=True)
            # return Response(serializer.data)
        except PermissionError as e:
            return Response(
                {'detail': 'У вас нет прав для просмотра этого списка'},
                status=status.HTTP_403_FORBIDDEN
            )
        except DatabaseError as e:
            logger.error(
                f"Database error in verifiedusers: {str(e)}",
                exc_info=True,
                extra={'user_id':request.user.id})
            return Response(
                {'detail': 'Ошибка базы данных'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Unexpected error in verifiedusers: {str(e)}")
            return Response(
                {'detail': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def get_name_user(self, request, pk=None):
        """
        Получает username пользователя по его ID.
    
        Параметры:
        - pk: ID пользователя (из URL)
    
        Возвращает:
        - 200: {'username': 'string'} при успехе
        - 403: Нет прав доступа
        - 404: Пользователь не найден
        - 500: Ошибка сервера
    
        Пример запроса:
        GET /api/users/1/get_name_user/
        """
        try:
            # Проверка аутентификации
            if not request.user.is_authenticated:
                raise PermissionError('Требуется авторизация')
            # Получаем пользователя (автоматически вызывает 404 если не найден)
            user = self.get_object()

            return Response({'username': user.username})

        except PermissionError as e:
            logger.warning(f"Permission denied: {str(e)}")
            return Response(
                {'detail': str(e) or 'У вас нет прав для просмотра'},
                status=status.HTTP_403_FORBIDDEN
            )
        except DatabaseError as e:      
            logger.warning(f"User not found: pk={pk}")      
            return Response(
                {'detail': 'Ошибка базы данных'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Unexpected error in get_user_name: {str(e)}")
            return Response(
                {'detail': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @action(detail=False, methods=['get'])
    def get_name_users_list(self, request):
        """
         Получает список пользователей по их ID.
    
        Параметры:
        - ids: строка с ID пользователей через запятую (например, "1,2,3")
    
        Возвращает:
        - 200: список пользователей с их username (не найденные пользователи возвращаются с пустым username)
        - 400: неверный формат параметров
        - 403: нет прав доступа
        - 500: ошибка сервера
    
        Пример запроса:
        GET /api/users/get_name_users_list/?ids=1,2,3
        """
        try:
            # # Проверка аутентификации
            # if not request.user.is_authenticated:
            #     raise PermissionError('Требуется авторизация')
            
            ids_query = request.query_params.get('ids')
            if not ids_query:
                return Response(
                    {'detail': 'Не указан параметр ids'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            try:
                user_ids = [int(id.strip()) for id in ids_query.split(",")]           
            except ValueError:
                return Response(
                    {'detail': 'Неверный формат ID. Ожидается список чисел через запятую'},
                    status=status.HTTP_400_BAD_REQUEST
                )   

            if not user_ids:
                return Response(
                    {'detail': 'Не указано ни одного валидного ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
  
            # Получаем пользователей
            users = User.objects.filter(id__in=user_ids)
            existing_users = {user.id: user for user in users}
                                    
            result_users = [
                {
                    'id': user_id,
                    'username': existing_users[user_id].username if user_id in existing_users else ''
                }
                for user_id in user_ids
            ]
        
            # Формируем ответ
            result = {'users': result_users}

            return Response(result)

        except PermissionError as e:
            logger.warning(f"Permission denied for user {request.user.id}: {str(e)}")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except DatabaseError as e:      
            logger.warning(f"Database error: {str(e)}")      
            return Response(
                {'detail': 'Ошибка базы данных'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except ValueError:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            return Response(
                {'detail': 'Неверный формат ID. Ожидается список чисел через запятую'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error in get_user_name: {str(e)}")
            return Response(
                {'detail': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    #@action(detail=False, methods=['post'])
    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = UserCreationService.create_user(
                validated_data=serializer.validated_data,
                request=request
            )
        except Group.DoesNotExist:
            raise serializers.ValidationError({"group_id": "Группа не существует"})
        except (ValueError, PermissionError) as e:
            raise serializers.ValidationError({"group_id": str(e)})
        except Exception as e:
            logger.error(f"User creation failed: {str(e)}")
            raise APIException("Ошибка при создании пользователя")

        headers = self.get_success_headers(serializer.data)
        return Response(
            {'detail': 'Пользователь создан'},
            status=status.HTTP_201_CREATED,
            headers=headers
        )

        # serializer = self.get_serializer(data=request.data)
        # serializer.is_valid(raise_exception=True)
        # user = serializer.save()
                
        # headers = self.get_success_headers(serializer.data)
        # return Response(
        #     {'detail': 'Пользователь успешно зарегистрирован. Ожидайте подтверждения.'},
        #     status=status.HTTP_201_CREATED,
        #     headers=headers
        # )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Дополнительная проверка (дублирует permission для ясности)
        if not (request.user == instance or                                 #  Пользователь может удалить себя.
                request.user.is_superuser or                                # Суперпользователь может удалить любого.
                (request.user.groups.filter(name='admins').exists() and     # Админ может удалять только обычных пользователей (users, extusers).
                    instance.groups.filter(name__in=['users', 'extusers']).exists())):
            ActionHistory.objects.create(
                user=request.user,
                action_type='user_delete',
                description=f"Пользователь {request.user.username} неимеет прав для удаления пользователя {instance.username}",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(
                {'detail': 'У вас нет прав для удаления этого пользователя'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверка прав для удаления пользователей admins
        if instance.groups.filter(name='admins').exists() and not request.user.is_superuser:
            ActionHistory.objects.create(
                user=request.user,
                action_type='user_delete',
                description=f"Пользователь {request.user.username} неимеет прав для удаления пользователей из группы admins ({instance.username})",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(
                {'detail': 'Только superuser может удалять пользователей группы admins'},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            with transaction.atomic():
                # Записываем в историю перед удалением
                ActionHistory.objects.create(
                    user=request.user,
                    action_type='user_delete',
                    description=f"Пользователь {request.user.username} удалил пользователя {instance.username}",
                    ip_address=request.META.get('REMOTE_ADDR')
                )
        
                # Вызывает стандартный метод DRF perform_destroy(), который выполняет instance.delete()
                self.perform_destroy(instance) 
                return Response(status=status.HTTP_204_NO_CONTENT)
    
        except Exception as e:
            return Response(
                {'detail': f'Ошибка при удалении: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @action(detail=True, methods=['post'])
    def assign_group(self, request, pk=None):
        """
        Назначение группы пользователю и подтверждение аккаунта
        POST /api/users/{id}/assign_group/

        Возможные ответы:
        - 200: Успешное назначение группы
        - 400: Неверные данные (группа не существует)
        - 403: Нет прав для выполнения операции
        - 404: Пользователь не найден
        - 500: Внутренняя ошибка сервера
        """
        try:
            # user = User.objects.select_for_update().get(pk=pk)
            user = self.get_object()    # Может вызвать 404 если пользователь не существует            

            if not hasattr(user, 'profile'):
                # Запись в историю о неудачной попытке
                ActionHistory.objects.create(
                    user=request.user,
                    action_type='verification',
                    description=f'Попытка подтверждения пользователя {user.username}: профиль не найден',
                    ip_address=request.META.get('REMOTE_ADDR')           
                )
                return Response(
                    {'detail': 'Профиль пользователя не найден'},
                    status=status.HTTP_400_BAD_REQUEST
            )
        
            is_verified = user.profile.is_verified

            if (is_verified):
                # Запись в историю о повторной попытке подтверждения
                ActionHistory.objects.create(
                    user=request.user,
                    action_type='verification',
                    description=f'Попытка повторного подтверждения уже подтвержденного пользователя {user.username}',
                    ip_address=request.META.get('REMOTE_ADDR')
                )                
                return Response({'detail': 'Пользователь уже подтверждён'})

            if not request.data.get('group'):
                # Запись в историю о неверных данных
                ActionHistory.objects.create(
                    user=request.user,
                    action_type='verification',
                    description=f'Попытка подтверждения пользователя {user.username} без указания группы',
                    ip_address=request.META.get('REMOTE_ADDR')
                )
                return Response(
                    {'detail': 'Не указана группа для назначения'},
                    status=status.HTTP_400_BAD_REQUEST
            )

            VALID_GROUPS = {'admins', 'users', 'extusers'}
            if request.data.get('group') not in VALID_GROUPS:
                # Запись в историю о недопустимой группе
                ActionHistory.objects.create(
                    user=request.user,
                    action_type='verification',
                    description=f'Попытка назначения недопустимой группы {request.data.get("group")} пользователю {user.username}',
                    ip_address=request.META.get('REMOTE_ADDR')
                )
                return Response(
                    {'detail': f'Недопустимая группа. Допустимые значения: {", ".join(VALID_GROUPS)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
            with transaction.atomic():
                result = GroupService.assign_group_to_user(
                    user=user,
                    new_group_name=request.data.get('group'),
                    request_user=request.user
                )
                # дублирование
                # Запись в историю об успешном подтверждении
                # ActionHistory.objects.create(
                #     user=request.user,
                #     action_type='verification',
                #     description=f'Успешное подтверждение пользователя {user.username} и назначение группы {result["group"].name}',
                #     ip_address=request.META.get('REMOTE_ADDR')           
                # )
                
                # # Помечаем связанные уведомления как неактивные
                # Notification.objects.filter(
                #     notification_type='registration',
                #     recipient__groups__name='admins',
                #     message__contains=f"Новый пользователь {user.username}"
                # ).update(notification_profile__is_active=False)

                return Response(
                    {
                        'detail': f'Пользователю {user.username} назначена группа {result["group"].name}',
                        'user_id': user.id,
                        'group': result["group"].name,
                        'is_verified': True
                    },
                    status=status.HTTP_200_OK
                )
        except User.DoesNotExist:
            # Запись в историю о попытке работы с несуществующим пользователем
            ActionHistory.objects.create(
                user=request.user,
                action_type='verification',
                description=f'Попытка подтверждения несуществующего пользователя с ID {pk}',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({'detail': 'Пользователь не найден'}, status=status.HTTP_404_NOT_FOUND)        
        except Group.DoesNotExist:
            # Запись в историю о несуществующей группе
            ActionHistory.objects.create(
                user=request.user,
                action_type='verification',
                description=f'Попытка назначения несуществующей группы пользователю {user.username if "user" in locals() else "unknown"}',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({'detail': 'Указанная группа не существует'}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            # Запись в историю об ошибке значения
            ActionHistory.objects.create(
                user=request.user,
                action_type='verification',
                description=f'Ошибка значения при подтверждении пользователя: {str(e)}',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as e:
            # Запись в историю об ошибке прав
            ActionHistory.objects.create(
                user=request.user,
                action_type='verification',
                description=f'Отказ в доступе при подтверждении пользователя: {str(e)}',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            # Запись в историю о внутренней ошибке
            ActionHistory.objects.create(
                user=request.user,
                action_type='verification',
                description=f'Внутренняя ошибка при подтверждении пользователя: {str(e)}',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            logger.error(f"Ошибка при назначении группы: {str(e)}", exc_info=True)
            return Response(
                {'detail': 'Внутренняя ошибка сервера'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
            # # Находим все уведомления о неподтвержденном пользователе
            # notifications = Notification.objects.filter(
            #     notification_type='registration',
            #     recipient__groups__name='admins',
            #     message__contains=f"Новый пользователь {user.username}"
            # )

            # # Помечаем их как неактивные
            # for notification in notifications:
            #     try:
            #         notification.notification_profile.is_active = False
            #         notification.notification_profile.save()
            #     except NotificationProfile.DoesNotExist:
            #         pass
            
            # # Снятие уведомлений
            # Notification.objects.filter(
            #     notification_type='registration',
            #     recipient__groups__name='admins',
            #     message__contains=f"Новый пользователь {user.username}"
            # ).update(notification_profile__is_active=False)
            
    @action(detail=True, methods=['post'])
    def change_group(self, request, pk=None):
        """
        Изменение группы пользователя
        POST /api/users/{id}/change_group/
        """
        user = self.get_object()
        user_group = list(user.groups.values_list('name', flat=True))[0]
        # print(user)
        # print(user_group)
        # print(request.data.get('new_group'))
        if user_group == request.data.get('new_group'):
            ActionHistory.objects.create(
                user=request.user,
                action_type='group_change',
                description=f'назначаемая группа есть у пользователя {user.username}',
                ip_address=request.META.get('REMOTE_ADDR')           
            )
            return Response(
                {
                    'detail':  f'назначаемая группа есть у пользователя {user.username}'
                },
                status=status.HTTP_200_OK
            )

        try:            
            result = GroupService.assign_group_to_user(
                user=user,
                new_group_name=request.data.get('new_group'),
                request_user=request.user
            )
            # дублирование
            # Запись в историю об успешной смене группы
            # ActionHistory.objects.create(
            #     user=request.user,
            #     action_type='group_change',
            #     description=f'Успешное смена группы пользователя {user.username} на группу {result["group"].name}',
            #     ip_address=request.META.get('REMOTE_ADDR')           
            # )
            return Response(
                {
                    'detail': f'Группа пользователя {user.username} изменена на {result["group"].name}',
                    'user_id': user.id,
                    'new_group': result["group"].name
                },
                status=status.HTTP_200_OK
            )
            
        except ValueError as e:
            ActionHistory.objects.create(
                user=request.user,
                action_type='group_change',
                description=f'Внутренняя ошибка при смене группы пользователя: {str(e)}',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as e:
            ActionHistory.objects.create(
                user=request.user,
                action_type='group_change',
                description=f'Отказ в доступе при смене группы пользователя: {str(e)}',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)


        # new_group_name = request.data.get('new_group')

        # if not new_group_name:
        #     return Response(
        #         {'detail': 'Не указана новая группа'},
        #         status=status.HTTP_400_BAD_REQUEST
        #     )

        # try:
        #     new_group = Group.objects.get(name=new_group_name)
        # except Group.DoesNotExist:
        #     return Response(
        #         {'detail': 'Группа не существует'},
        #         status=status.HTTP_400_BAD_REQUEST
        #     )

        # current_groups = user.groups.values_list('name', flat=True)
        
        # # Проверка прав для изменения на admins
        # if new_group_name == 'admins' and not request.user.is_superuser:
        #     return Response(
        #         {'detail': 'Только superuser может назначать группу admins'},
        #         status=status.HTTP_403_FORBIDDEN
        #     )

        # # Проверка прав для изменения с admins
        # if 'admins' in current_groups and not request.user.is_superuser:
        #     return Response(
        #         {'detail': 'Только superuser может изменять группу admins'},
        #         status=status.HTTP_403_FORBIDDEN
        #     )

        # # Проверка прав для обычных пользователей
        # if not request.user.is_superuser and new_group_name not in ['users', 'extusers']:
        #     return Response(
        #         {'detail': 'Вы можете назначать только группы users или extusers'},
        #         status=status.HTTP_403_FORBIDDEN
        #     )

        # # Изменение группы
        # user.groups.clear()
        # user.groups.add(new_group)

        # # Запись в историю
        # ActionHistory.objects.create(
        #     user=request.user,
        #     action_type='group_changed',
        #     description=f"Пользователю {user.username} изменена группа на {new_group_name}",
        #     ip_address=request.META.get('REMOTE_ADDR')
        # )

        # return Response(
        #     {
        #         'detail': f'Группа пользователя {user.username} изменена на {new_group_name}',
        #         'user_id': user.id,
        #         'new_group': new_group_name
        #     },
        #     status=status.HTTP_200_OK
        # )

    @action(detail=False, methods=['get'])
    def unverifiedusers(self, request):
        """
        Список неподтвержденных пользователей
        GET /api/users/unverified/
        """
        try:
            if not (request.user.is_superuser or request.user.groups.filter(name='admins').exists()):
                return Response(
                    {'detail': 'У вас нет прав для просмотра неподтвержденных пользователей'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # users = User.objects.filter(profile__is_verified=False)
            users = User.objects.filter(
                profile__is_verified=False
            ).select_related('profile').prefetch_related('groups')
            
            # пагинация
            page = self.paginate_queryset(users)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            # Если пагинация не применялась
            serializer = self.get_serializer(users, many=True)
            return Response(serializer.data if serializer.data else [])
        
        except Exception as e:
            logger.error(f"Error fetching unverified users: {str(e)}")
            return Response([], status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GroupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для просмотра групп
    """
    queryset = Group.objects.all()
    #queryset = Group.objects.annotate(user_count=models.Count('user'))    
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.prefetch_related('user_set').all()

class AuthViewSet(viewsets.GenericViewSet):
    """
    ViewSet для аутентификации и регистрации
    """
    # Разные сериализаторы для разных действий
    def get_serializer_class(self):
        if self.action == 'register':
            return RegisterSerializer
        elif self.action == 'password_reset':
            return PasswordResetSerializer
        elif self.action == 'password_reset_confirm':
            return PasswordResetConfirmSerializer
        return EmptySerializer  # Для logout сериализатор не нужен

    def get_success_headers(self, data):
        """
        Стандартная реализация из DRF's CreateModelMixin
        Возвращает заголовки с Location для созданного ресурса
        """
        try:
            return {'Location': str(data[api_settings.URL_FIELD_NAME])}
        except (TypeError, KeyError):
            return {}

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """
        Регистрация нового пользователя
        POST /api/auth/register/
        Разрешено всем (AllowAny)
        """
        try:
            with transaction.atomic():
                print(f"request.data={request.data}")
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                user = serializer.save()               

                #  # Создаем профиль пользователя
                # UserProfile.objects.create(
                #     user=user,
                #     is_verified=False,
                #     registration_date=timezone.now()
                # )

                # Записываем в историю
                ActionHistory.objects.create(
                    user=user,
                    action_type='registration',
                    description=f"Пользователь {user.username} зарегистрировался",
                    ip_address=request.META.get('REMOTE_ADDR')
                )
        
                # Отправляем уведомление админам
                try:
                    admins = User.objects.filter(groups__name='admins')
                    for admin in admins:
                        Notification.objects.create(
                            notification_type='registration',
                            recipient=admin,
                            message=f"Новый пользователь {user.username} ожидает подтверждения"
                        )
                except Exception as notification_error:
                    logger.error(f"Failed to send notifications: {notification_error}")
                        
                headers = self.get_success_headers(serializer.data)
                return Response(
                    {'detail': 'Пользователь успешно зарегистрирован. Ожидайте подтверждения администратором.',
                        'user_id': user.id,
                        'username': user.username
                    },
                    status=status.HTTP_201_CREATED,
                    headers=headers
                )
        except serializers.ValidationError as e:
            # Ошибки валидации от сериализатора
            return Response(
                {'detail': 'Ошибка валидации', 'errors': e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except IntegrityError as e:
            logger.error(f"Integrity error during registration: {e}")
            return Response(
                {'detail': 'Ошибка при создании пользователя (возможно, имя уже занято)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except DatabaseError as e:
            logger.error(f"Database error during registration: {e}")
            return Response(
                {'detail': 'Ошибка базы данных'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f"Unexpected error during registration: {e}")
            return Response(
                {'detail': 'Ошибка при регистрации: ' + str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Выход из системы (инвалидация токена)
        POST /api/auth/logout/
        """
        try:
            with transaction.atomic():
                # refresh_token = request.data['refresh']
                refresh_token = request.data.get('refresh')
                # 1. Проверка наличия токена
                if not refresh_token:
                    # raise Exception("Refresh token не предоставлен")
                    return Response(
                        {'detail': 'Refresh token обязателен для выхода из системы'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # 2. Проверка формата токена
                if not isinstance(refresh_token, str) or not refresh_token.strip():
                    return Response(
                        {'detail': 'Неверный формат refresh token'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                try:
                    # 3. Валидация токена
                    token = RefreshToken(refresh_token)

                    # 4. Проверка, не заблокирован ли уже токен
                    if BlacklistedToken.objects.filter(token__token=refresh_token).exists():
                        return Response(
                            {'detail': 'Данный токен уже недействителен'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    # 5. Проверка принадлежности токена пользователю
                    user_id = token.payload.get('user_id')
                    if user_id != request.user.id:
                        return Response(
                            {'detail': 'Токен не принадлежит текущему пользователю'},
                            status=status.HTTP_403_FORBIDDEN
                        )

                    # 6. Блокировка токена
                    token.blacklist()

                    # Записываем в историю
                    ActionHistory.objects.create(
                        user=request.user,
                        action_type='logout',
                        description=f"Пользователь {request.user.username} вышел из системы",
                        ip_address=request.META.get('REMOTE_ADDR')
                    )

                    return Response(
                        {'detail': 'Успешный выход из системы.'},
                        status=status.HTTP_205_RESET_CONTENT
                    )
                except TokenError as e:
                    return Response(
                        {'detail': f'Недействительный refresh token: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except Exception as e:
            ActionHistory.objects.create(  # Запись о неудачном выходе
                user=request.user if request.user.is_authenticated else None,
                action_type='logout',
                description=f"Ошибка при выходе: {str(e)}",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def password_reset(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        user = get_object_or_404(User, email=email)
        
        # Генерируем токен для сброса пароля
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Отправляем email с ссылкой для сброса
        reset_url = f"{settings.FRONTEND_URL}/password-reset-confirm/{uid}/{token}/"
        subject = "Сброс пароля"
        message = render_to_string('password_reset_email.html', {
            'user': user,
            'reset_url': reset_url,
        })
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        
        return Response(
            {'detail': 'Инструкции по сбросу пароля отправлены на ваш email.'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def password_reset_confirm(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
        
        if user is not None and default_token_generator.check_token(user, serializer.validated_data['token']):
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            # Записываем в историю
            ActionHistory.objects.create(
                user=user,
                action_type='password_reset',
                description=f"Пользователь {user.username} сбросил пароль",
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            return Response(
                {'detail': 'Пароль успешно изменен.'},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'detail': 'Ссылка для сброса пароля недействительна.'},
                status=status.HTTP_400_BAD_REQUEST
            )

class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления уведомлениями
    """
    # Указываем сериализатор для преобразования данных
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    # Поля, по которым можно фильтровать уведомления через query params
    # filterset_fields = ['sender', 'recipient', 'notification_type']

    def get_queryset(self):
        user = self.request.user                    #Получаем текущего пользователя, который сделал запрос к API или вью.
        # Если пользователь не аутентифицирован (не вошёл в систему), 
        # возвращаем пустой queryset — никаких уведомлений для него нет.
        # Notification.objects.none() — специальный пустой queryset.
        if not user.is_authenticated:           
            return Notification.objects.none()
        
        # Базовый запрос с оптимизацией
        queryset = Notification.objects.select_related(     # Notification.objects — базовый менеджер модели уведомлений.
            'sender', 'recipient', 'group_recipient'        # оптимизация через жадную загрузку связанных объектов по ForeignKey.
        ).prefetch_related(                                 # оптимизация для связанных объектов, которые идут через обратные связи или ManyToMany.
            'notification_profile',                         # связанные профили уведомлений
            'group_recipient__user_set'                     # пользователи, входящие в группы-получатели
        ).annotate(                                         # добавляем вычисляемые поля к каждому уведомлению
            unread_count=Count('id', filter=Q(notification_profile__is_read=False)),    # количество уведомлений с непрочитанным статусом
            is_new_annotated=Case(  # Добавляет булево поле is_new_annotated, которое равно True, если уведомление создано в течение последнего часа (date_created > сейчас - 1 час), иначе False
                When(date_created__gt=timezone.now() - timezone.timedelta(hours=1), then=Value(True)),
                default=Value(False),
                output_field=BooleanField()
            )
        )
        return queryset
        # Фильтрация в зависимости от роли пользователя
        # Если пользователь — суперпользователь (админ с полными правами), возвращаем все уведомления без ограничений.
        if user.is_superuser:
            return queryset.all()
        
        # Если пользователь состоит в группе с названием 'admins', то возвращаем уведомления, которые:
        # адресованы лично ему (recipient=user),
        # или адресованы любой из его групп (group_recipient__in=user.groups.all()),
        # или он сам является отправителем (sender=user).
        if user.groups.filter(name='admins').exists():
            return queryset.filter(
                Q(recipient=user) | 
                Q(group_recipient__in=user.groups.all()) |
                Q(sender=user)
            ).distinct()
        
        # Для всех остальных пользователей возвращаем уведомления, которые:
        # адресованы лично им,
        # или адресованы их группам.
        return queryset.filter(
            Q(recipient=user) | 
            Q(group_recipient__in=user.groups.all())
        ).distinct()

    # def get_serializer_class(self):
    #     if self.action == 'retrieve':
    #         return NotificationDetailSerializer
    #     return NotificationSerializer

    # -
    @action(detail=False, methods=['get'])
    def check_new(self, request):
        """
        Проверка наличия новых уведомлений для текущего пользователя
        GET /api/notifications/check_new/
        """
        count = self.get_queryset().filter(_is_new=True).count()
        return Response({'has_new': count > 0, 'count': count})
    # -
    @action(detail=False, methods=['get'])
    def check_active(self, request):
        """
        Проверка наличия активных уведомлений для текущего пользователя
        GET /api/notifications/check_active/
        """
        count = self.get_queryset().filter(_is_active=True).count()
        return Response({'has_active': count > 0, 'count': count})
    # -
    @action(detail=False, methods=['get'])
    def check_new_active(self, request):
        """
        Проверка наличия новых и активных уведомлений
        GET /api/notifications/check_new_active/
        """
        count = self.get_queryset().filter(_is_new=True, _is_active=True).count()
        return Response({'has_new_active': count > 0, 'count': count})

    # стандартный метод в Django REST Framework (DRF) для обработки GET-запроса на получение списка объектов
    #  возвращает список уведомлений с возможностью фильтрации и постраничного вывода (пагинации).    
    def list(self, request, *args, **kwargs):
        """
        1. GET список всех уведомлений для текущего пользователя
        с пагинацией и фильтрацией
        """
        if not (request.user.is_superuser or request.user.groups.filter(name='admins').exists()):
                return Response(
                    {'detail': 'У вас нет прав для просмотра неподтвержденных пользователей'},
                    status=status.HTTP_403_FORBIDDEN
                )
        # Получаем базовый queryset — набор уведомлений, доступных текущему пользователю.
        #   self.get_queryset() — метод, который возвращает исходный queryset (обычно с фильтрацией по пользователю и оптимизациями).
        #   self.filter_queryset(queryset) — применяет дополнительные фильтры, например, из DRF-фильтров (если они настроены).
        queryset = self.filter_queryset(self.get_queryset())
        
        # Применяем фильтры из query params
        sender_id = request.query_params.get('sender')
        if sender_id:
            queryset = queryset.filter(sender__id=sender_id)
        
        recipient_id = request.query_params.get('recipient')
        if recipient_id:
            queryset = queryset.filter(recipient__id=recipient_id)
        
        is_new = request.query_params.get('is_new')
        if is_new:
            queryset = queryset.filter(
                date_created__gt=timezone.now() - timezone.timedelta(hours=1)
            ) if is_new.lower() == 'true' else queryset.exclude(
                date_created__gt=timezone.now() - timezone.timedelta(hours=1)
            )
        
        is_active = request.query_params.get('is_active')
        if is_active:
            queryset = queryset.filter(
                notification_profile__is_active=True
            ) if is_active.lower() == 'true' else queryset.exclude(
                notification_profile__is_active=True
            )
        
        is_read = request.query_params.get('is_read')
        if is_read:
            queryset = queryset.filter(
                notification_profile__is_read=True
            ) if is_read.lower() == 'true' else queryset.exclude(
                notification_profile__is_read=True
            )
        
        # Пагинация
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)        

    def retrieve(self, request, *args, **kwargs):
        """
        Просмотр уведомления с автоматическим обновлением is_read=True
        """
        if not (request.user.is_superuser or request.user.groups.filter(name='admins').exists()):
                return Response(
                    {'detail': 'У вас нет прав для просмотра неподтвержденных пользователей'},
                    status=status.HTTP_403_FORBIDDEN
                )
        response = super().retrieve(request, *args, **kwargs)
        print(response.data['id'])
        if response.status_code == status.HTTP_200_OK:
            notification_id = response.data['id']
            # Обновляем статусы уведомления
            # NotificationProfile.objects.filter(
            #     notification_id=notification_id
            # ).update(is_read=True, is_active=False, is_new=False)
            
        return response

    #@action(detail=False, methods=['get'], url_path=r'by_sender/(?P<sender_id>\d+)')
    # def by_sender(self, request, sender_id, pk=None):
    @action(detail=False, methods=['get'])
    def by_sender(self, request, pk=None):
        """
        2. GET список уведомлений по заданному sender_id
        """
        # sender_id = request.query_params.get('sender_id')        
        sender_id = self.request.user.id
        
        if not sender_id:
            return Response(
                {'detail': 'Необходимо указать sender_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(sender__id=sender_id)
        # Создаем список уведомлений с дополнительным полем recipient_name
        notifications = []        
        for notification in queryset:            
            notification_data = {
                'id': notification.id,
                'notification_type': notification.notification_type,
                'sender': notification.sender.id,                
                'recipient': notification.recipient.id,
                'recipient_name': notification.recipient.first_name  if notification.recipient.first_name != '' else  notification.recipient.username, 
                'group_recipient': notification.group_recipient.id if notification.group_recipient else None,
                'date_created': notification.date_created,
                'message': notification.message,
                'notification_profile': {
                    'is_read': notification.notification_profile.is_read,
                    'is_active': notification.notification_profile.is_active,
                    'is_new': notification.notification_profile.is_new
                }
            }
            notifications.append(notification_data)

        # serializer = self.get_serializer(queryset, many=True)
        # return Response(serializer.data)
        return Response(notifications)
    
    @action(detail=False, methods=['get'])
    def by_recipient(self, request, pk=None):
        """
        3. GET список уведомлений по заданному recipient_id
        """
        # recipient_id = request.query_params.get('recipient_id')
        recipient_id = self.request.user.id
        if not recipient_id:
            return Response(
                {'detail': 'Необходимо указать recipient_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(recipient__id=recipient_id)        
        serializer = self.get_serializer(queryset, many=True)
        
        # Создаем список уведомлений с дополнительным полем sender_name
        notifications = []        
        for notification in queryset:         
            print(f"fffff-<{notification}")
            print(f"fffff-<{notification.id}")
            if hasattr(notification, 'notification_profile'):
                print(f"fffff-123")
            else:
                print(f"fffff-000")
            notification_data = {
                'id': notification.id,
                'notification_type': notification.notification_type,
                'sender': notification.sender.id if notification.sender is not None else None,
                'sender_name': None if (notification.sender is None) else (notification.sender.first_name if notification.sender.first_name != '' else  notification.sender.username), 
                'recipient': notification.recipient.id,
                'group_recipient': notification.group_recipient.id if notification.group_recipient else None,
                'date_created': notification.date_created,
                'message': notification.message,
                'notification_profile': {
                    'is_read': notification.notification_profile.is_read,
                    'is_active': notification.notification_profile.is_active,
                    'is_new': notification.notification_profile.is_new
                } if hasattr(notification, 'notification_profile') else {
                    'is_read': False,
                    'is_active': True,
                    'is_new': True
                }
            }
            notifications.append(notification_data)
        #     print(f"otification_data->{notification_data}")
        # print(f"notifications->{notifications}")
        # sss = self.get_serializer(notifications, many=True) 
        # print(f"sss->", sss.data)
        return Response(notifications)

        # serializer = self.get_serializer(queryset, many=True)

        # Обновляем профиль уведомления для каждого уведомления
        # for notification in queryset:
        #     if hasattr(notification, 'notification_profile'):                
        #         profile = notification.notification_profile
        #         if profile:
        #             profile.is_read = False
        #             profile.is_active = False
        #             profile.is_new = False
        #             profile.save()

        # return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def new_by_recipient(self, request, pk=None):
        """
        4. GET наличие новых уведомлений для получателя
        """
        # recipient_id = request.query_params.get('recipient_id', request.user.id)
        recipient_id = self.request.user.id
        count = self.get_queryset().filter(
            recipient__id=recipient_id,
            date_created__gt=timezone.now() - timezone.timedelta(hours=1)
        ).count()
        
        return Response({'has_new': count > 0, 'count': count})
    
    @action(detail=False, methods=['get'])
    def active_by_recipient(self, request, pk=None):
        """
        5. GET наличие активных уведомлений для получателя
        """
        # recipient_id = request.query_params.get('recipient_id', request.user.id)
        recipient_id = self.request.user.id
        count = self.get_queryset().filter(
            recipient__id=recipient_id,
            notification_profile__is_active=True
        ).count()
        
        return Response({'has_active': count > 0, 'count': count})
    
    @action(detail=False, methods=['get'])
    def unread_by_recipient(self, request, pk=None):
        """
        6. GET наличие непрочитанных уведомлений для получателя
        """
        # recipient_id = request.query_params.get('recipient_id', request.user.id)
        recipient_id = self.request.user.id
        count = self.get_queryset().filter(
            recipient__id=recipient_id,
            notification_profile__is_read=False
        ).count()
        
        return Response({'has_unread': count > 0, 'count': count})

    # @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def perform_create(self, serializer):
        """
        7. POST создание уведомления (sender берется из текущего пользователя)
        """
        notification = serializer.save(sender=self.request.user)
        print(f'user={self.request.user}')
        print(f'user={self.request.user.is_authenticated}')
        print(f'auten={IsAuthenticated()}')
        # Создаем профиль уведомления
        NotificationProfile.objects.create(
            notification=notification,
            is_read=False,
            is_active=True,
            is_new=True
        )
        # Запись в историю о создании уведомления
        ActionHistory.objects.create(
            user=self.request.user,
            action_type='notification_sent',
            description=f"Пользователь {self.request.user.username} отправил уведомление пользователю {notification.recipient.username}",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
        # Для групповых уведомлений создаем копии для каждого пользователя
        if notification.group_recipient:
            for user in notification.group_recipient.user_set.all():
                if user != self.request.user:  # Не дублируем для отправителя
                    new_notification = Notification.objects.create(
                        notification_type=notification.notification_type,
                        sender=notification.sender,
                        recipient=user,
                        message=notification.message
                    )
                    NotificationProfile.objects.create(
                        notification=new_notification,
                        is_read=False,
                        is_active=True,
                        is_new=True
                    )
            # Запись в историю для каждого группового уведомления
            ActionHistory.objects.create(
                user=self.request.user,
                action_type='notification_sent',
                description=f"Пользователь {self.request.user.username} отправил групповое уведомление (группа {notification.group_recipient.name}) пользователю {user.username}",
                ip_address=self.request.META.get('REMOTE_ADDR')
            )
            notification.delete()  # Удаляем оригинальное групповое уведомление
    #-
    def perform_update(self, serializer):
        """
        Обновление уведомления с обновлением is_new если прошло больше часа
        """
        
        if not self.request.user.is_superuser:
            raise PermissionDenied("Только суперпользователь может изменять уведомления")
        notification = serializer.save()
        
        # Если с момента создания прошло больше часа, помечаем как не новое
        if (timezone.now() - notification.date_created).total_seconds() > 3600:
            NotificationProfile.objects.filter(
                notification=notification
            ).update(is_new=False)

    def perform_destroy(self, instance):
        """
        9. DELETE уведомления (только для суперпользователя)
        """
        if not self.request.user.is_superuser:
            raise PermissionDenied("Только суперпользователь может удалять уведомления")
        
        # Запись в историю
        ActionHistory.objects.create(
            user=self.request.user,
            action_type='notification_deleted',
            description=f"Пользователь {self.request.user.username} удалил уведомление",
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
        super().perform_destroy(instance)

    @action(detail=True, methods=['get'])
    def mark_as_read(self, request, pk=None):
        """
        10. Просмотр уведомления с отметкой как прочитанного
        """
        notification = self.get_object()
        
        # Проверка прав доступа
        if not (request.user.is_superuser or 
                notification.recipient == request.user or
                (notification.group_recipient and 
                request.user in notification.group_recipient.user_set.all())):
            return Response(
                {'detail': 'У вас нет прав для просмотра этого уведомления'},
                status=status.HTTP_403_FORBIDDEN
            )
        if notification.notification_type == 'registration':
            return Response(status=status.HTTP_204_NO_CONTENT)    
        # Обновляем профиль уведомления
        if hasattr(notification, 'notification_profile'):
            print(notification.notification_profile.is_read)
            notification_profile = notification.notification_profile
            notification_profile.is_read = True
            notification_profile.is_active = False
            notification_profile.is_new = False
            notification_profile.save()      
            
            # # Запись в историю о прочтении уведомления
            # description = f"Пользователь {request.user.username} прочитал {notification.get_notification_type_display()} уведомление от {notification.sender.username if notification.sender else 'системы'}",
            # if notification.sender is None:
            #     description = f"Системное уведомление было прочитано пользователем {request.user.username}"
            # if notification.group_recipient:
            #     description = f"Пользователь {request.user.username} прочитал групповое уведомление (группа {notification.group_recipient.name})"
            # ActionHistory.objects.create(
            #     user=request.user,
            #     action_type='notification_read',
            #     description=description, 
            #     ip_address=request.META.get('REMOTE_ADDR')
            # )
              
            print(notification.notification_profile.is_read)
            serializer = self.get_serializer(notification)
            print(serializer.data['id'])
            return Response(serializer.data)
        return Response(status=status.HTTP_204_NO_CONTENT)

class ActionHistoryPagination(PageNumberPagination):
    """
    Вспомогательный класс для пагинации
    Args:
        PageNumberPagination (_type_): _description_
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class ActionHistoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet для просмотра и удаления истории действий (только суперпользователь)
    """
    queryset = ActionHistory.objects.all()
    serializer_class = ActionHistorySerializer
    permission_classes = [IsSuperUser]
    pagination_class = ActionHistoryPagination    
    http_method_names = ['get', 'delete', 'patch']  # Запрещаем put, post
      
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not user.is_superuser:        
            return ActionHistory.objects.none()

        # Начинаем с неудалённых записей
        queryset = ActionHistory.objects.all()  

        # Фильтры
        action_type = self.request.query_params.get('action_type')
        username = self.request.query_params.get('user')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        is_deleted = self.request.query_params.get('is_deleted')

        if action_type:
            queryset = queryset.filter(action_type=action_type)
        if username:
            queryset = queryset.filter(user__username__icontains=username)
        if start_date:
            queryset = queryset.filter(action_date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(action_date__date__lte=end_date)
        if is_deleted is not None:
            queryset = queryset.filter(is_deleted=is_deleted.lower() == 'true')

        return queryset.order_by('-action_date')

    @action(detail=False, methods=['get'], url_path='active')    
    def active_entries(self, request):    
        """
        Получить все активные записи (is_deleted=False)
        """
        queryset = self.get_queryset().filter(is_deleted=False)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='deleted')
    def deleted_entries(self, request):
        """
        Получить все удаленные записи (is_deleted=True)
        """
        queryset = self.get_queryset().filter(is_deleted=True)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='hard-delete')
    def hard_delete(self, request, pk=None):
        """
        Физическое удаление записи (только для is_deleted=True)
        """
        instance = self.get_object()
        if not instance.is_deleted:
            return Response(
                {"detail":"Можно удалять только записи, помеченные как удаленные."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['patch'], url_path='restore')
    def restore(self, request, pk=None):
        """
        Восстановление записи (установка is_deleted=False)
        """
        instance = self.get_object()    
        if not instance.is_deleted:
            return Response(
                {"detail": "Запись не была удалена."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.is_deleted = False
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Мягкое удаление (установка is_deleted=True)
        """
        instance = self.get_object()
        if instance.is_deleted:
            return Response(
                {"detail": "Запись уже удалена."},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.is_deleted = True
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
                
        
    
    
    
    
    
    
    
    

    # def get_serializer(self, *args, **kwargs):
    #     # Разрешаем partial update при patch
    #     # kwargs['partial'] = True  # нет смысла так как update запрещён. возможно в будущем пригодится
    #     return super().get_serializer(*args, **kwargs)
    
    # def update(self, request, *args, **kwargs):
    #     # Запрещаем редактирование
    #     raise PermissionDenied("Редактирование истории действий запрещено.")
    
    # def partial_update(self, request, *args, **kwargs):
    #     # Запрещаем частичное редактирование
    #     raise PermissionDenied("Изменение истории действий запрещено.")
    
    # def create(self, request, *args, **kwargs):
    #     # Запрещаем создание
    #     raise PermissionDenied("Создание записей истории запрещено.")
    
    @action(detail=True, methods=['delete'])
    def purge(self, request, pk=None):
        """
        Hard delete — физическое удаление (только для is_deleted=True)
        """
        instance = self.get_object()
        if not instance.is_deleted:
            raise PermissionDenied("Можно удалять только помеченные записи.")
        self.perform_destroy(instance)
        return Response(status=204)
    
    def destroy(self, request, *args, **kwargs):
        """
        Soft delete — помечаем как удалённое
        """
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response(status=204)

    def _get_filtered_queryset(self, is_deleted):
        """Общий метод для фильтрации и пагинации"""
        queryset = ActionHistory.objects.filter(is_deleted=is_deleted)
    
        # Применяем фильтры
        action_type = self.request.query_params.get('action_type')
        if action_type:
            queryset = queryset.filter(action_type=action_type)
    
        username = self.request.query_params.get('user')
        if username:
            queryset = queryset.filter(user__username__icontains=username)
    
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(action_date__date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(action_date__date__lte=end_date)

        queryset = queryset.order_by('-action_date')
        page = self.paginate_queryset(queryset)
    
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
    
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='deleted-not', url_name='deleted_not') 
    def deleted_not(self, request):
        """
        Возвращает пагинированный список НЕудалённых записей (is_deleted=False)
        с поддержкой фильтрации
        """
        return self._get_filtered_queryset(is_deleted=False)

    @action(detail=False, methods=['get'], url_path='deleted-yes', url_name='deleted_yes')
    def deleted_yes(self, request):
        """
        Возвращает пагинированный список удалённых записей (is_deleted=True)
        с поддержкой фильтрации
        """
        return self._get_filtered_queryset(is_deleted=True)

    @action(detail=True, methods=['patch', 'post', 'put'], url_path='restore', url_name='restore')
    def restore(self, request, pk=None):
        """
        востановление удалённой записи
        меняет is_deleted с True на False.
        """
        instance = self.get_object()
        if not instance.is_deleted:            
            #raise ValidationError("Эта запись не была помечена на удаление")
            return Response(
                {"detail": "Эта запись не была помечена на удаление."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.is_deleted = False
        instance.save()

        serializers = self.get_serializer(instance)
        return Response(serializers.data)

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Кастомный view для получения JWT токенов с проверкой подтверждения пользователя
    """
    serializer_class = CustomTokenObtainPairSerializer

# class LogoutView(generics.GenericAPIView):
#     """
#     View для выхода из системы (добавление refresh токена в черный список)
#     """
#     permission_classes = [IsAuthenticated]
    
#     def post(self, request):
#         try:
#             refresh_token = request.data['refresh']
#             token = RefreshToken(refresh_token)
#             token.blacklist()
            
#             # Записываем в историю
#             ActionHistory.objects.create(
#                 user=request.user,
#                 action_type='logout',
#                 description=f"Пользователь {request.user.username} вышел из системы",
#                 ip_address=request.META.get('REMOTE_ADDR')
#             )
            
#             return Response(status=status.HTTP_205_RESET_CONTENT)
#         except Exception as e:
#             return Response(status=status.HTTP_400_BAD_REQUEST)

# class CustomTokenObtainPairView(TokenObtainPairView):
#     """
#     Кастомное представление для получения JWT токенов
#     """
#     serializer_class = CustomTokenObtainPairSerializer

# class RegisterViewSet(viewsets.GenericViewSet):
#     """
#     Представление для регистрации пользователей
#     """
#     serializer_class = RegisterSerializer
    
#     @action(detail=False, methods=['post'])
#     def register(self, request):
#         serializer = self.get_serializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         user = serializer.save()
        
#         # Добавляем пользователя в группу users по умолчанию
#         users_group = Group.objects.get(name='users')
#         user.groups.add(users_group)
        
#         return Response(
#             {'detail': 'Пользователь успешно зарегистрирован. Ожидайте подтверждения.'},
#             status=status.HTTP_201_CREATED
#         )

# # class UserViewSet(viewsets.ModelViewSet):       
# #     """
# #     Представление для работы с пользователями
# #     Наследуемся от этого класса, чтобы получить все стандартные CRUD операции (Create, Read, Update, Delete)
# #     """
# #     queryset = User.objects.all()               #  будут доступны (все пользователи)
# #     serializer_class = UserSerializer           # сериализатор для преобразования данных
# #     permission_classes = [IsAuthenticated]      #  Базовые права доступа - только для аутентифицированных пользователей
    
# #     # Кастомизация прав доступа
# #     def get_permissions(self):
# #         """
# #         Определение прав доступа в зависимости от действия
# #         """
# #         if self.action in ['retrieve']:             # retrieve (GET /users/id/)
# #             self.permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]
# #         if self.action in ['list']:             # list (GET /users/) 
# #             self.permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]
# #         elif self.action in ['update', 'partial_update']:       # update (PUT) и partial_update (PATCH)
# #             self.permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]
# #         elif self.action == 'destroy':                          # destroy (DELETE)
# #             self.permission_classes = [IsAuthenticated, CanDeleteUser]
# #         return super().get_permissions()                        # Применяет сконфигурированные права доступа
    
# #     @action(detail=False, methods=['get'])
# #     def me(self, request):
# #         """
# #         Получение информации о текущем пользователе
# #         """
# #         serializer = self.get_serializer(request.user)
# #         return Response(serializer.data)
    
# #     @action(detail=False, methods=['delete'])
# #     def me(self, request):
# #         """
# #         Удаление текущего пользователя
# #         DELETE /api/users/me/
# #         """
# #         user = request.user
        
# #         # Дополнительная проверка (хотя IsAuthenticated уже проверяет)
# #         if not user.is_authenticated:
# #             return Response(
# #                 {'detail': 'Требуется аутентификация'},
# #                 status=status.HTTP_401_UNAUTHORIZED
# #             )
        
# #         # Логирование перед удалением
# #         print(f"Удаление пользователя {user.username} (ID: {user.id})")
        
# #         # Мягкое удаление (если используется)
# #         # user.is_active = False
# #         # user.set_unusable_password()
# #         # user.save()
        
# #         # Полное удаление
# #         user.delete()
        
# #         return Response(
# #             {'detail': 'Ваш аккаунт успешно удален'},
# #             status=status.HTTP_204_NO_CONTENT
# #         )
    

# #     @action(detail=False, methods=['post'])
# #     def logout(self, request):
# #         """
# #         Выход из системы (инвалидация токена)
# #         """
# #         print("DDSASdsa")
# #         try:
# #             refresh_token = request.data['refresh']
# #             print(f"refresh_token: {refresh_token}")
# #             token = RefreshToken(refresh_token)
            
# #             # token = OutstandingToken.objects.get(token=refresh_token)
# #             # print("OutstandingToken.objects.get(token=refresh_token)...")
# #             print(f"token: {token}")
# #             # BlacklistedToken.objects.get_or_create(token=token)
# #             # print(f"BlacklistedToken.objects.get_or_create(token=token)...")
# #             token.blacklist()            
# #             print(f"token.blacklist()...")
# #             return Response({'detail': 'Успешный выход из системы.'}, status=status.HTTP_205_RESET_CONTENT)
# #         # except OutstandingToken.DoesNotExist:
# #         #     return Response({'detail': 'Недействительный токен'}, status=400)
# #         except Exception as e:
# #             return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
# #     # def get_serializer_class(self):
# #     #     if self.action == 'list':
# #     #         return UserWithGroupsSerializer
# #     #     return UserSerializer
    
# #     # def get_queryset(self):
# #     #     if self.action == 'list':
# #     #         return User.objects.filter(
# #     #             Q(profile__is_verified=True) | Q(is_superuser=True)
# #     #         ).select_related('profile').prefetch_related('groups')
# #     #     return super().get_queryset()
    
# #     def get_serializer_class(self):
# #         if self.action == 'verified':
# #             return VerifiedUserSerializer
# #         return super().get_serializer_class()
    
# #     @action(detail=False, methods=['get'])
# #     def verified(self, request):
# #         """
# #         Список подтвержденных пользователей с superuser в конце
# #         """
# #         # Получаем подтвержденных пользователей
# #         # verified_users = User.objects.filter(
# #         #     profile__is_verified=True
# #         # ).exclude(is_superuser=True).select_related('profile').prefetch_related('groups')
# #         verified_users = User.objects.filter(
# #             profile__is_verified=True
# #         ).exclude(
# #             Q(is_superuser=True) | Q(id=request.user.id)
# #         ).select_related('profile').prefetch_related('groups')
        
# #         # verified_users2 = User.objects.filter(
# #         #     profile__is_verified=True
# #         # ).exclude(is_superuser=True).select_related('profile').prefetch_related('groups')
# #         # verified_users = verified_users2.exclude(id=request.user.id)

# #         queryset =  sorted(
# #             list(verified_users) + list(User.objects.filter(is_superuser=True).prefetch_related('groups')),
# #             key=lambda x: (not x.is_superuser, x.username)
# #             ) if request.user.is_superuser == False  else sorted(
# #                 list(verified_users),
# #                 key=lambda x: (x.username)
# #             )
# #         # if request.user.is_superuser == False:
# #         #     superusers = User.objects.filter(is_superuser=True).prefetch_related('groups')
        
# #         #     # Объединяем и сортируем
# #         #     queryset2 = sorted(
# #         #         list(verified_users) + list(superusers),
# #         #         key=lambda x: (not x.is_superuser, x.username)
# #         #     )
# #         #     queryset=queryset2
# #         # else: 
# #         #     queryset2 = sorted(
# #         #         list(verified_users),
# #         #         key=lambda x: (x.username))
# #         #     queryset=queryset2
        
# #         page = self.paginate_queryset(queryset)
# #         if page is not None:
# #             serializer = self.get_serializer(page, many=True)
# #             return self.get_paginated_response(serializer.data)
            
# #         serializer = self.get_serializer(queryset, many=True)
# #         return Response(serializer.data)
    
# #     # Добавим проверку в самом методе destroy для дополнительной безопасности
# #     def destroy(self, request, *args, **kwargs):
# #         instance = self.get_object()

# #         # Дополнительная проверка (дублирует permission для ясности)
# #         if not (request.user == instance or 
# #                 request.user.is_superuser or
# #                 (request.user.groups.filter(name='admins').exists() and 
# #                     instance.groups.filter(name__in=['users', 'extusers']).exists())):
# #             return Response(
# #                 {'detail': 'У вас нет прав для удаления этого пользователя'},
# #                 status=status.HTTP_403_FORBIDDEN
# #             )
            
# #         return super().destroy(request, *args, **kwargs) 
    
# #     @action(detail=True, methods=['post'])
# #     def assign_group(self, request, pk=None):
# #         """
# #         Назначение группы пользователю и подтверждение
# #         POST /api/users/{id}/assign_group/
# #         Body: {"group": "group_name"}
# #         """
# #         user = self.get_object()
# #         group_name = request.data.get('group')

# #         if not group_name:
# #             return Response(
# #                 {'detail': 'Не указана группа'},
# #                 status=status.HTTP_400_BAD_REQUEST
# #             )

# #         try:
# #             group = Group.objects.get(name=group_name)
# #         except Group.DoesNotExist:
# #             return Response(
# #                 {'detail': 'Группа не существует'},
# #                 status=status.HTTP_400_BAD_REQUEST
# #             )

# #         # Проверка прав
# #         if not CanAssignGroups().has_object_permission(request, self, user):
# #             return Response(
# #                 {'detail': 'У вас нет прав для назначения этой группы'},
# #                 status=status.HTTP_403_FORBIDDEN
# #             )

# #         # Назначение группы
# #         user.groups.clear()
# #         user.groups.add(group)

# #         # Подтверждение пользователя
# #         if hasattr(user, 'profile'):
# #             user.profile.is_verified = True
# #             user.profile.verification_date = timezone.now()
# #             user.profile.save()

# #         return Response(
# #             {
# #                 'detail': f'Пользователь добавлен в группу {group_name} и подтвержден',
# #                 'user_id': user.id,
# #                 'group': group_name,
# #                 'is_verified': True
# #             },
# #             status=status.HTTP_200_OK
# #         )

# #     @action(detail=True, methods=['patch'])
# #     def change_group(self, request, pk=None):
# #         """
# #         Изменение группы пользователя
# #         PATCH /api/users/{id}/change_group/
# #         Body: {"new_group": "group_name"}
# #         """
# #         user = self.get_object()
# #         new_group_name = request.data.get('new_group')

# #         if not new_group_name:
# #             return Response(
# #                 {'detail': 'Не указана новая группа'},
# #                 status=status.HTTP_400_BAD_REQUEST
# #             )

# #         try:
# #             new_group = Group.objects.get(name=new_group_name)
# #         except Group.DoesNotExist:
# #             return Response(
# #                 {'detail': 'Группа не существует'},
# #                 status=status.HTTP_400_BAD_REQUEST
# #             )

# #         # Проверка прав
# #         if new_group_name == 'admins' and not request.user.is_superuser:
# #             return Response(
# #                 {'detail': 'Только superuser может назначать группу admins'},
# #                 status=status.HTTP_403_FORBIDDEN
# #             )

# #         if not request.user.is_superuser and not request.user.groups.filter(name='admins').exists():
# #             return Response(
# #                 {'detail': 'У вас нет прав для изменения групп'},
# #                 status=status.HTTP_403_FORBIDDEN
# #             )

# #         # Изменение группы
# #         user.groups.clear()
# #         user.groups.add(new_group)

# #         return Response(
# #             {
# #                 'detail': f'Группа пользователя изменена на {new_group_name}',
# #                 'user_id': user.id,
# #                 'new_group': new_group_name
# #             },
# #             status=status.HTTP_200_OK
# #         )

# class GroupViewSet(viewsets.ModelViewSet):
#     """
#     Представление для работы с группами
#     """
#     queryset = Group.objects.all()
#     serializer_class = GroupSerializer
#     permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]

# class UserProfileViewSet(viewsets.ModelViewSet):
    # """
    # Представление для работы с профилями пользователей
    # """
    # queryset = UserProfile.objects.all()
    # serializer_class = UserProfileSerializer
    # permission_classes = [IsAuthenticated & (IsAdminUser | IsSuperUser)]
    
    # @action(detail=True, methods=['patch'])
    # def verify(self, request, pk=None):
    #     """
    #     Подтверждение пользователя
    #     """
    #     profile = self.get_object()
    #     if profile.is_verified:
    #         return Response(
    #             {'detail': 'Пользователь уже подтвержден'},
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
    #     profile.is_verified = True
    #     profile.verification_date = timezone.now()
    #     profile.save()
    #     return Response({'detail': 'Пользователь подтвержден.'})