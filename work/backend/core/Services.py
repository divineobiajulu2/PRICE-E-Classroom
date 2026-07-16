from django.contrib.auth import get_user_model

User = get_user_model()

def create_base_user(username, email, password, role, is_active=False, is_staff=False):
    # Ensure username is globally unique
    if User.objects.filter(username=username).exists():
        return None, "Username already exists"
    
    # EMAIL CHECK (duplicate check)
    if User.objects.filter(email=email).exists():
        return None, "Email already exists"

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        role=role,
        is_active=is_active
    )

    if is_staff:
        user.is_staff = True
        user.save(update_fields=['is_staff'])

    return user, None