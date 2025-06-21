from rest_framework import serializers                                          #  для создания кастомных сериализаторов моделей
from django.contrib.auth.models import User, Group                              # User - стандартная модель пользователя Django
                                                                                # Group - модель групп пользователей для управления правами
from django.contrib.auth import authenticate                                    # для верификации учетных данных пользователя                                                                                
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer      # Стандартный сериализатор для получения JWT-токенов (access + refresh)
from rest_framework_simplejwt.tokens import RefreshToken                        # Класс для работы с refresh-токенами (обновление, валидация)
from .models import (
    UserProfile, 
    Notification,
    NotificationProfile,
    ActionHistory
)

class GroupSerializer(serializers.ModelSerializer):
    """
    Сериализатор для групп пользователей
    """
    class Meta:
        model = Group
        fields = ['id', 'name']

class UserSerializer(serializers.ModelSerializer):
    """
    Сериализатор для модели User
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class UserProfileSerializer(serializers.ModelSerializer):
    """
    Сериализатор для профиля пользователя
    """
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['user', 'is_verified', 'registration_date', 'verification_date']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Кастомный сериализатор для получения JWT токенов
    Добавляем проверку на подтверждение пользователя
    """

    # attrs - словарь с входными данными (обычно username и password)
    def validate(self, attrs):
        # Сначала выполняется стандартная проверка аутентификации
        data = super().validate(attrs)
        
        # Проверяем, подтвержден ли пользователь
        if not self.user.profile.is_verified:
            # self.user - пользователь, прошедший аутентификацию
            raise serializers.ValidationError(                           # 403 Forbidden
                {"detail": "Вас не подтвердили администраторы"}
            )
        
        # Добавляем дополнительные данные в ответ
        refresh = self.get_token(self.user)
        # Добавляем сериализованные данные пользователя в ответ
        data['refresh'] = str(refresh)                      # refresh - токен для обновления
        data['access'] = str(refresh.access_token)          # access - токен для доступа
        data['user'] = UserSerializer(self.user).data
        
        return data

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
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name']
    
    # созданние пользователя
    def create(self, validated_data):                   # validated_data - проверенные данные от пользователя
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        return user
    
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