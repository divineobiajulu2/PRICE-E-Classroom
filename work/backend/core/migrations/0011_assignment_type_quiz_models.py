# Generated migration for quiz models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_submission'),
    ]

    operations = [
        migrations.AddField(
            model_name='assignment',
            name='assignment_type',
            field=models.CharField(
                choices=[('STANDARD', 'Standard (File/Text Upload)'), ('QUIZ', 'Interactive Quiz (Form)')],
                default='STANDARD',
                max_length=20
            ),
        ),
        migrations.CreateModel(
            name='QuizQuestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField()),
                ('question_type', models.CharField(
                    choices=[('MULTIPLE_CHOICE', 'Multiple Choice'), ('PARAGRAPH', 'Paragraph'), ('SHORT_ANSWER', 'Short Answer')],
                    default='MULTIPLE_CHOICE',
                    max_length=50
                )),
                ('points', models.IntegerField(default=1)),
                ('order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='core.assignment')),
            ],
            options={
                'ordering': ['order'],
            },
        ),
        migrations.CreateModel(
            name='QuizOption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=255)),
                ('is_correct', models.BooleanField(default=False)),
                ('order', models.PositiveIntegerField(default=0)),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='options', to='core.quizquestion')),
            ],
            options={
                'ordering': ['order'],
            },
        ),
        migrations.CreateModel(
            name='QuizResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text_answer', models.TextField(blank=True, null=True)),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.quizquestion')),
                ('selected_option', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='responses', to='core.quizoption')),
                ('submission', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_responses', to='core.submission')),
            ],
            options={
                'unique_together': {('submission', 'question')},
            },
        ),
    ]
