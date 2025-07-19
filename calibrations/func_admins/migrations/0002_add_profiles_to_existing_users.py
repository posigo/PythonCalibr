from django.db import migrations

def add_profiles(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('func_admins', 'UserProfile')
    
    for user in User.objects.all():
        # Для существующих пользователей создаем профиль с is_verified=True
        UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'is_verified': True,
            }
        )

class Migration(migrations.Migration):

    dependencies = [
        ('func_admins', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_profiles),
    ]