import re
from django.core.validators import RegexValidator
from django.db.models import Q
from rest_framework import serializers
from .models import Assignment, ClassroomMaterial, Notification, Submission, QuizQuestion, QuizOption, QuizResponse, Course, Grade, StudentLessonProgress


class StudentLessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentLessonProgress
        fields = ['id', 'student', 'course', 'lesson_id', 'completed_at']
        read_only_fields = ['id', 'completed_at']


class StudentRegistrationSerializer(serializers.Serializer):
    matric_number = serializers.CharField(trim_whitespace=True, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    first_name = serializers.CharField(trim_whitespace=True, required=True)
    last_name = serializers.CharField(trim_whitespace=True, required=True)
    gender = serializers.CharField(trim_whitespace=True, required=True)
    date_of_birth = serializers.DateField(required=True)
    country = serializers.CharField(trim_whitespace=True, required=True)
    state = serializers.CharField(trim_whitespace=True, required=True)
    study_stream = serializers.CharField(required=False, allow_blank=False)
    stream = serializers.CharField(required=False, allow_blank=True)
    set_number = serializers.IntegerField(required=False, allow_null=True)
    admission_year = serializers.IntegerField(required=False, allow_null=True)

    def validate_matric_number(self, value):
        normalized = (value or '').strip().upper()
        if not re.fullmatch(r'^[A-Z]{2}/\d{2}/\d{3}$', normalized):
            raise serializers.ValidationError('Matric number must be in the format: XX/00/000')
        return normalized


class NotificationSerializer(serializers.ModelSerializer):
    recipient_username = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'recipient_username', 'role_target', 'title', 'message', 'type', 'is_read', 'payload', 'created_at']

    def get_recipient_username(self, obj):
        return obj.recipient.username if obj.recipient else None


class ClassroomMaterialSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField()
    file_attachment = serializers.FileField(required=False, allow_null=True, write_only=True)
    file_attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = ClassroomMaterial
        fields = ['id', 'title', 'description', 'file_attachment', 'file_attachment_url', 'study_stream', 'course', 'instructor', 'status', 'created_by', 'created_by_username', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_by_username', 'created_at', 'updated_at', 'file_attachment_url', 'instructor', 'status']
        
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

    def get_file_attachment_url(self, obj):
        if not obj.file_attachment:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.file_attachment.url)
        return obj.file_attachment.url


class QuizOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizOption
        fields = ['id', 'text', 'is_correct', 'order']
        read_only_fields = ['id']


class QuizQuestionSerializer(serializers.ModelSerializer):
    options = QuizOptionSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ['id', 'text', 'question_type', 'points', 'order', 'options']
        read_only_fields = ['id']


class QuizResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizResponse
        fields = ['id', 'question', 'selected_option', 'text_answer']
        read_only_fields = ['id']


class CourseSerializer(serializers.ModelSerializer):
    instructor_username = serializers.SerializerMethodField()
    instructors = serializers.SerializerMethodField()
    material_attachment = serializers.FileField(required=False, allow_null=True, write_only=True)
    material_attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'category', 'level', 'thumbnail', 'material_attachment', 'material_attachment_url', 'status', 'streams', 'set_number', 'modules', 'total_lessons', 'student_count', 'rating', 'created_at', 'updated_at', 'instructor', 'instructor_username', 'instructors']
        read_only_fields = ['id', 'total_lessons', 'student_count', 'rating', 'created_at', 'updated_at', 'instructor_username', 'instructor', 'instructors', 'material_attachment_url']

    def get_instructors(self, obj):
        instructors = []
        for assignment in obj.course_instructors.select_related('instructor').all():
            instructor = assignment.instructor
            if not instructor:
                continue
            instructors.append({
                'id': instructor.id,
                'username': instructor.username,
                'first_name': getattr(instructor, 'first_name', ''),
                'last_name': getattr(instructor, 'last_name', ''),
            })
        return instructors

    def get_instructor_username(self, obj):
        instructors = self.get_instructors(obj)
        if instructors:
            return instructors[0]['username']
        return None
    
    def get_material_attachment_url(self, obj):
        if not obj.material_attachment:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.material_attachment.url)
        return obj.material_attachment.url


class CourseDetailSerializer(CourseSerializer):
    content_by_instructor = serializers.SerializerMethodField()

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['content_by_instructor']
        read_only_fields = CourseSerializer.Meta.read_only_fields + ['content_by_instructor']

    def get_content_by_instructor(self, obj):
        from .models import ClassroomMaterial, Assignment

        request = self.context.get('request')
        course_streams = obj.streams or []

        assigned_instructor_ids = list(obj.course_instructors.values_list('instructor_id', flat=True))
        if obj.instructor_id and obj.instructor_id not in assigned_instructor_ids:
            assigned_instructor_ids.append(obj.instructor_id)

        if not assigned_instructor_ids:
            return []

        assignments = Assignment.objects.filter(
            course=obj,
            status='published',
            instructor_id__in=assigned_instructor_ids,
        ).select_related('instructor')
        materials = ClassroomMaterial.objects.filter(
    course=obj
).filter(
    Q(instructor_id__in=assigned_instructor_ids) | Q(created_by_id__in=assigned_instructor_ids)
).select_related('instructor', 'created_by')

        content = {}

        for material in materials:
            instructor = material.instructor or material.created_by
            if not instructor:
                continue
            key = str(instructor.id)
            if key not in content:
                content[key] = {
                    'instructor_id': instructor.id,
                    'instructor_username': instructor.username,
                    'materials': [],
                    'assignments': [],
                }
            content[key]['materials'].append({
                'id': material.id,
                'title': material.title,
                'description': material.description,
                'file_attachment_url': self.context.get('request').build_absolute_uri(material.file_attachment.url) if material.file_attachment and self.context.get('request') else None,
                'study_stream': material.study_stream,
                'created_at': material.created_at,
            })

        for assignment in assignments:
            instructor = assignment.instructor
            if not instructor:
                continue
            key = str(instructor.id)
            if key not in content:
                content[key] = {
                    'instructor_id': instructor.id,
                    'instructor_username': instructor.username,
                    'materials': [],
                    'assignments': [],
                }
            content[key]['assignments'].append({
                'id': assignment.id,
                'title': assignment.title,
                'description': assignment.description,
                'due_date': assignment.due_date,
                'assignment_type': assignment.assignment_type,
                'resource_file_url': self.context.get('request').build_absolute_uri(assignment.resource_file.url) if assignment.resource_file and self.context.get('request') else None,
                'created_at': assignment.created_at,
            })

        return list(content.values())


class GradeSerializer(serializers.ModelSerializer):
    student_username = serializers.SerializerMethodField()
    graded_by_username = serializers.SerializerMethodField()
    assignment_title = serializers.SerializerMethodField()
    assignment_instructor_id = serializers.SerializerMethodField()
    assignment_instructor_username = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = ['id', 'course', 'student', 'student_username', 'graded_by', 'graded_by_username', 'assignment', 'assignment_title', 'assignment_instructor_id', 'assignment_instructor_username', 'title', 'score', 'feedback', 'graded_at']
        read_only_fields = ['id', 'student_username', 'graded_by_username', 'assignment_title', 'assignment_instructor_id', 'assignment_instructor_username', 'graded_at']

    def get_student_username(self, obj):
        return obj.student.username if obj.student else None

    def get_graded_by_username(self, obj):
        return obj.graded_by.username if obj.graded_by else None

    def get_assignment_title(self, obj):
        return obj.assignment.title if obj.assignment else None

    def get_assignment_instructor_id(self, obj):
        return obj.assignment.instructor_id if obj.assignment else None

    def get_assignment_instructor_username(self, obj):
        return obj.assignment.instructor.username if obj.assignment and obj.assignment.instructor else None


class AssignmentSerializer(serializers.ModelSerializer):
    resource_file = serializers.FileField(required=False, allow_null=True, write_only=True)
    resource_file_url = serializers.SerializerMethodField()
    has_submitted = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ['id', 'title', 'description', 'instructor', 'course', 'due_date', 'resource_file', 'resource_file_url', 'created_at', 'has_submitted', 'assignment_type', 'questions', 'status']
        read_only_fields = ['id', 'instructor', 'resource_file_url', 'created_at', 'has_submitted', 'questions', 'status']

    def get_resource_file_url(self, obj):
        if not obj.resource_file:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.resource_file.url)
        return obj.resource_file.url

    def get_has_submitted(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return Submission.objects.filter(assignment=obj, intern=request.user, is_draft=False).exists()

    def get_questions(self, obj):
        """Return quiz questions only if assignment_type is QUIZ"""
        if obj.assignment_type == 'QUIZ':
            questions = obj.questions.all()
            return QuizQuestionSerializer(questions, many=True).data
        return []


class SubmissionSerializer(serializers.ModelSerializer):
    submission_file = serializers.FileField(required=False, allow_null=True, write_only=True)
    submission_file_url = serializers.SerializerMethodField()
    quiz_responses = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = ['id', 'assignment', 'intern', 'submission_text', 'submission_file', 'submission_file_url', 'submitted_at', 'quiz_responses', 'is_draft', 'last_saved_at']
        read_only_fields = ['id', 'intern', 'submission_file_url', 'submitted_at', 'quiz_responses', 'last_saved_at', 'is_draft']

    def get_submission_file_url(self, obj):
        if not obj.submission_file:
            return None
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.submission_file.url)
        return obj.submission_file.url

    def get_quiz_responses(self, obj):
        """Return quiz responses if this is a quiz submission"""
        responses = obj.quiz_responses.all()
        return QuizResponseSerializer(responses, many=True).data if responses else []
