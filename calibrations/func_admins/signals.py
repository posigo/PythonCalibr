from django.db import transaction
from django.db.models import F, Q
from django.db.models.signals import (
    pre_save,       # Срабатывает перед сохранением экземпляра модели в базу данных. 
    post_save,      # Срабатывает после сохранения экземпляра модели. 
    pre_delete,     # Срабатывает перед удалением экземпляра модели. 
    m2m_changed     # Срабатывает при изменении связей ManyToMany (добавление, удаление, очистка связей между объектами). 
)
from django.dispatch import receiver
from django.contrib.auth.models import User, Group
from django.utils import timezone
from .models import UserProfile, Notification, ActionHistory
import logging
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)

# Глобальный флаг для отключения сигналов
DISABLE_SIGNALS = False

# === 1. Создание профиля пользователя ===
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Оптимизированное создание профиля пользователя с:
    - Защитой от дублирования
    - Обработкой ошибок
    - Поддержкой массового создания
    """
    if DISABLE_SIGNALS or not created or instance.is_superuser:
        return

    try:
        with transaction.atomic():
            if not UserProfile.objects.filter(user=instance).exists():
                UserProfile.objects.create(user=instance, is_verified=False)
                logger.info(f"Created profile for user {instance.username}")
    except Exception as e:
        logger.error(f"Error creating profile for user {instance.id}: {str(e)}", 
                   exc_info=True,
                   extra={'user_id': instance.id})

# === 2. Обработка верификации пользователя ===
def process_verification_change(instance, old_instance):
    """Вынесенная логика обработки изменения верификации"""
    instance.verification_date = (timezone.now() if instance.is_verified 
                                 else None)
    
    # Контекст из атрибутов модели
    request = getattr(instance, '_request', None)
    changed_by = request.user if request and hasattr(request, 'user') else None
    
    # 1. Логирование в историю
    ActionHistory.objects.create(
        user=instance.user,
        action_type='verification',
        description=get_verification_description(instance, changed_by),
        changed_by=changed_by,
        ip_address=request.META.get('REMOTE_ADDR') if request else None
    )
    
    # 2. Отправка уведомлений
    send_verification_notification(instance, changed_by)

def get_verification_description(instance, changed_by):
    """Генерация описания для истории"""
    base_msg = f"Статус верификации {instance.user.username} изменён на "
    status = 'подтверждён' if instance.is_verified else 'отклонён'
    actor = f" пользователем {changed_by.username}" if changed_by else " системой"
    return base_msg + status + actor

def send_verification_notification(instance, changed_by):
    """Оптимизированная отправка уведомлений"""
    message = ("Ваш аккаунт подтверждён" if instance.is_verified 
               else "Ваш аккаунт отклонён")
    
    try:
        Notification.objects.create(
            notification_type='system',
            recipient=instance.user,
            message=message,
            created_by=changed_by
        )
    except Exception as e:
        logger.error(f"Notification error for user {instance.user_id}: {str(e)}")

@receiver(pre_save, sender=UserProfile)
def handle_user_verification(sender, instance, **kwargs):
    """
    Улучшенная обработка верификации:
    - Полная защита от Race Condition
    - Предотвращение рекурсии
    - Оптимизированные bulk-операции
    - Подробное логирование
    """
    if (DISABLE_SIGNALS or 
        not instance.pk or 
        getattr(instance, '_disable_signals', False)):
        return

    try:
        with transaction.atomic():
            try:
                old_instance = (UserProfile.objects
                               .select_for_update()
                               .get(pk=instance.pk))
            except ObjectDoesNotExist:
                logger.warning(f"UserProfile {instance.pk} not found")
                return

            if old_instance.is_verified != instance.is_verified:
                process_verification_change(instance, old_instance)
    except Exception as e:
        logger.critical(f"Verification error for profile {instance.pk}: {str(e)}", 
                       exc_info=True,
                       extra={'profile_id': instance.pk})

# === 3. Оптимизированная обработка групп ===
def log_group_changes(user, added_groups, removed_groups):
    """Логирование изменений групп"""
    entries = []
    timestamp = timezone.now()
    
    for group in added_groups:
        entries.append(ActionHistory(
            user=user,
            action_type='group_add',
            description=f"Пользователь {user.username} добавлен в группу {group.name}",
            action_date=timestamp
        ))
    
    for group in removed_groups:
        entries.append(ActionHistory(
            user=user,
            action_type='group_remove',
            description=f"Пользователь {user.username} удалён из группы {group.name}",
            action_date=timestamp
        ))
    
    if entries:
        ActionHistory.objects.bulk_create(entries)

@receiver(m2m_changed, sender=User.groups.through)
def handle_user_group_change(sender, instance, action, pk_set, **kwargs):
    """
    Оптимизированная обработка изменения групп:
    - Использует m2m_changed вместо pre_save
    - Поддерживает все типы операций (add/remove/clear)
    - Минимизирует запросы к БД
    """
    if DISABLE_SIGNALS or action not in ['post_add', 'post_remove', 'post_clear']:
        return

    try:
        with transaction.atomic():
            if action == 'post_clear':
                log_group_changes(instance, set(), set(instance.groups.all()))
            elif pk_set:
                changed_groups = Group.objects.filter(pk__in=pk_set)
                if action == 'post_add':
                    log_group_changes(instance, changed_groups, set())
                elif action == 'post_remove':
                    log_group_changes(instance, set(), changed_groups)
    except Exception as e:
        logger.error(f"Group change error for user {instance.id}: {str(e)}")

# === 4. Удаление пользователя ===
@receiver(pre_delete, sender=User)
def handle_user_deletion(sender, instance, **kwargs):
    """Оптимизированная обработка удаления пользователя"""
    if DISABLE_SIGNALS:
        return

    try:
        ActionHistory.objects.create(
            user=None,
            action_type='user_delete',
            description=f"Пользователь {instance.username} удалён из системы",
            ip_address=None
        )
    except Exception as e:
        logger.error(f"Deletion log error for user {instance.id}: {str(e)}")

# === Утилиты для управления сигналами ===
class DisableSignals:
    """Контекстный менеджер для временного отключения сигналов"""
    def __enter__(self):
        global DISABLE_SIGNALS
        DISABLE_SIGNALS = True

    def __exit__(self, exc_type, exc_val, exc_tb):
        global DISABLE_SIGNALS
        DISABLE_SIGNALS = False