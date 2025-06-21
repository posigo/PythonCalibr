# User - стандартная модель пользователя Django, содержащая:
# Основные поля: username, password, email, first_name, last_name
# Флаги: is_active, is_staff, is_superuser
# Связи: группы и разрешения
# Group - модель групп пользователей, позволяющая:
# Объединять пользователей по ролям/правам
# Назначать разрешения сразу группе пользователей
# Стандартные методы: добавление/удаление пользователей
from django.contrib.auth.models import User, Group
from django.db import models, transaction
from django.db.models import BooleanField, Case, When, Value
# post_save - сигнал, отправляемый после сохранения модели
# Используется для выполнения действий в ответ на изменения в БД
from django.db.models.signals import post_save
#Декоратор @receiver Позволяет функции "слушать" определенные сигналы 
# Синтаксис: @receiver(сигнал, sender=Модель)
# Автоматически связывает функцию обработчика с сигналом
from django.dispatch import receiver
# Утилиты для работы с датой/временем с учетом временных зон
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class UserProfile(models.Model):
    """
    Профиль пользователя с дополнительными полями
    Связан один-к-одному с моделью User
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='Пользователь'
    )
    is_verified = models.BooleanField(
        default=False,
        verbose_name='Подтверждён'
    )
    registration_date = models.DateTimeField(
        default=timezone.now,
        verbose_name='Дата регистрации'
    )
    verification_date = models.DateTimeField(
        null=True,                              # Когда поле не обязательно для заполнения 
                                                # Разрешает хранить NULL в базе данных для этого поля,  работает на уровне БД
        blank=True,                             # Поле может быть пустым в формах и админке Django, работает на уровне валидации форм
        verbose_name='Дата подтверждения'       
    )
    
    # Можно искать неподтверждённых пользователей:
    # User.objects.filter(profile__verification_date__isnull=True)
    # Сортировка:
    # User.objects.order_by('profile__verification_date')

    class Meta:
        verbose_name = 'Профиль пользователя'
        verbose_name_plural = 'Профили пользователей'
    
    def __str__(self):
        return f'Профиль {self.user.username}'

# Срабатывает после сохранения (post_save) модели User
@receiver(post_save, sender=User)
# sender: Модель User, которая отправила сигнал
# instance: Конкретный объект пользователя, который был сохранён
# created: Флаг (True/False), указывающий, создан ли новый объект
def create_user_profile(sender, instance, created, **kwargs):
    """
    Сигнал для автоматического создания профиля при создании пользователя
    """
    if created and not hasattr(instance, 'profile'):     # Проверяет, был ли пользователь только что создан (created=True)
        try:
            with transaction.atomic():
                UserProfile.objects.create(
                    user=instance,
                    is_verified=False,
                    registration_date = timezone.now()
                )
        except Exception as e:
            logger.error(f"Failed to create profile: {e}")
            instance.delete()
            raise        

class NotificationManager(models.Manager):
    def get_queryset(self):
        # Автоматически обновляем is_new для уведомлений старше 1 часа
        hour_ago = timezone.now() - timezone.timedelta(hours=1)
        return super().get_queryset().annotate(
            is_new_annotated=Case(
                When(date_created__gt=hour_ago, then=Value(True)),
                default=Value(False),
                output_field=BooleanField()
            )
        )

class Notification(models.Model):
    """
    Модель для уведомлений между пользователями
    """
    NOTIFICATION_TYPES = (
        ('system', 'Системное'),
        ('user', 'Пользовательское'),
        ('group', 'Групповое'),
        ('registration', 'Регистрация'),
    )
    
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        default='user',
        verbose_name='Тип уведомления'
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_notifications',
        verbose_name='Отправитель',
        null=True,
        blank=True
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_notifications',
        verbose_name='Получатель',
        null=True,
        blank=True
    )
    group_recipient = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        related_name='group_notifications',
        verbose_name='Группа получателей',
        null=True,
        blank=True
    )
    date_created = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )
    message = models.TextField(
        verbose_name='Текст уведомления'
    )
    
    objects = NotificationManager()

    class Meta:
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведомления'
        ordering = ['-date_created']
    
    def __str__(self):
        return f'Уведомление #{self.id} ({self.notification_type})'

class NotificationProfile(models.Model):
    """
    Модель профиля уведомления для отслеживания состояния
    """
    notification = models.OneToOneField(
        Notification,
        on_delete=models.CASCADE,
        related_name='notification_profile',
        verbose_name='Уведомление'
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name='Прочитано'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Актуально'
    )
    is_new = models.BooleanField(
        default=True,
        verbose_name='Новое'
    )
    
    class Meta:
        verbose_name = 'Профиль уведомления'
        verbose_name_plural = 'Профили уведомлений'
    
    def __str__(self):
        return f'Профиль уведомления #{self.notification.id}'

class ActionHistory(models.Model):
    """
    Модель для хранения истории действий пользователей
    """
    ACTION_TYPES = (
        ('login', 'Вход'),
        ('logout', 'Выход'),
        ('registration', 'Регистрация'),
        ('verification', 'Подтверждение'),
        ('group_change', 'Изменение группы'),
        ('profile_update', 'Обновление профиля'),
        ('notification_sent', 'Отправка уведомления'),
        ('notification_read', 'Прочтение уведомления'),
        ('user_delete', 'Удаление пользователя'),
        ('calculation_create', 'Создание расчета'),
        ('calculation_update', 'Обновление расчета'),
        ('calculation_delete', 'Удаление расчета'),
        ('password_reset', 'Сброс пароля'),
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='actions',
        verbose_name='Пользователь',
        null=True,
        blank=True
    )
    action_type = models.CharField(
        max_length=50,
        choices=ACTION_TYPES,
        verbose_name='Тип действия'
    )
    action_date = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата действия'
    )
    description = models.TextField(
        verbose_name='Описание действия'
    )
    ip_address = models.GenericIPAddressField(
        verbose_name='IP адрес',
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = 'История действия'
        verbose_name_plural = 'История действий'
        ordering = ['-action_date']
    
    def __str__(self):
        return f'{self.get_action_type_display()} - {self.user.username if self.user else "Система"}'

