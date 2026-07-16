from django.contrib.auth.models import AbstractUser
from django.db import models

from django.core.validators import RegexValidator
from django.conf import settings

class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('teacher', 'Teacher'),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='student'
    )

    profile_photo = models.ImageField(
        upload_to='profiles/admin/',
        blank=True,
        null=True
    )

    def __str__(self):
        return self.username


# ---------- Validators ----------

matric_validator = RegexValidator(
    regex=r'^[A-Z]{2}/\d{2}/\d{3}$',
    message='Matric number must be in the format: XX/00/000'
)

ph_code_validator = RegexValidator(
    regex=r'^[A-Z]{3}\d{2}$',
    message='PH code must be in the format: XXX00'
)

# ---------- Choices ----------

GENDER_CHOICES = (
    ('male', 'Male'),
    ('female', 'Female'),
)

STREAM_CHOICES = (
    ("general", "General"),
    ("ict", "ICT"),
    ("mechatronics", "Mechatronics"),
    ("pls", "Physical and Life Sciences"),
)

# ---------- Student Profile ----------

class StudentProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_profile'
    )

    matric_number = models.CharField(
        max_length=10,
        unique=True,
        validators=[matric_validator]
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    gender = models.CharField(
        max_length=6,
        choices=GENDER_CHOICES
    )

    profile_photo = models.ImageField(
        upload_to='profiles/students/',
        blank=True,
        null=True
    )

    date_of_birth = models.DateField()
    country = models.CharField(max_length=100)
    state = models.CharField(max_length=100)

    study_stream = models.CharField(
        max_length=20,
        choices=STREAM_CHOICES
    )

    set_number = models.PositiveIntegerField()
    
    # Year of admission (optional)
    admission_year = models.PositiveIntegerField(null=True, blank=True)

   

    def __str__(self):
        return f"{self.matric_number} - {self.first_name} {self.last_name}"

# ---------- Staff Profile ----------

class StaffProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='staff_profile'
    )

    ph_code = models.CharField(
        max_length=10,
        unique=True,
        validators=[ph_code_validator]
    )

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    gender = models.CharField(
        max_length=6,
        choices=GENDER_CHOICES
    )

    profile_photo = models.ImageField(
        upload_to='profiles/staff/',
        blank=True,
        null=True
    )

    date_of_birth = models.DateField()
    country = models.CharField(max_length=100)


    def __str__(self):
        return f"{self.ph_code} - {self.first_name} {self.last_name}"


# ------------REGISTRATION APPROVAL ----------

class RegistrationApproval(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='registration_approval'
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registrations_reviewed'
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    rejection_reason = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.status}"

 
# ---------- Classroom Feed ----------
class ClassroomMaterial(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file_attachment = models.FileField(upload_to='classroom_materials/', null=True, blank=True)
    study_stream = models.CharField(max_length=20, choices=STREAM_CHOICES, default='general')
    course = models.ForeignKey(
        'Course',
        on_delete=models.PROTECT,
        related_name='classroom_materials',
        null=True,
        blank=True,
    )

    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        limit_choices_to={'role__in': ['teacher', 'instructor']},
        related_name='classroom_materials',
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_classroom_materials'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.study_stream})"


# ---------- Assignments ----------
class Assignment(models.Model):
    ASSIGNMENT_TYPES = (
        ('STANDARD', 'Standard (File/Text Upload)'),
        ('QUIZ', 'Interactive Quiz (Form)'),
    )
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        limit_choices_to={'role__in': ['teacher', 'instructor']}
    )
    course = models.ForeignKey(
        'Course',
        on_delete=models.PROTECT,
        related_name='assignments',
    )

    due_date = models.DateTimeField()
    resource_file = models.FileField(upload_to='assignments/', null=True, blank=True)
    assignment_type = models.CharField(
        max_length=20,
        choices=ASSIGNMENT_TYPES,
        default='STANDARD'
    )
    # Whether the assignment is published (visible to students)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.course.title} [{self.assignment_type}]"


class CourseInstructor(models.Model):
    course = models.ForeignKey(
        'Course',
        on_delete=models.CASCADE,
        related_name='course_instructors'
    )
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role__in': ['teacher', 'instructor']},
        related_name='assigned_courses'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'admin'},
        related_name='assigned_course_instructors'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('course', 'instructor')
        ordering = ['-assigned_at']

    def __str__(self):
        return f"{self.instructor.username} assigned to {self.course.title}"


# ---------- Courses ----------
class Course(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Published', 'Published'),
    )

    LEVEL_CHOICES = (
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    level = models.CharField(max_length=50, choices=LEVEL_CHOICES, default='Beginner')
    thumbnail = models.TextField(blank=True)
    material_attachment = models.FileField(upload_to='course_materials/', null=True, blank=True)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role__in': ['teacher', 'instructor']},
        related_name='courses',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'admin'},
        related_name='created_courses',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    modules = models.JSONField(default=list, blank=True)
    streams = models.JSONField(default=list, blank=True, help_text="List of stream names (e.g. ['ict', 'mechatronics', 'general'])")
    set_number = models.PositiveIntegerField(default=1)
    total_lessons = models.PositiveIntegerField(default=0)
    student_count = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=4, decimal_places=2, default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if isinstance(self.modules, list):
            self.total_lessons = sum(
                len(module.get('lessons', []))
                for module in self.modules
                if isinstance(module, dict)
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.status})"


class Grade(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='grades'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'student'},
        related_name='grades'
    )
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='given_grades'
    )
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='grades'
    )
    title = models.CharField(max_length=255, blank=True)
    score = models.DecimalField(max_digits=5, decimal_places=2)
    feedback = models.TextField(blank=True)
    graded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('course', 'student', 'title')
        ordering = ['-graded_at']

    def __str__(self):
        label = self.title or (self.assignment.title if self.assignment else 'Grade')
        return f"{self.student.username} - {label} ({self.score})"


# ---------- Submissions ----------
class Submission(models.Model):
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role__in': ['student', 'intern']},
        related_name='core_submissions'
    )
    submission_text = models.TextField(blank=True, null=True)
    submission_file = models.FileField(upload_to='submissions/', blank=True, null=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    # Draft support: whether this submission is a draft (not final)
    is_draft = models.BooleanField(default=False)
    # Timestamp for last autosave or draft save
    last_saved_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('assignment', 'intern')

    def __str__(self):
        return f"{self.intern.email} - {self.assignment.title}"


# ---------- Quiz Models ----------
class QuizQuestion(models.Model):
    QUESTION_TYPES = (
        ('MULTIPLE_CHOICE', 'Multiple Choice'),
        ('PARAGRAPH', 'Paragraph'),
        ('SHORT_ANSWER', 'Short Answer'),
    )
    
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name='questions',
        limit_choices_to={'assignment_type': 'QUIZ'}
    )
    text = models.TextField()
    question_type = models.CharField(max_length=50, choices=QUESTION_TYPES, default='MULTIPLE_CHOICE')
    points = models.IntegerField(default=1)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order + 1}: {self.text[:50]}"


class QuizOption(models.Model):
    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name='options'
    )
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.text[:50]}"


class QuizResponse(models.Model):
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name='quiz_responses'
    )
    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE
    )
    selected_option = models.ForeignKey(
        QuizOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responses'
    )
    text_answer = models.TextField(null=True, blank=True)

    class Meta:
        unique_together = ('submission', 'question')

    def __str__(self):
        return f"Response: Q{self.question.order + 1}"


# ---------- Notifications ----------
class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('system', 'System'),
        ('assignment', 'Assignment'),
        ('grading', 'Grading'),
        ('announcement', 'Announcement'),
    )

    # Specific recipient (optional) or role_target for broadcasting to a role
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True
    )

    # Optional role target: 'admin', 'teacher', 'student' - used for broadcast
    role_target = models.CharField(max_length=32, blank=True, null=True)

    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=32, choices=NOTIFICATION_TYPES, default='system')
    is_read = models.BooleanField(default=False)
    payload = models.JSONField(default=dict, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        if self.recipient:
            return f"Notification to {self.recipient.username}: {self.title}"
        return f"Notification to {self.role_target or 'all'}: {self.title}"


# Track per-student lesson completion when lessons are managed inside Course.modules
class StudentLessonProgress(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='lesson_progress'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='lesson_progress'
    )
    lesson_id = models.CharField(max_length=255)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course', 'lesson_id')

    def __str__(self):
        return f"{self.student.username} - {self.course.title} - {self.lesson_id}"

