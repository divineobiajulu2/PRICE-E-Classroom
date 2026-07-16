from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone

from .models import User, StudentProfile, StaffProfile, RegistrationApproval


admin.site.register(User, UserAdmin)
admin.site.register(StudentProfile)
admin.site.register(StaffProfile)


@admin.register(RegistrationApproval)
class RegistrationApprovalAdmin(admin.ModelAdmin):
    list_display = (
    'user',
    'user_is_active',
    'status',
    'reviewed_by',
    'reviewed_at',
    'created_at',
)

    list_filter = ('status',)
    search_fields = ('user__username',)

    actions = ['approve_users', 'reject_users']

    def approve_users(self, request, queryset):
        for approval in queryset:
            approval.status = 'approved'
            approval.reviewed_by = request.user
            approval.reviewed_at = timezone.now()
            approval.save()

            user = approval.user
            user.is_active = True
            user.save()

    approve_users.short_description = "Approve selected users"

    def reject_users(self, request, queryset):
        for approval in queryset:
            approval.status = 'rejected'
            approval.reviewed_by = request.user
            approval.reviewed_at = timezone.now()
            approval.save()

            user = approval.user
            user.is_active = False
            user.save()

    reject_users.short_description = "Reject selected users"

    readonly_fields = ('reviewed_by', 'reviewed_at', 'created_at')

    def user_is_active(self, obj):
        return obj.user.is_active

    user_is_active.short_description = "Is Active"