# services.py

import logging
from django.db import transaction, DatabaseError
from django.db.utils import IntegrityError
from django.utils import timezone
from django.contrib.auth.models import User, Group
from .models import UserProfile, ActionHistory, Notification

logger = logging.getLogger(__name__)

# class UserService:
#     @classmethod
#     def create_user_with_profile(cls, user_data, request=None):
#         """Создание пользователя с профилем"""
#         with transaction.atomic():
#             user = User.objects.create_user(**user_data)
#             UserProfile.create_for_user(user, is_verified=False, registration_date=timezone.now)
            
#             if request:
#                 ActionHistory.objects.create(
#                     user=user,
#                     action_type='registration',
#                     description=f"Пользователь {user.username} зарегистрировался",
#                     ip_address=request.META.get('REMOTE_ADDR')
#                 )
#             return user

#     @classmethod
#     def handle_group_change(cls, user, new_group, request=None):
#         """Обработка изменения группы пользователя"""
#         with transaction.atomic():
#             old_groups = list(user.groups.all())
#             user.groups.clear()
#             user.groups.add(new_group)
            
#             if request:
#                 ActionHistory.objects.create(
#                     user=request.user,
#                     action_type='group_changed',
#                     description=f"Пользователю {user.username} изменена группа на {new_group.name}",
#                     ip_address=request.META.get('REMOTE_ADDR')
#                 )
#             return old_groups
    
# class ProfileService:
#     @classmethod
#     def verify_user_profile(cls, profile, verified_by=None, request=None):
#         """Верификация профиля пользователя"""
#         with transaction.atomic():
#             profile.update_verification(
#                 is_verified=True,
#                 changed_by=verified_by,
#                 request=request
#             )

class NotificationError(Exception):
    """Кастомное исключение для ошибок работы с уведомлениями"""
    def __init__(self, message, code=None, meta=None):
        self.message = message
        self.code = code or "notification_error"
        self.meta = meta or {}
        super().__init__(message)

class GroupService:
    @classmethod
    @transaction.atomic
    def assign_group_to_user(cls, user, new_group_name, request_user):
        """Общая логика назначения/изменения группы пользователю"""
        # Получаем группу
        group = cls._validate_group(new_group_name, request_user)
        
        # Проверяем текущие группы
        current_groups = user.groups.values_list('name', flat=True)
        cls._check_permissions(group, current_groups, request_user)

        # Основная логика
        user.groups.clear()
        user.groups.add(group)
        cls._update_user_profile(user)
        
        # Логирование и уведомления
        action_type = cls._log_action(user, group, current_groups, request_user)
        # cls._handle_notifications(user, action_type) доработать!!!
        
        return {
            'user': user,
            'group': group,
            'action_type': action_type
        }

    @classmethod
    def _validate_group(cls, group_name, request_user):
        """
        Проверяет существование группы и права пользователя на работу с ней.    
        
        Args:
            group_name (str): Название группы для проверки
            request_user (User): Пользователь, запрашивающий операцию        
        
        Returns:
            Group: Найденная группа        
        
        Raises:
            ValueError: Если группа не существует
            PermissionError: Если у пользователя нет прав на работу с группой
        """
        try:
            # old01 return Group.objects.get(name=group_name)
            # old02 return Group.objects.select_related('some_related_field').get(name=group_name) могла замедлять запрос
            group = Group.objects.get(name=group_name)
            # Дополнительные проверки прав
            if not request_user.is_authenticated:
                raise PermissionError("Требуется аутентификация")            
            if group_name == 'admins' and not request_user.is_superuser:
                raise PermissionError("Только superuser может работать с группой admins")            
            return group
        except Group.DoesNotExist as e:
            logger.error(f"Группа не найдена: {group_name}. Ошибка: {str(e)}")
            raise ValueError(f"Группа '{group_name}' не существует") from e
            # old raise ValueError("Группа не существует")

    @classmethod
    def _check_permissions(cls, group, current_groups, request_user):
        if group.name == 'admins' and not request_user.is_superuser:
            raise PermissionError("Только superuser может работать с группой admins")
            
        if not request_user.is_superuser and group.name not in ['users', 'extusers']:
            raise PermissionError("Можно работать только с группами users или extusers")

        if 'admins' in current_groups and not request_user.is_superuser:
            raise PermissionError("Только superuser может изменять группу admins")

    @classmethod
    def _update_user_profile(cls, user):
        """
        Обновляет профиль пользователя, устанавливая флаг подтверждения и дату
        Args:
            user: Объект пользователя (User)
        Raises:
            ValueError: Если профиль не существует или ошибка при обновлении
        """
        try:
            with transaction.atomic():
                # Проверяем существование профиля
                if not hasattr(user, 'profile'):
                    raise ValueError(f"Профиль не существует для пользователя {user.username}")
                # Проверяем, нужно ли обновлять
                if not user.profile.is_verified:
                    user.profile.is_verified = True
                    user.profile.verification_date = timezone.now()
                    user.profile.save()
                    logger.info(f"Профиль пользователя {user.username} подтвержден")
        except IntegrityError as e:
            logger.error(f"Ошибка целостности при обновлении профиля {user.username}: {str(e)}")
            raise ValueError("Ошибка сохранения профиля")
        except DatabaseError as e:
            logger.error(f"Ошибка БД при обновлении профиля {user.username}: {str(e)}")
            raise ValueError("Ошибка базы данных")
        except Exception as e:
            logger.error(f"Неожиданная ошибка при обновлении профиля {user.username}: {str(e)}")
            raise ValueError("Ошибка при обновлении профиля")                

    @classmethod
    def _log_action(cls, user, group, current_groups, request_user):
        action_type = 'group_assigned' if not current_groups else 'group_changed'
        try:
            # Получаем IP из request если request_user это объект request
            ip_address = getattr(request_user, 'META', {}).get('REMOTE_ADDR', '') if hasattr(request_user, 'META') else ''
            print(request_user)
            ActionHistory.objects.create(
                user=request_user,
                action_type=action_type,
                description=f"Пользователю {user.username} {'назначена' if action_type == 'group_assigned' else 'изменена'} группа {group.name}",
                ip_address=ip_address
            )
            logger.info(f"запись в историю {action_type}={current_groups}")
        except Exception as e:
            logger.error(f"Ошибка при записи в историю: {str(e)}")
        return action_type

    @classmethod
    def _handle_notifications(cls, user, action_type):
        """
        Обрабатывает уведомления при назначении/изменении группы пользователя    
        Args:
            user: Объект пользователя (User)
            action_type: Тип действия ('group_assigned' или 'group_changed')        
        Raises:
            NotificationError: При ошибках работы с уведомлениями
        """
        try:

            if action_type == 'group_assigned':
                Notification.objects.filter(
                    notification_type='registration',
                    recipient__groups__name='admins',
                    message__contains=f"Новый пользователь {user.username}"
                ).update(notification_profile__is_active=False)
        except DatabaseError as e:
            logger.error(
                f"Database error updating notifications for user {user.id}: {str(e)}",
                exc_info=True,
                extra={'user_id': user.id, 'action_type': action_type}
            )
            raise NotificationError(
                "Ошибка базы данных при обновлении уведомлений",
                code='database_error',
                meta={"user_id":user.id})        
        except Exception as e:
            logger.error(
                f"Unexpected error in _handle_notifications: {str(e)}",
                exc_info=True,
                extra={'user_id': user.id}
            )
            raise NotificationError(f"Ошибка при обработке уведомлений: {str(e)}",
                                    code="unknow_error")
        
class UserCreationService:
    @staticmethod
    def validate_group(group_id, request_user):
        """Валидация группы и проверка прав"""
        try:
            group = Group.objects.get(pk=group_id)  # # Получаем группу по ID из БД
        except Group.DoesNotExist:
            raise ValueError("Группа не существует")
        
        if group.name not in ['admins', 'extusers', 'users']:
            raise ValueError("Недопустимая группа")
        
        if group.name == 'admins' and not request_user.is_superuser:
            raise PermissionError("Только superuser может создавать admins")
            
        if not request_user.is_superuser and group.name not in ['extusers', 'users']:
            raise PermissionError("Можно создавать только users/extusers")
            
        return group

    @classmethod
    def create_user(cls, validated_data, request):
        try:
            with transaction.atomic():
                # Валидируем группу
                group = cls.validate_group(validated_data.pop('group_id'), request.user)     

                # Отключаем сигнал перед созданием пользователя
                # from django.db.models.signals import post_save
                # from .models import create_user_profile
                # post_save.disconnect(create_user_profile, sender=User)

                try:
                    user = User.objects.create_user(**validated_data)
                except IntegrityError as e:
                    raise ValueError("Ошибка создания пользователя") from e
                
                user.groups.add(group)
            
                try:
                    # profile = UserProfile.objects.create(
                    #     user=user,
                    #     is_verified=True,
                    #     registration_date=timezone.now(),
                    #     verification_date=timezone.now()
                    user.profile.is_verified = True
                    user.profile.verification_date = timezone.now()
                    user.profile.save()                    
                except Exception as e:
                    raise ValueError("Ошибка изменении профиля") from e
                # finally:
                    # Всегда включаем сигнал обратно
                    # post_save.connect(create_user_profile, sender=User)
                
                return user
            
        except Exception as e:
            logger.error(f"User creation failed: {str(e)}")
            raise  # Повторно поднимаем исключение для обработки в ViewSet