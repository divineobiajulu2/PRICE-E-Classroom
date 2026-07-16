from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0004_submission_feedback_submission_score_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='assessment',
            name='max_points',
            field=models.IntegerField(default=100),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='assessment',
            name='assessment_type',
            field=models.CharField(default='WRITTEN', max_length=20),
            preserve_default=False,
        ),
    ]
