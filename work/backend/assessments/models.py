from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Assessment(models.Model):
    STREAM_CHOICES = [
        ("general", "General"),
        ("ict", "ICT"),
        ("mechatronics", "Mechatronics"),
        ("pls", "Physical and Life Sciences"),
    ]

    SET_CHOICES = [
        ("1", "Set 1"),
        ("2", "Set 2"),
        ("3", "Set 3"),
        ("4", "Set 4"),
        ("5", "Set 5"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()

    course = models.ForeignKey(
        'core.Course',
        on_delete=models.PROTECT,
        related_name='assessments',
    )
    instructor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        limit_choices_to={'role__in': ['teacher', 'instructor']},
        related_name='assessments'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'teacher'}
    )

    # so we do not have to always manually add new set numbers to the set choices list.
    # we simply use the integer field
    target_set = models.IntegerField()

    target_stream = models.CharField(
        max_length=20,
        choices=STREAM_CHOICES
    )

    deadline = models.DateTimeField()

    # Total points for the assessment (default 100)
    max_points = models.IntegerField(default=100)

    # Assessment type (WRITTEN, OBJECTIVE, MCQ, PROJECT)
    assessment_type = models.CharField(max_length=20, default='WRITTEN')

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Submission(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE)

    text_answer = models.TextField(blank=True, null=True)
    file_upload = models.FileField(upload_to='submissions/', null=True, blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(
        max_length=20,
        default="submitted"
    )

    score = models.IntegerField(null=True, blank=True)

    feedback = models.TextField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.student} - {self.assessment}"
        