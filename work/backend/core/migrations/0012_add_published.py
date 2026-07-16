from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_assignment_type_quiz_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='assignment',
            name='published',
            field=models.BooleanField(default=True),
        ),
    ]
