import logging
from rest_framework import serializers, validators                              #  для создания кастомных сериализаторов моделей
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import Group, User                              # User - стандартная модель пользователя Django
                                                                                # Group - модель групп пользователей для управления правами
from django.contrib.auth import authenticate                                    # для верификации учетных данных пользователя                                                                                
from django.db import DatabaseError, transaction
from django.db.utils import IntegrityError
from django.utils import timezone
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer      # Стандартный сериализатор для получения JWT-токенов (access + refresh)
from rest_framework_simplejwt.tokens import RefreshToken                        # Класс для работы с refresh-токенами (обновление, валидация)

from .models import (
    UserProfile, 
    Notification,
    NotificationProfile,
    ActionHistory
)

# Жестко закодированные группы. Решение:
#     Вынести в настройки Django (settings.py):
#     python в settings.py
#         ALLOWED_GROUPS = ['admins', 'extusers', 'users']
#     И использовать в коде:
#     python
#         from django.conf import settings
#         if group.name not in settings.ALLOWED_GROUPS:
#             raise serializers.ValidationError("Недопустимая группа")


logger = logging.getLogger(__name__)

class EmptySerializer(serializers.Serializer):
    pass

class GroupSerializer(serializers.ModelSerializer):
    """
    Сериализатор для групп пользователей
    """
    # user_count = serializers.IntegerField(read_only=True)
    user_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'user_count']
    
    def get_user_count(self, obj):
        """
        Вычисляет количество пользователей в группе
        """
        return obj.user_set.count()

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Сериализатор для профиля пользователя
    """
    class Meta:
        model = UserProfile
        fields = ('is_verified', 'registration_date', 'verification_date')
        read_only_fields = ('registration_date', 'verification_date')

class UserSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели User
    """
    groups = GroupSerializer(many=True, read_only=True)
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'groups', 'profile' ]
        read_only_fields = ('id', 'groups', 'profile')

class UserCreateSerializer(serializers.ModelSerializer):
    # Специальное поле для пароля (только запись, скрытый ввод)
    # style={'input_type': 'password'} - указывает фронтенду отображать поле как <input type="password">
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    # Поле для ID группы (обязательное)
    group_id = serializers.IntegerField(required=True, write_only=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'first_name', 'email', 'group_id')
        extra_kwargs = {
            'email': {'required': False, 'allow_blank': True}   # Делаем email необязательным
        }

    # Валидация group_id
    # # def validate_group_id(self, value):
    # #     try:
    # #         with transaction.atomic():
    # #             group = Group.objects.get(pk=value)     # Получаем группу
    # #             if group.name not in ['admins', 'extusers', 'users']:
    # #                 raise serializers.ValidationError("Недопустимая группа")
                
    # #             return value
    # #     except Group.DoesNotExist:      # Если группы нет
    #         raise serializers.ValidationError("Группа не существует")

    def validate(self, attrs):
        if attrs.get('email') and User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Email уже используется"})
        return attrs
        # email = attrs.get('email')
        # if email and User.objects.filter(email=email).exists():
        #     raise serializers.ValidationError({"email": "Этот email уже используется"})
        # return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop('group_id', None)  # Удаляем несуществующее поле
        return data

    # переопределяет стандартное создание объекта. validated_data - уже проверенные данные.
    # def create(self, validated_data):
    #     try:
    #         with transaction.atomic():        
    #             group_id = validated_data.pop('group_id')       # Извлекаем ID группы
    #             try:
    #                 group = Group.objects.get(pk=group_id)          # Получаем группу
    #             except Group.DoesNotExist:
    #                 logger.error(f"Указанная группа ({group_id}) не существует")
    #                 raise serializers.ValidationError(
    #                     {"group_id": "Указанная группа не существует"}
    #                 )
                    
        
    #             request = self.context.get('request')           # Получаем текущий запрос
    #             # Проверка прав для создания админов
    #             if group.name == 'admins' and not request.user.is_superuser:
    #                 raise serializers.ValidationError({"group_id": "Только superuser может создавать пользователей группы admins"})
    #             # Проверка прав для обычных пользователей
    #             if not request.user.is_superuser and group.name not in ['extusers', 'users']:
    #                 raise serializers.ValidationError({"group_id": "Вы можете создавать только пользователей групп extusers или users"})
            
    #             email = validated_data.get('email', '')
    #             # Удаляем email из данных, если он пустой (чтобы не сохранялся как пустая строка).
    #             if email == '':
    #                 validated_data.pop('email', None)

    #             try:
    #                 # метод Django для безопасного создания пользователей (хеширует пароль).
    #                 user = User.objects.create_user(**validated_data)
    #                 user.groups.add(group)
    #             except IntegrityError as e:
    #                 raise serializers.ValidationError(
    #                     {"username": "Пользователь с таким именем уже существует"}
    #             )

    #             try:                    
    #                 UserProfile.objects.update_or_create(
    #                     user=user,
    #                     defaults={
    #                     'is_verified': True,  # Подтверждаем сразу
    #                     'registration_date': timezone.now(),
    #                     'verification_date': timezone.now()  # Устанавливаем дату подтверждения
    #                     }
    #                 )
    #             except Exception as e:
    #                 logger.error(f"Failed to create user profile: {str(e)}")
    #                 raise serializers.ValidationError(
    #                 {"profile": "Ошибка при создании профиля пользователя"}
    #             )

    #             # Запись в историю
    #             ActionHistory.objects.create(
    #                 user=request.user,
    #                 action_type='user_create',
    #                 description=f"Создан пользователь {user.username} с группой {group.name}",
    #                 ip_address=request.META.get('REMOTE_ADDR')
    #             )
        
    #             return user
        
    #     except serializers.ValidationError:
    #         raise  # Пробрасываем ValidationError дальше
    #     except DatabaseError as e:
    #         logger.error(f"Database error during user creation: {str(e)}")
    #         raise serializers.ValidationError(
    #             {"database": "Ошибка базы данных при создании пользователя"}
    #         )
    #     except Exception as e:
    #         logger.error(f"Unexpected error during user creation: {str(e)}")
    #         raise serializers.ValidationError(
    #             {"error": "Произошла непредвиденная ошибка при создании пользователя"}
    #         )
            
class UserUpdateSerializer(serializers.ModelSerializer):
    group_id = serializers.IntegerField(required=False)
    is_verified = serializers.BooleanField(required=False)
    
    class Meta:
        model = User
        fields = ('first_name', 'username', 'password', 'email', 'group_id', 'is_verified')
        extra_kwargs = {
            'username': {'required': False},
            'password': {'required': False},
            'first_name': {'required': False},
            'email': {'required': False}
        }
    
    def validate(self, attrs):
        email = attrs.get('email')
        if email and User.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError({"email": "Этот email уже используется"})
        return attrs

    # Валидация group_id
    def validate_group_id(self, value):
        try:
            group = Group.objects.get(pk=value)
            if group.name not in ['admins', 'extusers', 'users']:
                raise serializers.ValidationError("Недопустимая группа")
            return value
        except Group.DoesNotExist:
            raise serializers.ValidationError("Группа не существует")

    # instance - текущий объект User
    # validated_data - проверенные данные
    # context - содержит request и другую метаинформацию
    def update(self, instance, validated_data):
        with transaction.atomic():
            # Извлекаем специальные поля (group_id, is_verified) для отдельной обработки            
            request = self.context.get('request')
            group_id = validated_data.pop('group_id', None)
            is_verified = validated_data.pop('is_verified', None)

            # обработка is_verified
            # 1 без использования сигналов
            # Обработка изменения is_verified
            if is_verified is not None:
                profile = instance.profile
                old_verified_status = profile.is_verified
            
                if old_verified_status != is_verified:
                    profile.is_verified = is_verified
                    profile.verification_date = timezone.now() if is_verified else None
                    profile.save()
                    # Запись в историю
                    ActionHistory.objects.create(
                        user=request.user,
                        action_type='verification_changed',
                        description=f"Флаг подтверждения пользователя {instance.username} изменён с {old_verified_status} на {is_verified}",
                        ip_address=request.META.get('REMOTE_ADDR')
                    )
                            
            # Проверка прав для изменения группы
            if group_id is not None:
                new_group = Group.objects.get(pk=group_id)
                current_groups = instance.groups.values_list('name', flat=True) # Извлекаем специальные поля (group_id, is_verified) для отдельной обработки
            
                # Проверка прав для изменения на admins
                if new_group.name == 'admins' and not request.user.is_superuser:
                    raise serializers.ValidationError({"group_id": "Только superuser может назначать группу admins"})
            
                # Проверка прав для изменения с admins
                if 'admins' in current_groups and not request.user.is_superuser:
                    raise serializers.ValidationError({"group_id": "Только superuser может изменять группу admins"})
            
                # Проверка прав для обычных пользователей
                if not request.user.is_superuser and new_group.name not in ['extusers', 'users']:
                    raise serializers.ValidationError({"group_id": "Вы можете назначать только группы extusers или users"})
            
                # Изменение группы
                instance.groups.clear()
                instance.groups.add(new_group)
            
                # Запись в историю
                ActionHistory.objects.create(
                    user=request.user,
                    action_type='group_changed',
                    description=f"Пользователю {instance.username} изменена группа на {new_group.name}",
                    ip_address=request.META.get('REMOTE_ADDR')
                )
                    
            # Обновление остальных полей
            changes = []
            for field, value in validated_data.items():
                if getattr(instance, field) != value:
                    changes.append(f"{field} изменён с '{getattr(instance, field)}' на '{value}'")
                    if field == 'password':
                        instance.set_password(value)
                    else:
                        setattr(instance, field, value)
        # instance = super().update(instance, validated_data)
        
            if changes:
                instance.save()                            
                # Запись в историю
                ActionHistory.objects.create(
                    user=request.user,
                    action_type='user_update',
                    description=f"Пользователь {request.user.username} обновил данные пользователя {instance.username}: {', '.join(changes)}",
                    ip_address=request.META.get('REMOTE_ADDR')
                )
        
            return instance

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Кастомный сериализатор для получения JWT токенов
    Добавляет в токен и в ответ API:
    - is_superuser
    - groups (список названий групп пользователя)
    - Добавляем проверку на подтверждение пользователя
    """
    @classmethod
    def get_token(cls, user):
        """
        Добавляем кастомные поля в JWT-токен
        """
        token = super().get_token(user)
        
        # Добавляем информацию о суперпользователе
        token['is_superuser'] = user.is_superuser
        
        # Добавляем список групп пользователя
        token['groups'] = list(user.groups.values_list('name', flat=True))
        
        return token
    
    # attrs - словарь с входными данными (обычно username и password)
    def validate(self, attrs):
        try:
            # Сначала выполняется стандартная проверка аутентификации
            data = super().validate(attrs)
        
            # Проверяем, подтвержден ли пользователь
            if not self.user.profile.is_verified:
                # self.user - пользователь, прошедший аутентификацию
                ActionHistory.objects.create(  # Запись о неудачной попытке
                    user=self.user,
                    action_type='login',
                    description=f"Пользователь {self.user.username} не подтверждён",
                    ip_address=self.context['request'].META.get('REMOTE_ADDR')
                )
                raise serializers.ValidationError(
                    {"unverified": 1,
                    "detail": "Вас не подтвердили администраторы"}  # 403 Forbidden
                )

            # Генерируем токены с кастомными данными
            refresh = self.get_token(self.user)

            # Формируем ответ
            data.update({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    **UserSerializer(self.user).data,
                    'is_superuser': self.user.is_superuser,  # Дублируем в user
                    # 'groups': list(self.user.groups.values_list('name', flat=True))  # Дублируем в user
                }
            })

            # # Добавляем сериализованные данные пользователя в ответ
            # data['refresh'] = str(refresh)                      # refresh - токен для обновления
            # data['access'] = str(refresh.access_token)          # access - токен для доступа
            # data['user'] = UserSerializer(self.user).data
        
            # Записываем в историю действий
            ActionHistory.objects.create(
                user=self.user,
                action_type='login',
                description=f"Пользователь {self.user.username} вошёл в систему",
                ip_address=self.context['request'].META.get('REMOTE_ADDR')
            )

            return data
        except AuthenticationFailed as e:
            # Запись о неудачной аутентификации (неверный логин/пароль)
            ActionHistory.objects.create(
                user=None,  # Пользователь неизвестен
                action_type='login',
                description=f"Неудачная попытка входа с IP: {self.context['request'].META.get('REMOTE_ADDR')}",
                ip_address=self.context['request'].META.get('REMOTE_ADDR')
            )
            raise e        

class NotificationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationProfile
        fields = ('is_read', 'is_active', 'is_new')
        read_only_fields = ('is_new',)

class NotificationSerializer(serializers.ModelSerializer):
    notification_profile = NotificationProfileSerializer(read_only=True)    

    class Meta:
        model = Notification
        fields = ('id', 'notification_type', 'sender', 'recipient', 'group_recipient', 
                  'date_created', 'message', 'notification_profile')
        read_only_fields = ('id', 'date_created', 'sender')    

class NotificationDetailSerializer(NotificationSerializer):
    """
    Сериализатор для детального просмотра уведомления
    с автоматическим обновлением статуса при запросе
    """
    def to_representation(self, instance):
        # Обновляем статус при запросе
        request = self.context.get('request')
        if request and request.method == 'GET' and hasattr(instance, 'notification_profile'):
            profile = instance.notification_profile
            if not profile.is_read:
                profile.is_read = True
                profile.is_active = False
                profile.is_new = False
                profile.save()
        
        return super().to_representation(instance)

class ActionHistorySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = ActionHistory
        fields = ('id', 'user', 'action_type', 'action_date', 'description', 'ip_address')
        read_only_fields = fields

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

class PasswordResetConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, style={'input_type': 'password'})
    token = serializers.CharField(required=True)
    uid = serializers.CharField(required=True)

class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации пользователя
    """
    # Специальная настройка поля пароля:
    # Только для записи
    # Обязательное поле
    # Скрывается при вводе
    password = serializers.CharField(
        write_only=True,
        required=True,
        # min_length=8,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ['username', 'password', 'password_confirm', 'first_name', 'email']
        extra_kwargs = {
            'first_name': {'required': True},
            'username': {
                'required': True,
                'validators': [validators.UniqueValidator(queryset=User.objects.all())]
            },
            'password': {'required': True},
            'password_confirm': {'required': True},
            'email': {
                'required': False,  # Делаем email необязательным
                'allow_blank': True  # Разрешаем пустую строку
            }
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password": "Пароли не совпадают."}
            )
        # Дополнительная валидация пароля
        if len(attrs['password']) < 8:
            raise serializers.ValidationError(
                {"password": "Пароль должен содержать минимум 8 символов."}
            )
        # Валидация email, если он указан
        email = attrs.get('email')
        if email:  # Проверяем только если email не пустой
            if User.objects.filter(email=email).exists():
                raise serializers.ValidationError(
                    {"email": "Пользователь с таким email уже существует."}
                )
        return attrs
    
    # Валидация username
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Пользователь с таким именем уже существует.")
        return value

    # созданние пользователя
    def create(self, validated_data):  
        try:                             # validated_data - проверенные данные от пользователя
            # Удаляем password_confirm из словаря
            validated_data.pop('password_confirm')        
            # Удаляем email из данных, если он пустой
            email = validated_data.get('email')
            if email == '':
                validated_data.pop('email', None)         
            print(f"be fo add")
            user = User.objects.create_user(
                username=validated_data['username'],
                password=validated_data['password'],
                email=validated_data.get('email', ''),
                first_name=validated_data.get('first_name', ''),
                # last_name=validated_data.get('last_name', ''),
                # is_active=False                                         # Пользователь не активен до подтверждения
            )
            print(f"after add")
            return user
        except IntegrityError:
            raise serializers.ValidationError(
                {"username": "Пользователь с таким именем уже существует."}
            )
    
class UserWithGroupsSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'groups', 'is_verified']
    
    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]
    
    def get_is_verified(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.is_verified
        return False
    
class VerifiedUserSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    # is_superuser = serializers.BooleanField(source='is_superuser', read_only=True)
    
    class Meta:
        model = User
        # fields = ['id', 'username', 'groups', 'is_superuser']
        fields = ['id', 'username', 'groups']
    
    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]    
    





#     Капча (reCAPTCHA):

# python
# # Добавить в сериализатор
# captcha = serializers.CharField(write_only=True, required=True)

# def validate_captcha(self, value):
#     # Проверка капчи через Google reCAPTCHA API
#     response = requests.post(
#         'https://www.google.com/recaptcha/api/siteverify',
#         data={
#             'secret': settings.RECAPTCHA_SECRET_KEY,
#             'response': value
#         }
#     )
#     result = response.json()
#     if not result.get('success'):
#         raise serializers.ValidationError("Неверная капча.")
#     return value