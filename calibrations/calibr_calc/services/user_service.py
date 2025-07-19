from django.contrib.auth import get_user_model

User = get_user_model()

def get_usernames(user_ids):
    users = User.objects.filter(id__in=user_ids).values('id', 'username')
    return {u['id']: u['username'] for u in users}