from django.apps import AppConfig


class FuncAdminsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'func_admins'

    def ready(self):
        # import func_admins.signals
        pass

