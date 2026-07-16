from rest_framework.permissions import BasePermission

class IsActiveUser(BasePermission):
    message = 'Account is pending approval or inactive.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool(
            request.user.is_active or
            getattr(request.user, 'is_staff', False) or
            getattr(request.user, 'is_superuser', False)
        )

class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not (request.user.is_active or getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_superuser', False)):
            return False

        return getattr(request.user, 'role', None) == 'teacher' or request.user.is_staff

class IsStudentUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not (request.user.is_active or getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_superuser', False)):
            return False

        return getattr(request.user, 'role', None) == 'student'


class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not (request.user.is_active or getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_superuser', False)):
            return False

        return request.user.is_staff or getattr(request.user, 'role', None) == 'admin'



