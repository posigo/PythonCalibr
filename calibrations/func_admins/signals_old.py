from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User, Group
from django.core.mail import send_mail
from django.conf import settings
from .models import UserProfile
from django.utils import timezone


@receiver(post_save, sender=User)
def handle_user_save(sender, instance, created, **kwargs):
    """
    Обработчик сохранения пользователя
    """
    if created:
        # При создании нового пользователя
        profile = UserProfile.objects.get(user=instance)
        
        # Отправка уведомления администраторам
        admins = User.objects.filter(groups__name='admins')
        superusers = User.objects.filter(is_superuser=True)
        recipients = list(admins) + list(superusers)
        
        if recipients:
            send_mail(
                'Новый пользователь зарегистрировался',
                f'Пользователь {instance.username} ожидает подтверждения.',
                settings.DEFAULT_FROM_EMAIL,
                [user.email for user in recipients if user.email],
                fail_silently=True,
            )

