from django.db import migrations, models
import django.conf.global_settings


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_course_material_attachment_course_set_number'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name='created_courses',
                limit_choices_to={'role': 'admin'},
                to='auth.user',
            ),
        ),
    ]
