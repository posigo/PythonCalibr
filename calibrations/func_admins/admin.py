from django.contrib import admin                        # Основной модуль админки Django
from django.contrib.auth.admin import UserAdmin         # Стандартный класс для администрирования пользователей
from django.contrib.auth.models import User, Group
from .models import (
    UserProfile, 
    Notification, 
    NotificationProfile, 
    ActionHistory
)                     # Кастомная модель профиля из текущего приложения

# Register your models here.

# Inline для профиля пользователя
# Создаём StackedInline (отображение с вертикальным расположением полей) для модели UserProfile
class UserProfileInline(admin.StackedInline):       
    model = UserProfile
    can_delete = False                  # запрещает удаление профиля через интерфейс
    verbose_name_plural = 'Профиль'     # название в админке
    fk_name = 'user'                    # поле связи с моделью User
    readonly_fields = ('registration_date', 'verification_date')

# Кастомный UserAdmin
# Наследуем стандартный UserAdmin и добавляем
class CustomUserAdmin(UserAdmin):
    inlines = (UserProfileInline, )         # включает наш UserProfileInline в форму редактирования пользователя
    # поля, отображаемые в списке пользователей
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_is_verified', 'get_groups')
    list_select_related = ('profile', )     # оптимизация запросов к БД (загружает профиль сразу)    
    
    # Кастомный метод для отображения статуса подтверждения пользователя
    def get_is_verified(self, instance):
        return instance.profile.is_verified
    get_is_verified.short_description = 'Подтверждён'       # задаёт название колонки в списке
    get_is_verified.boolean = True
    
    # Показывает inline-форму только при редактировании существующего пользователя (не при создании нового
    def get_inline_instances(self, request, obj=None):
        if not obj:
            return list()
        return super().get_inline_instances(request, obj)
    
    def get_groups(self, obj):
        return ", ".join([g.name for g in obj.groups.all()])
    get_groups.short_description = 'Группы'

# Разрегистрируем стандартный UserAdmin и зарегистрируем кастомный
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

# Настроим отображение групп (кастомный GroupAdmin)
class CustomGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'user_count')                   # Отображением только имени группы в списке
    filter_horizontal = ('permissions', )       # Горизонтальным фильтром для выбора разрешений (filter_horizontal)

    def user_count(self, obj):
        return obj.user_set.count()
    user_count.short_description = 'Количество пользователей'

# Разрегистрируем стандартный Group и зарегистрируем кастомный
admin.site.unregister(Group)
admin.site.register(Group, CustomGroupAdmin)

# Итоговый результат:
# В админке появится:
# Расширенное управление пользователями с отображением профиля
# Колонка "Подтверждён" в списке пользователей
# Оптимизированное отображение групп с удобным выбором разрешений
#
# Особенности:
# Профиль пользователя редактируется на той же странице, что и основная информация
# Статус подтверждения виден сразу в списке пользователей
# Удобное управление разрешениями групп через интерфейс с двумя панелями
#
#Безопасность:
# Сохраняются все стандартные проверки и ограничения Django
# Добавляется только визуальное улучшение и удобство работы

class NotificationProfileInline(admin.StackedInline):
    model = NotificationProfile
    extra = 1                       # количество дополнительных пустых форм для добавления новых объектов

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'notification_type', 'short_message', 'sender', 'recipient', 'group_recipient', 'date_created')
    list_filter = ('notification_type', 'date_created')
    search_fields = ('message', 'sender__username', 'recipient__username')
    inlines = (NotificationProfileInline,)
    
    def short_message(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    short_message.short_description = 'Сообщение'

@admin.register(NotificationProfile)
class NotificationProfileAdmin(admin.ModelAdmin):
    list_display = [field.name for field in NotificationProfile._meta.fields]
    # list_filter = ('notification_type', 'date_created')
    # search_fields = ('message', 'sender__username', 'recipient__username')
    # inlines = (NotificationProfileInline,)
    
    # def short_message(self, obj):
    #     return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    # short_message.short_description = 'Сообщение'

@admin.register(ActionHistory)
class ActionHistoryAdmin(admin.ModelAdmin):
    list_display = ('action_type', 'user', 'short_description', 'action_date', 'ip_address')
    list_filter = ('action_type', 'action_date')
    search_fields = ('description', 'user__username')
    readonly_fields = ('action_date',)
    
    def short_description(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    short_description.short_description = 'Описание'
    
    # Запрещает создавать новые записи через админку.
    def has_add_permission(self, request):
        return False
    
    # Разрешает редактирование только для суперпользователей.
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser
    
    # Разрешает удаление только для суперпользователей.
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser                                                                                                                                                                                