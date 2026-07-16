from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_add_published'),
    ]

    operations = [
        migrations.AlterField(
            model_name='submission',
            name='submitted_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='submission',
            name='is_draft',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='submission',
            name='last_saved_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
