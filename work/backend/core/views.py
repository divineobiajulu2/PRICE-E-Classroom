# Removed temporary pyright suppression
import re
from django.shortcuts import render
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .Services import create_base_user
from .models import StaffProfile
from django.contrib.auth import authenticate
import json
from django.db import transaction
from django.utils import timezone
from .models import StudentProfile, Notification, ClassroomMaterial, Assignment, Submission, QuizResponse, QuizQuestion, QuizOption, CourseInstructor, Course, Grade, StudentLessonProgress, LiveSession
from .serializers import NotificationSerializer, ClassroomMaterialSerializer, AssignmentSerializer, SubmissionSerializer, StudentRegistrationSerializer, CourseSerializer, CourseDetailSerializer, GradeSerializer, StudentLessonProgressSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .permissions import IsStaffUser, IsAdminUser, IsActiveUser
from django.views.decorators.http import require_http_methods
from django.db.models import Count, Q, Avg

User = get_user_model()


def derive_set_number_from_matric(matric_number: str) -> int:
    if not matric_number:
        return 1

    value = str(matric_number).strip().upper()
    parts = [part for part in value.split('/') if part]

    if len(parts) >= 2:
        try:
            return int(parts[1])
        except ValueError:
            pass

    digits = [g for g in re.findall(r"\d+", value) if g]
    if not digits:
        return 1

    if len(digits) > 1:
        return int(digits[1]) if len(digits) > 1 else int(digits[0])
    return int(digits[0])


@csrf_exempt
def register_student(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request'}, status=400)

    try:
        # Support both JSON payloads and multipart form (for file uploads)
        if request.content_type and request.content_type.startswith('multipart'):
            data = request.POST
            files = request.FILES
        else:
            data = json.loads(request.body)
            files = {}

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    serializer = StudentRegistrationSerializer(data=data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    normalized_data = serializer.validated_data

    # Ensure a study stream was provided under either 'study_stream' or 'stream'
    if not (normalized_data.get('study_stream') or normalized_data.get('stream')):
        return JsonResponse({
            "error": "study_stream is required",
            "field": "study_stream"
        }, status=400)

    # Sanitize and derive a set number from matric number if not provided
    set_number_val = None
    try:
        set_number_val = int(normalized_data.get('set_number') or 0)
    except (TypeError, ValueError):
        set_number_val = 0

    if set_number_val <= 0:
        set_number_val = derive_set_number_from_matric(normalized_data.get('matric_number'))

    if set_number_val <= 0:
        set_number_val = 1

    # Create user
    user, error = create_base_user(
        username=normalized_data["matric_number"],
        email=normalized_data["email"],
        password=normalized_data["password"],
        role="student"
    )

    if error:
        return JsonResponse({
            "error": error,
            "field": "matric_number"
        }, status=400)


    # Preserve the exact stream value provided by the frontend when present.
    raw_stream = (normalized_data.get("study_stream") or normalized_data.get('stream') or '').strip().lower()
    valid_streams = {'mechatronics', 'ict', 'pls'}
    if raw_stream not in valid_streams:
        return JsonResponse({
            'error': 'Invalid study_stream. Allowed values are: Mechatronics, I.C.T, Physical & Life Sciences.',
            'field': 'study_stream'
        }, status=400)
    stream_val = raw_stream

    # Create profile and attach uploaded photo if provided
    profile = StudentProfile.objects.create(
        user=user,
        matric_number=normalized_data["matric_number"],
        first_name=normalized_data["first_name"],
        last_name=normalized_data["last_name"],
        gender=(normalized_data.get("gender") or '').lower(),
        date_of_birth=normalized_data["date_of_birth"],
        country=normalized_data["country"],
        state=normalized_data["state"],
        study_stream=stream_val,
        set_number=set_number_val,
        admission_year=int(normalized_data.get("admission_year")) if normalized_data.get("admission_year") else None
    )

    # Save profile photo if one was uploaded via multipart/form-data
    if files and files.get('profile_photo'):
        photo = files.get('profile_photo')
        try:
            profile.profile_photo.save(photo.name, photo, save=True)
        except Exception:
            # ignore file save errors but log
            print('Failed to save profile photo for', user.username)

    # Notify admins of new pending registration
    try:
        Notification.objects.create(
            role_target='admin',
            title='New user awaiting approval',
            message=f"{profile.first_name} {profile.last_name} ({user.username}) registered and is awaiting approval.",
            type='system'
        )
    except Exception:
        # Do not block registration on notification failure
        print('Failed to create admin notification for new registration')

    return JsonResponse({'message': 'Registration successful. Awaiting approval.'})


@csrf_exempt
def register_staff(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    required_fields = [
        "ph_code", "email", "password",
        "first_name", "last_name",
        "gender", "date_of_birth", "country"
    ]

    for field in required_fields:
        if field not in data or not data[field]:
            return JsonResponse({
                "error": f"{field} is required",
                "field": field
            }, status=400)

    # Ensure PH code is unique in profile
    if StaffProfile.objects.filter(ph_code=data["ph_code"]).exists():
        return JsonResponse({
            "error": "PH code already exists",
            "field": "ph_code"
        }, status=400)

    #User name check

    from django.contrib.auth import get_user_model
    User = get_user_model()
    if User.objects.filter(username=data["ph_code"]).exists():
        return JsonResponse({
            "error": "An account with this PH code already exists. Please contact admin if you believe this is an error.",
            "field": "ph_code"
        }, status=400)

    # Create user
    user, error = create_base_user(
        username=data["ph_code"],
        email=data["email"],
        password=data["password"],
        role="teacher"
    )

    if error:
        return JsonResponse({
            "error": error,
            "field": "ph_code"
        }, status=400)

    # Create profile
    staff_profile = StaffProfile.objects.create(
        user=user,
        ph_code=data["ph_code"],
        first_name=data["first_name"],
        last_name=data["last_name"],
        gender=data["gender"],
        date_of_birth=data["date_of_birth"],
        country=data["country"]
    )

    # Notify admins of new staff pending registration
    try:
        Notification.objects.create(
            role_target='admin',
            title='New staff awaiting approval',
            message=f"{staff_profile.first_name} {staff_profile.last_name} ({user.username}) registered and is awaiting approval.",
            type='system'
        )
    except Exception:
        print('Failed to create admin notification for new staff registration')

    return JsonResponse({
        "message": "Staff registration successful. Awaiting approval."
    }, status=201)



@csrf_exempt
def login_user(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    # Accept a single identifier which may be email, ph_code (staff), matric_number (student), or username
    identifier = data.get("identifier") or data.get("username") or data.get("matric_number") or data.get("ph_code") or data.get("email")

    if not identifier or not data.get("password"):
        return JsonResponse({
            "error": "Identifier and password required"
        }, status=400)

    password = data["password"]

    # Resolve user by identifier with fallback order:
    # 1) if identifier contains '@' -> email
    # 2) staff profile ph_code
    # 3) student profile matric_number
    # 4) username
    user_obj = None
    try:
        if isinstance(identifier, str) and "@" in identifier:
            user_obj = User.objects.filter(email=identifier).first()
        else:
            # try staff profile
            try:
                staff = StaffProfile.objects.get(ph_code=identifier)
                user_obj = staff.user
            except StaffProfile.DoesNotExist:
                # try student profile
                try:
                    student = StudentProfile.objects.get(matric_number=identifier)
                    user_obj = student.user
                except StudentProfile.DoesNotExist:
                    # fallback to username
                    user_obj = User.objects.filter(username=identifier).first()
    except Exception:
        user_obj = None

    if not user_obj:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    # Verify password
    if not user_obj.check_password(password):
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    # Check approval status
    # Check approval status — allow staff & superusers to bypass approval
    if not user_obj.is_active and not (getattr(user_obj, 'is_superuser', False) or getattr(user_obj, 'is_staff', False)):
        return JsonResponse({"error": "Account not approved yet"}, status=403)

    # Authenticate via Django to maintain any middleware flow
    user = authenticate(username=user_obj.username, password=password)
    if not user:
        user = user_obj

    refresh = RefreshToken.for_user(user)

    first_name = ""
    last_name = ""
    set_number = None
    study_stream = None
    ph_code = None
    matric_number = None
    profile_photo_url = None

    if hasattr(user, "student_profile"):
        first_name = user.student_profile.first_name
        last_name = user.student_profile.last_name
        set_number = user.student_profile.set_number
        study_stream = user.student_profile.study_stream
        matric_number = user.student_profile.matric_number
        profile_photo_url = request.build_absolute_uri(user.student_profile.profile_photo.url) if user.student_profile.profile_photo else None

    if hasattr(user, "staff_profile"):
        first_name = user.staff_profile.first_name
        last_name = user.staff_profile.last_name
        ph_code = user.staff_profile.ph_code
        profile_photo_url = request.build_absolute_uri(user.staff_profile.profile_photo.url) if user.staff_profile.profile_photo else None

    if not hasattr(user, "student_profile") and not hasattr(user, "staff_profile"):
        first_name = first_name or user.first_name
        last_name = last_name or user.last_name
        profile_photo_url = request.build_absolute_uri(user.profile_photo.url) if getattr(user, 'profile_photo', None) else None

    return JsonResponse({
        "message": "Login successful",
        "tokens": {
            "refresh": str(refresh),
            "access": str(refresh.access_token)
        },
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": "admin" if user.is_staff else user.role,
            "first_name": first_name,
            "last_name": last_name,
            "set_number": set_number,
            "study_stream": study_stream,
            "matric_number": matric_number,
            "ph_code": ph_code,
            "profile_photo_url": profile_photo_url,
            "is_active": bool(user.is_active),
            "status": 'Active' if user.is_active else 'Pending',
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def protected_test(request):
    return Response({
        "message": "You are authenticated",
        "user": request.user.username
    })

@api_view(['GET'])
@permission_classes([IsStaffUser])
def staff_only_view(request):
    return Response({
        "message": "Welcome staff",
        "user": request.user.username
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def me(request):
    user = request.user
    first_name = ''
    last_name = ''
    matric_number = None
    ph_code = None
    set_number = None
    study_stream = None
    admission_year = None
    profile_photo_url = None

    if hasattr(user, 'student_profile'):
        first_name = user.student_profile.first_name
        last_name = user.student_profile.last_name
        matric_number = user.student_profile.matric_number
        set_number = user.student_profile.set_number
        study_stream = user.student_profile.study_stream
        profile_photo_url = request.build_absolute_uri(user.student_profile.profile_photo.url) if user.student_profile.profile_photo else None
        admission_year = getattr(user.student_profile, 'admission_year', None)

    if hasattr(user, 'staff_profile'):
        first_name = user.staff_profile.first_name
        last_name = user.staff_profile.last_name
        ph_code = user.staff_profile.ph_code
        profile_photo_url = request.build_absolute_uri(user.staff_profile.profile_photo.url) if user.staff_profile.profile_photo else None

    if not hasattr(user, 'student_profile') and not hasattr(user, 'staff_profile'):
        first_name = first_name or user.first_name
        last_name = last_name or user.last_name
        profile_photo_url = request.build_absolute_uri(user.profile_photo.url) if getattr(user, 'profile_photo', None) else None

    return Response({
        'id': str(user.id),
        'username': user.username,
        'email': user.email,
        'role': 'admin' if user.is_staff else user.role,
        'first_name': first_name,
        'last_name': last_name,
        'matric_number': matric_number,
        'ph_code': ph_code,
        'set_number': set_number,
        'study_stream': study_stream,
        'admission_year': admission_year,
        'profile_photo_url': profile_photo_url,
    })

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsActiveUser])
def classroom_materials(request):
    if request.method == 'GET':
        if request.user.is_staff or getattr(request.user, 'is_superuser', False) or getattr(request.user, 'role', None) == 'teacher':
            qs = ClassroomMaterial.objects.all()
        else:
            stream = None
            if hasattr(request.user, 'student_profile'):
                stream = request.user.student_profile.study_stream
            qs = ClassroomMaterial.objects.filter(study_stream__in=[stream, 'general']) if stream else ClassroomMaterial.objects.none()
        serializer = ClassroomMaterialSerializer(qs, many=True)
        return Response(serializer.data)

    if not (request.user.is_staff or getattr(request.user, 'is_superuser', False) or getattr(request.user, 'role', None) == 'teacher'):
        return Response({'error': 'Only instructors can post classroom materials.'}, status=403)

    serializer = ClassroomMaterialSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    material = serializer.save(created_by=request.user, instructor=request.user)

    stream = material.study_stream or 'general'
    recipient_users = User.objects.filter(is_active=True, role='student').select_related('student_profile')
    for recipient in recipient_users:
        profile = getattr(recipient, 'student_profile', None)
        if profile is None:
            continue
        if profile.study_stream == stream or stream == 'general':
            Notification.objects.create(
                recipient=recipient,
                title='New classroom material posted',
                message=f"A new classroom material was posted for {stream}: {material.title}",
                type='announcement',
                payload={'material_id': material.id, 'study_stream': stream},
            )

    return Response(ClassroomMaterialSerializer(material).data, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsActiveUser])
def classroom_material_detail(request, material_id):
    material = ClassroomMaterial.objects.filter(id=material_id).first()
    if not material:
        return Response({'error': 'Material not found.'}, status=404)

    is_admin = request.user.is_staff or getattr(request.user, 'is_superuser', False)
    is_owner = material.instructor_id == request.user.id or material.created_by_id == request.user.id
    if not (is_admin or is_owner):
        return Response({'error': 'You can only delete materials you posted.'}, status=403)

    material.delete()
    return Response({'message': 'Material deleted.'})


def user_is_instructor_or_admin(user):
    return bool(
        user and user.is_authenticated and (
            getattr(user, 'is_staff', False) or
            getattr(user, 'is_superuser', False) or
            getattr(user, 'role', None) == 'teacher'
        )
    )


def parse_streams_value(raw_streams):
    if raw_streams is None:
        return []
    if isinstance(raw_streams, list):
        return raw_streams
    if isinstance(raw_streams, str):
        try:
            parsed = json.loads(raw_streams)
            if isinstance(parsed, list):
                return parsed
            return [parsed]
        except json.JSONDecodeError:
            return [raw_streams]
    return []


def parse_instructor_ids(raw_ids):
    if raw_ids is None:
        return []
    if isinstance(raw_ids, list):
        return [int(i) for i in raw_ids if i is not None and str(i).strip().isdigit()]
    if isinstance(raw_ids, str):
        try:
            parsed = json.loads(raw_ids)
            if isinstance(parsed, list):
                return [int(i) for i in parsed if i is not None and str(i).strip().isdigit()]
        except json.JSONDecodeError:
            pass
        return [int(part) for part in raw_ids.split(',') if part.strip().isdigit()]
    if isinstance(raw_ids, int):
        return [raw_ids]
    return []


def get_course_instructor_ids(course):
    return list(course.course_instructors.values_list('instructor_id', flat=True))


def user_is_course_instructor(user, course):
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return True
    if getattr(user, 'role', None) != 'teacher':
        return False
    return CourseInstructor.objects.filter(course=course, instructor=user).exists()


def assign_course_instructors(course, instructor_ids, assigned_by=None):
    if instructor_ids is None:
        return
    instructor_ids = [int(i) for i in instructor_ids if i is not None]
    valid_instructors = User.objects.filter(id__in=instructor_ids, role='teacher', is_active=True)
    valid_ids = set(valid_instructors.values_list('id', flat=True))

    current_assignments = CourseInstructor.objects.filter(course=course)
    current_ids = set(current_assignments.values_list('instructor_id', flat=True))

    to_remove = current_ids - valid_ids
    to_add = valid_ids - current_ids

    if to_remove:
        CourseInstructor.objects.filter(course=course, instructor_id__in=to_remove).delete()

    for instructor in valid_instructors.filter(id__in=to_add):
        CourseInstructor.objects.create(
            course=course,
            instructor=instructor,
            assigned_by=assigned_by if assigned_by and getattr(assigned_by, 'is_staff', False) else None
        )



@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsActiveUser])
def course_instructors(request, course_id):
    course = Course.objects.filter(id=course_id).first()
    if not course:
        return Response({'error': 'Course not found.'}, status=404)

    if request.method == 'GET':
        if getattr(request.user, 'role', None) == 'student':
            if course.status != 'Published':
                return Response({'error': 'You are not allowed to view this course instructors.'}, status=403)
        elif not (request.user.is_staff or getattr(request.user, 'is_superuser', False) or user_is_course_instructor(request.user, course)):
            return Response({'error': 'You are not allowed to view this course instructors.'}, status=403)

        instructor_entries = course.course_instructors.select_related('instructor').all()
        instructors = [
            {
                'id': entry.instructor.id,
                'username': entry.instructor.username,
                'first_name': getattr(entry.instructor, 'first_name', ''),
                'last_name': getattr(entry.instructor, 'last_name', ''),
                'assigned_by': entry.assigned_by.username if entry.assigned_by else None,
                'assigned_at': entry.assigned_at,
            }
            for entry in instructor_entries
            if entry.instructor
        ]

        return Response({'instructors': instructors})

    if request.method == 'POST':
        if not (request.user.is_staff or getattr(request.user, 'is_superuser', False)):
            return Response({'error': 'Only admins can modify course instructors.'}, status=403)

        instructor_ids = parse_instructor_ids(request.data.get('instructor_ids') or request.data.get('instructor_id'))
        assign_course_instructors(course, instructor_ids, assigned_by=request.user)
        instructor_entries = course.course_instructors.select_related('instructor').all()
        instructors = [
            {
                'id': entry.instructor.id,
                'username': entry.instructor.username,
                'first_name': getattr(entry.instructor, 'first_name', ''),
                'last_name': getattr(entry.instructor, 'last_name', ''),
                'assigned_by': entry.assigned_by.username if entry.assigned_by else None,
                'assigned_at': entry.assigned_at,
            }
            for entry in instructor_entries
            if entry.instructor
        ]
        return Response({'instructors': instructors})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsActiveUser])
def course_instructor_detail(request, course_id, instructor_id):
    course = Course.objects.filter(id=course_id).first()
    if not course:
        return Response({'error': 'Course not found.'}, status=404)

    if not (request.user.is_staff or getattr(request.user, 'is_superuser', False)):
        return Response({'error': 'Only admins can unassign instructors.'}, status=403)

    assignment = CourseInstructor.objects.filter(course=course, instructor_id=instructor_id).first()
    if not assignment:
        return Response({'error': 'Instructor assignment not found.'}, status=404)

    assignment.delete()

    return Response({'message': 'Instructor unassigned.'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsActiveUser])
def courses(request):
    if request.method == 'GET':
        if request.user.is_staff or getattr(request.user, 'is_superuser', False):
            qs = Course.objects.all()
        elif getattr(request.user, 'role', None) == 'teacher':
            # Teachers may see all published courses and their own drafts/assigned courses.
            assigned_courses = CourseInstructor.objects.filter(instructor=request.user)
            qs = Course.objects.filter(
                Q(status='Published') | Q(instructor=request.user) | Q(course_instructors__in=assigned_courses)
            ).distinct()
        else:
            qs = Course.objects.filter(status='Published')
        serializer = CourseSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    instructor_ids = []
    if getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_superuser', False):
        instructor_ids = parse_instructor_ids(request.data.get('instructor_ids') or request.data.get('instructor_id'))
    elif getattr(request.user, 'role', None) == 'teacher':
        instructor_ids = [request.user.id]
    else:
        return Response({'error': 'Only instructors or admins can create courses.'}, status=403)

    title = request.data.get('title')
    if not title:
        return Response({'error': 'title is required.'}, status=400)

    streams = parse_streams_value(request.data.get('streams') or request.data.get('stream'))
    if not streams and request.data.get('stream'):
        streams = [request.data.get('stream')]

    set_number = request.data.get('set_number')
    try:
        set_number = int(set_number) if set_number is not None else 1
    except (TypeError, ValueError):
        set_number = 1

    material_attachment = request.FILES.get('material_attachment')

    course = Course.objects.create(
        title=title,
        description=request.data.get('description', ''),
        category=request.data.get('category', ''),
        level=request.data.get('level', 'Beginner'),
        thumbnail=request.data.get('thumbnail', ''),
        material_attachment=material_attachment,
        instructor_id=instructor_ids[0] if instructor_ids else None,
        status=request.data.get('status', 'Draft'),
        modules=request.data.get('modules', []),
        streams=streams,
        set_number=set_number,
        student_count=request.data.get('student_count', 0),
        rating=request.data.get('rating', 0.0),
    )

    if instructor_ids:
        assign_course_instructors(course, instructor_ids, assigned_by=request.user if (request.user.is_staff or getattr(request.user, 'is_superuser', False)) else None)
    elif not (request.user.is_staff or getattr(request.user, 'is_superuser', False)) and getattr(request.user, 'role', None) == 'teacher':
        assign_course_instructors(course, [request.user.id])

    return Response(CourseSerializer(course, context={'request': request}).data, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, IsActiveUser])
def course_detail(request, course_id):
    course = Course.objects.filter(id=course_id).first()
    if not course:
        return Response({'error': 'Course not found.'}, status=404)

    if request.method == 'GET':
        is_admin = request.user.is_staff or getattr(request.user, 'is_superuser', False)
        if not is_admin:
            if getattr(request.user, 'role', None) == 'student' and course.status != 'Published':
                return Response({'error': 'You are not allowed to view this course.'}, status=403)
            if getattr(request.user, 'role', None) == 'teacher':
                if course.status != 'Published' and not user_is_course_instructor(request.user, course):
                    return Response({'error': 'You are not allowed to view this course.'}, status=403)
        serializer = CourseDetailSerializer(course, context={'request': request})
        return Response(serializer.data)

    if request.method == 'DELETE':
        if not (request.user.is_staff or getattr(request.user, 'is_superuser', False)):
            return Response({'error': 'Only admins can delete courses.'}, status=403)
        from django.db.models import ProtectedError
        try:
            course.delete()
        except ProtectedError:
            return Response({'error': 'This course cannot be deleted because it still has materials, assignments, or grades attached. Remove that content first, or contact support.'}, status=409)
        return Response({'message': 'Course deleted.'})

    if not user_is_instructor_or_admin(request.user):
        return Response({'error': 'Only instructors or admins can update courses.'}, status=403)
    is_admin = request.user.is_staff or getattr(request.user, 'is_superuser', False)
    if not is_admin and getattr(request.user, 'role', None) == 'teacher' and not user_is_course_instructor(request.user, course):
        return Response({'error': 'You are not allowed to update this course.'}, status=403)

    course.title = request.data.get('title', course.title)
    course.description = request.data.get('description', course.description)
    course.category = request.data.get('category', course.category)
    course.level = request.data.get('level', course.level)
    course.thumbnail = request.data.get('thumbnail', course.thumbnail)
    if request.FILES.get('material_attachment'):
        course.material_attachment = request.FILES.get('material_attachment')
    course.status = request.data.get('status', course.status)
    course.modules = request.data.get('modules', course.modules)

    streams = parse_streams_value(request.data.get('streams') or request.data.get('stream'))
    if streams:
        course.streams = streams

    set_number = request.data.get('set_number')
    if set_number is not None:
        try:
            course.set_number = int(set_number)
        except (TypeError, ValueError):
            pass

    course.student_count = request.data.get('student_count', course.student_count)
    course.rating = request.data.get('rating', course.rating)

    if (request.user.is_staff or getattr(request.user, 'is_superuser', False)):
        instructor_ids = parse_instructor_ids(request.data.get('instructor_ids') or request.data.get('instructor_id'))
        if instructor_ids:
            assign_course_instructors(course, instructor_ids, assigned_by=request.user)

    course.save()
    return Response(CourseSerializer(course, context={'request': request}).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsActiveUser])
def course_grades(request, course_id):
    course = Course.objects.filter(id=course_id).first()
    if not course:
        return Response({'error': 'Course not found.'}, status=404)

    if request.method == 'GET':
        if getattr(request.user, 'role', None) == 'student':
            grades = Grade.objects.filter(course=course, student=request.user)
        elif user_is_instructor_or_admin(request.user):
            if getattr(request.user, 'role', None) == 'teacher' and not user_is_course_instructor(request.user, course):
                return Response({'error': 'You are not allowed to view grades for this course.'}, status=403)
            grades = Grade.objects.filter(course=course)
        else:
            return Response({'error': 'You are not allowed to view grades for this course.'}, status=403)
        serializer = GradeSerializer(grades, many=True, context={'request': request})
        return Response(serializer.data)

    if not user_is_instructor_or_admin(request.user):
        return Response({'error': 'Only instructors or admins can grade students.'}, status=403)
    if getattr(request.user, 'role', None) == 'teacher' and not user_is_course_instructor(request.user, course):
        return Response({'error': 'You are not allowed to grade students for this course.'}, status=403)

    student_id = request.data.get('student_id')
    score = request.data.get('score')
    if not student_id or score is None:
        return Response({'error': 'student_id and score are required.'}, status=400)

    student = User.objects.filter(id=student_id, role='student', is_active=True).first()
    if not student:
        return Response({'error': 'Student not found.'}, status=404)

    assignment = None
    assignment_id = request.data.get('assignment_id')
    if assignment_id:
        assignment = Assignment.objects.filter(id=assignment_id).first()
        if not assignment:
            return Response({'error': 'Assignment not found.'}, status=404)

    title = request.data.get('title') or (assignment.title if assignment else f'Course grade for {course.title}')

    grade_obj, created = Grade.objects.update_or_create(
        course=course,
        student=student,
        title=title,
        defaults={
            'graded_by': request.user,
            'assignment': assignment,
            'score': score,
            'feedback': request.data.get('feedback', ''),
        }
    )
    return Response(GradeSerializer(grade_obj, context={'request': request}).data, status=201 if created else 200)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def course_lessons(request, course_id):
    course = Course.objects.filter(id=course_id).first()
    if not course:
        return Response({'error': 'Course not found.'}, status=404)

    # Students can only view published courses
    if getattr(request.user, 'role', None) == 'student' and course.status != 'Published':
        return Response({'error': 'You are not allowed to view this course.'}, status=403)
    if getattr(request.user, 'role', None) == 'teacher' and not user_is_course_instructor(request.user, course):
        return Response({'error': 'You are not allowed to view this course.'}, status=403)

    modules = course.modules or []
    flat = []
    # Build a flat list of lessons with deterministic ids
    for mi, module in enumerate(modules):
        lessons = module.get('lessons', []) if isinstance(module, dict) else []
        for li, lesson in enumerate(lessons):
            lid = lesson.get('id') or f"m{mi}_l{li}"
            flat.append({
                'id': str(lid),
                'title': lesson.get('title') or lesson.get('name') or f"Lesson {li+1}",
                'duration': lesson.get('duration') or lesson.get('length') or '00:10:00',
                'meta': lesson.get('meta', {}),
            })

    # Determine completion for the requesting user
    completed = set(StudentLessonProgress.objects.filter(student=request.user, course=course).values_list('lesson_id', flat=True))

    lessons_out = []
    for idx, l in enumerate(flat):
        prevCompleted = True if idx == 0 else (flat[idx-1]['id'] in completed)
        l_completed = l['id'] in completed
        lessons_out.append({
            'id': l['id'],
            'title': l['title'],
            'duration': l['duration'],
            'completed': l_completed,
            'locked': not prevCompleted and not l_completed,
        })

    completed_count = sum(1 for x in lessons_out if x['completed'])
    return Response({'lessons': lessons_out, 'total_lessons': course.total_lessons or len(flat), 'completed_count': completed_count})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsActiveUser])
def complete_lesson(request, course_id, lesson_id):
    course = Course.objects.filter(id=course_id).first()
    if not course:
        return Response({'error': 'Course not found.'}, status=404)

    # Only students may mark their own lessons as complete
    if getattr(request.user, 'role', None) != 'student':
        return Response({'error': 'Only students can mark lesson completion.'}, status=403)

    obj, created = StudentLessonProgress.objects.get_or_create(student=request.user, course=course, lesson_id=lesson_id)
    return Response({'completed': True, 'created': created})


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated, IsActiveUser])
def course_grade_detail(request, course_id, grade_id):
    course = Course.objects.filter(id=course_id).first()
    if not course:
        return Response({'error': 'Course not found.'}, status=404)

    grade = Grade.objects.filter(id=grade_id, course=course).first()
    if not grade:
        return Response({'error': 'Grade not found.'}, status=404)

    # Only instructors for the course or admins may modify or delete grades
    if getattr(request.user, 'role', None) == 'teacher' and not user_is_course_instructor(request.user, course):
        return Response({'error': 'You are not allowed to modify this grade.'}, status=403)

    if request.method == 'DELETE':
        grade.delete()
        return Response({'message': 'Grade deleted.'})

    # PATCH: update allowed fields
    if request.method == 'PATCH':
        score = request.data.get('score')
        feedback = request.data.get('feedback')
        title = request.data.get('title')
        if score is not None:
            try:
                grade.score = float(score)
            except Exception:
                return Response({'error': 'Invalid score value.'}, status=400)
        if feedback is not None:
            grade.feedback = feedback
        if title is not None:
            grade.title = title
        grade.graded_by = request.user
        grade.graded_at = timezone.now()
        grade.save()
        return Response(GradeSerializer(grade, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def instructor_dashboard(request):
    # Only instructors or admins may view instructor dashboard
    if not user_is_instructor_or_admin(request.user):
        return Response({'error': 'Only instructors or admins can view this dashboard.'}, status=403)

    courses_qs = Course.objects.filter(Q(instructor=request.user) | Q(course_instructors__instructor=request.user)).distinct()
    total_courses = courses_qs.count()

    student_ids = set()
    for c in courses_qs:
        matched = StudentProfile.objects.filter(
            study_stream__in=(c.streams or []),
            set_number=c.set_number,
        ).values_list('user_id', flat=True)
        student_ids.update(matched)
    total_students = len(student_ids)

    # Submissions to assignments owned by this instructor
    subs_qs = Submission.objects.filter(assignment__instructor=request.user, is_draft=False).order_by('-submitted_at')
    pending_submissions_count = 0
    recent_submissions = []
    for s in subs_qs[:20]:
        has_grade = Grade.objects.filter(assignment=s.assignment, student=s.intern).exists()
        if not has_grade:
            pending_submissions_count += 1
        recent_submissions.append({
            'id': s.id,
            'assignment_title': getattr(s.assignment, 'title', None),
            'student_username': s.intern.username if s.intern else None,
            'submitted_at': s.submitted_at,
            'has_grade': has_grade,
        })

    recent_grades_qs = Grade.objects.filter(course__in=courses_qs).order_by('-graded_at')[:5]
    recent_grades = GradeSerializer(recent_grades_qs, many=True, context={'request': request}).data

    course_performance = []
    for c in courses_qs:
        avg_score = Grade.objects.filter(course=c).aggregate(avg=Avg('score'))['avg'] or 0
        course_performance.append({
            'id': c.id,
            'title': c.title,
            'average_score': float(avg_score),
            'total_lessons': c.total_lessons or 0,
        })

    return Response({
        'total_courses_taught': total_courses,
        'total_students_enrolled': total_students,
        'pending_submissions_count': pending_submissions_count,
        'recent_submissions': recent_submissions[:5],
        'recent_grades': recent_grades,
        'course_performance': course_performance,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def student_dashboard(request):
    user = request.user
    # Ensure student
    if not hasattr(user, 'student_profile'):
        return Response({'error': 'Student profile not found.'}, status=403)

    recent_grades_qs = Grade.objects.filter(student=user).order_by('-graded_at')[:5]
    recent_grades = GradeSerializer(recent_grades_qs, many=True, context={'request': request}).data

    avg_score = Grade.objects.filter(student=user).aggregate(avg=Avg('score'))['avg'] or 0

    # Assignments available to this student
    assignment_viewset = AssignmentViewSet(request=request)
    assignments_qs = assignment_viewset.get_queryset()
    assignments = AssignmentSerializer(assignments_qs, many=True, context={'request': request}).data

    # Basic course progress: per-course average (if grades exist)
    course_progress = []
    courses_with_grades = Course.objects.filter(grades__student=user).distinct()
    for c in courses_with_grades:
        avg_c = Grade.objects.filter(course=c, student=user).aggregate(avg=Avg('score'))['avg'] or 0
        course_progress.append({'id': c.id, 'title': c.title, 'average_score': float(avg_c), 'total_lessons': c.total_lessons or 0})

    return Response({
        'recent_grades': recent_grades,
        'gpa_average': float(avg_score),
        'assignments': assignments,
        'course_progress': course_progress,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def available_courses(request):
    """Get courses available to student's stream (published + stream match)"""
    user = request.user
    if not hasattr(user, 'student_profile'):
        return Response({'error': 'Student profile not found.'}, status=403)

    student_stream = user.student_profile.study_stream
    student_set = user.student_profile.set_number
    courses_qs = Course.objects.filter(status='Published', set_number=student_set)
    courses = [
        c for c in courses_qs
        if 'general' in (c.streams or []) or student_stream in (c.streams or [])
    ]
    serializer = CourseSerializer(courses, many=True, context={'request': request})
    return Response({'courses': serializer.data})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def my_courses(request):
    """Get student's auto-matched courses based on their stream and set."""
    user = request.user
    if not hasattr(user, 'student_profile'):
        return Response({'error': 'Student profile not found.'}, status=403)

    student_stream = user.student_profile.study_stream
    student_set = user.student_profile.set_number
    courses_qs = Course.objects.filter(status='Published', set_number=student_set)
    courses = [c for c in courses_qs if 'general' in (c.streams or []) or student_stream in (c.streams or [])]
    serializer = CourseSerializer(courses, many=True, context={'request': request})
    return Response({'courses': serializer.data})


class AssignmentViewSet:
    serializer_class = AssignmentSerializer

    def __init__(self, request=None):
        self.request = request

    def get_queryset(self):
        user = self.request.user if self.request else None
        if not user:
            return Assignment.objects.none()
        if user.is_staff or getattr(user, 'is_superuser', False) or getattr(user, 'role', None) == 'teacher':
            return Assignment.objects.filter(instructor=user)
        if hasattr(user, 'student_profile'):
            stream = user.student_profile.study_stream
            set_number = user.student_profile.set_number
            if stream and set_number:
                # Prevent draft/partial assignments (e.g., QUIZ with zero questions)
                # Students should only see assignments that are fully created.
                matching_course_ids = [
                    c.id for c in Course.objects.filter(set_number=set_number)
                    if 'general' in (c.streams or []) or stream in (c.streams or [])
                ]
                qs = Assignment.objects.filter(
                    course_id__in=matching_course_ids,
                    status='published'
                )
                # Annotate question count and exclude QUIZ assignments with no questions
                qs = qs.annotate(question_count=Count('questions'))
                qs = qs.filter(Q(assignment_type__iexact='QUIZ', question_count__gt=0) | ~Q(assignment_type__iexact='QUIZ'))
                return qs
        return Assignment.objects.none()


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsActiveUser])
def assignments(request):
    if request.method == 'GET':
        assignment_viewset = AssignmentViewSet(request=request)
        qs = assignment_viewset.get_queryset()
        serializer = AssignmentSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    if not (request.user.is_staff or getattr(request.user, 'is_superuser', False) or getattr(request.user, 'role', None) == 'teacher'):
        return Response({'error': 'Only instructors can create assignments.'}, status=403)

    serializer = AssignmentSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    assignment = serializer.save(instructor=request.user, status='published')
    return Response(AssignmentSerializer(assignment, context={'request': request}).data, status=201)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated, IsActiveUser])
def assignment_detail(request, assignment_id):
    assignment = Assignment.objects.filter(id=assignment_id).first()
    if not assignment:
        return Response({'error': 'Assignment not found.'}, status=404)

    is_admin = request.user.is_staff or getattr(request.user, 'is_superuser', False)

    if request.method == 'DELETE':
        is_owner = assignment.instructor_id == request.user.id
        if not (is_admin or is_owner):
            return Response({'error': 'You can only delete assignments you created.'}, status=403)
        assignment.delete()
        return Response({'message': 'Assignment deleted.'})

    if is_admin:
        pass
    elif getattr(request.user, 'role', None) == 'teacher':
        if assignment.instructor_id != request.user.id:
            return Response({'error': 'You are not allowed to view this assignment.'}, status=403)
    else:
        student_profile = getattr(request.user, 'student_profile', None)
        if not student_profile:
            return Response({'error': 'Student profile not found.'}, status=400)
        course = assignment.course
        set_matches = course.set_number == student_profile.set_number
        stream_matches = 'general' in course.streams or student_profile.study_stream in course.streams
        if not (set_matches and stream_matches):
            return Response({'error': 'You are not allowed to view this assignment.'}, status=403)

    return Response(AssignmentSerializer(assignment, context={'request': request}).data)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsActiveUser])
@transaction.atomic
def submissions(request):
    if request.method == 'GET':
        if request.user.is_staff or getattr(request.user, 'is_superuser', False) or getattr(request.user, 'role', None) == 'teacher':
            return Response({'error': 'This endpoint is for interns.'}, status=403)

        stream = None
        set_number = None
        if hasattr(request.user, 'student_profile'):
            stream = request.user.student_profile.study_stream
            set_number = request.user.student_profile.set_number

        if stream and set_number:
            matching_course_ids = [
                c.id for c in Course.objects.filter(set_number=set_number)
                if 'general' in (c.streams or []) or stream in (c.streams or [])
            ]
            qs = Assignment.objects.filter(course_id__in=matching_course_ids, status='published')
            qs = qs.annotate(question_count=Count('questions'))
            qs = qs.filter(Q(assignment_type__iexact='QUIZ', question_count__gt=0) | ~Q(assignment_type__iexact='QUIZ'))
        else:
            qs = Assignment.objects.none()
        serializer = AssignmentSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    if request.user.is_staff or getattr(request.user, 'is_superuser', False) or getattr(request.user, 'role', None) == 'teacher':
        return Response({'error': 'Only interns can submit work.'}, status=403)

    assignment_id = request.data.get('assignment') or request.data.get('assignment_id')
    if not assignment_id:
        return Response({'error': 'assignment is required.'}, status=400)

    assignment = Assignment.objects.select_for_update().filter(id=assignment_id).first()
    if not assignment:
        return Response({'error': 'Assignment not found.'}, status=404)

    if assignment.due_date < timezone.now():
        return Response({'error': 'Deadline passed'}, status=400)

    student_profile = getattr(request.user, 'student_profile', None)
    if student_profile:
        course = assignment.course
        set_matches = course.set_number == student_profile.set_number
        stream_matches = 'general' in course.streams or student_profile.study_stream in course.streams
        if not (set_matches and stream_matches):
            return Response({'error': 'You are not allowed to submit this assignment.'}, status=403)

    # Check if a submission for this assignment already exists for this intern
    existing_submission = Submission.objects.select_for_update().filter(
        assignment_id=assignment_id,
        intern=request.user
    ).first()

    # If there is an existing final submission, do not allow another
    if existing_submission and not existing_submission.is_draft:
        return Response({'error': 'You have already submitted this assignment. Only one submission per assignment is allowed.'}, status=400)

    # Validate payload (basic) and then save/convert draft to final
    serializer = SubmissionSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    try:
        # If existing draft exists, update it to final submission
        if existing_submission and existing_submission.is_draft:
            existing_submission.submission_text = request.data.get('submission_text') or existing_submission.submission_text
            # update file if provided
            if request.FILES.get('submission_file'):
                existing_submission.submission_file = request.FILES.get('submission_file')
            existing_submission.is_draft = False
            existing_submission.submitted_at = timezone.now()
            existing_submission.save()
            submission = existing_submission
        else:
            # create a new final submission
            submission = serializer.save(intern=request.user)
            submission.is_draft = False
            submission.submitted_at = timezone.now()
            submission.save()

        # Handle quiz responses if this is a quiz submission
        if assignment.assignment_type == 'QUIZ':
            quiz_responses_data = request.data.getlist('quiz_responses[]')
            if isinstance(quiz_responses_data, str):
                import json as json_module
                quiz_responses_data = json_module.loads(quiz_responses_data)
            elif not quiz_responses_data:
                quiz_responses_data = request.data.get('quiz_responses', [])

            # Replace any existing quiz responses
            QuizResponse.objects.filter(submission=submission).delete()

            for response_data in (quiz_responses_data or []):
                question_id = response_data.get('question')
                selected_option_id = response_data.get('selected_option')
                text_answer = response_data.get('text_answer')

                if not question_id:
                    continue

                quiz_response = QuizResponse(
                    submission=submission,
                    question_id=question_id,
                    selected_option_id=selected_option_id,
                    text_answer=text_answer
                )
                quiz_response.save()

        return Response(SubmissionSerializer(submission, context={'request': request}).data, status=201)
    except Exception as e:
        # Handle UNIQUE constraint or other DB errors
        if 'UNIQUE constraint' in str(e):
            return Response({'error': 'You have already submitted this assignment. Only one submission per assignment is allowed.'}, status=400)
        raise


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsActiveUser])
@transaction.atomic
def save_submission_draft(request):
    if request.user.is_staff or getattr(request.user, 'is_superuser', False) or getattr(request.user, 'role', None) == 'teacher':
        return Response({'error': 'Only interns can save drafts.'}, status=403)

    assignment_id = request.data.get('assignment') or request.data.get('assignment_id')
    if not assignment_id:
        return Response({'error': 'assignment is required.'}, status=400)

    assignment = Assignment.objects.select_for_update().filter(id=assignment_id).first()
    if not assignment:
        return Response({'error': 'Assignment not found.'}, status=404)

    student_profile = getattr(request.user, 'student_profile', None)
    if student_profile:
        course = assignment.course
        set_matches = course.set_number == student_profile.set_number
        stream_matches = 'general' in course.streams or student_profile.study_stream in course.streams
        if not (set_matches and stream_matches):
            return Response({'error': 'You are not allowed to save this assignment.'}, status=403)

    existing_submission = Submission.objects.select_for_update().filter(
        assignment=assignment,
        intern=request.user
    ).first()

    if existing_submission and not existing_submission.is_draft:
        return Response({'error': 'Final submission already exists. Draft cannot be saved.'}, status=400)

    submission, created = Submission.objects.get_or_create(
        assignment=assignment,
        intern=request.user,
        defaults={'is_draft': True}
    )

    submission.submission_text = request.data.get('submission_text') or submission.submission_text
    if request.FILES.get('submission_file'):
        submission.submission_file = request.FILES.get('submission_file')
    submission.is_draft = True
    submission.save()

    if assignment.assignment_type == 'QUIZ':
        quiz_responses_data = request.data.getlist('quiz_responses[]')
        if isinstance(quiz_responses_data, str):
            import json as json_module
            quiz_responses_data = json_module.loads(quiz_responses_data)
        elif not quiz_responses_data:
            quiz_responses_data = request.data.get('quiz_responses', [])

        QuizResponse.objects.filter(submission=submission).delete()
        for response_data in (quiz_responses_data or []):
            question_id = response_data.get('question')
            selected_option_id = response_data.get('selected_option')
            text_answer = response_data.get('text_answer')
            if not question_id:
                continue
            QuizResponse.objects.create(
                submission=submission,
                question_id=question_id,
                selected_option_id=selected_option_id,
                text_answer=text_answer
            )

    return Response(SubmissionSerializer(submission, context={'request': request}).data, status=200)


# Notifications endpoints
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    user = request.user

    # Notifications directly to user
    direct = Notification.objects.filter(recipient=user)

    # Role-targeted notifications where role_target matches user.role
    role = getattr(user, 'role', None)
    role_targeted = Notification.objects.filter(role_target__iexact=role) if role else Notification.objects.none()

    qs = (direct | role_targeted).distinct().order_by('-created_at')
    serializer = NotificationSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    user = request.user
    try:
        n = Notification.objects.get(id=notification_id)
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    # Allow only recipient or admins to mark
    if n.recipient and n.recipient != user and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Forbidden'}, status=403)

    n.is_read = True
    n.save()
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_pending_users(request):
    users = User.objects.filter(is_active=False)
    data = []
    for u in users:
        item = {
            'id': str(u.id),
            'username': u.username,
            'email': u.email,
            'role': 'admin' if u.is_staff else getattr(u, 'role', None),
            'first_name': '',
            'last_name': '',
            'matric_number': None,
            'ph_code': None,
            'admission_year': None,
            'set_number': None,
            'study_stream': None,
            'profile_photo_url': None,
        }
        if hasattr(u, 'student_profile'):
            item['first_name'] = u.student_profile.first_name
            item['last_name'] = u.student_profile.last_name
            item['matric_number'] = u.student_profile.matric_number
            item['admission_year'] = getattr(u.student_profile, 'admission_year', None)
            item['set_number'] = u.student_profile.set_number
            item['study_stream'] = u.student_profile.study_stream
            if u.student_profile.profile_photo:
                item['profile_photo_url'] = request.build_absolute_uri(u.student_profile.profile_photo.url)
        if hasattr(u, 'staff_profile'):
            item['first_name'] = u.staff_profile.first_name
            item['last_name'] = u.staff_profile.last_name
            item['ph_code'] = u.staff_profile.ph_code
            if u.staff_profile.profile_photo:
                item['profile_photo_url'] = request.build_absolute_uri(u.staff_profile.profile_photo.url)
        data.append(item)

    return Response({'total': len(data), 'users': data})


def resolve_stream_value(raw_stream: str) -> str:
    normalized = str(raw_stream or '').strip().lower()
    if normalized in ['ict', 'computer science', 'computer', 'technology']:
        return 'ict'
    if normalized in ['mechatronics']:
        return 'mechatronics'
    if normalized in ['pls', 'physical and life sciences', 'physical', 'life sciences']:
        return 'pls'
    return 'general'


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_all_users(request):
    users_qs = User.objects.all().select_related()
    data = []
    for u in users_qs:
        item = {
            'id': str(u.id),
            'username': u.username,
            'email': u.email,
            'role': 'admin' if u.is_staff else getattr(u, 'role', None),
            'first_name': '',
            'last_name': '',
            'matric_number': None,
            'ph_code': None,
            'admission_year': None,
            'set_number': None,
            'study_stream': None,
            'is_active': bool(u.is_active),
            'joined': getattr(u, 'date_joined', None),
            'profile_photo_url': None,
        }
        if hasattr(u, 'student_profile'):
            sp = u.student_profile
            item.update({
                'first_name': sp.first_name,
                'last_name': sp.last_name,
                'matric_number': sp.matric_number,
                'admission_year': getattr(sp, 'admission_year', None),
                'set_number': sp.set_number,
                'study_stream': sp.study_stream,
            })
            if sp.profile_photo:
                item['profile_photo_url'] = request.build_absolute_uri(sp.profile_photo.url)
        if hasattr(u, 'staff_profile'):
            sp = u.staff_profile
            item.update({
                'first_name': sp.first_name,
                'last_name': sp.last_name,
                'ph_code': sp.ph_code,
            })
            if sp.profile_photo:
                item['profile_photo_url'] = request.build_absolute_uri(sp.profile_photo.url)
        data.append(item)

    return Response({'total': len(data), 'users': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def create_user(request):
    data = request.data
    role = str(data.get('role', '')).strip().lower()

    if role not in ['intern', 'student', 'instructor', 'teacher', 'admin']:
        return Response({'error': 'Unsupported user role'}, status=400)

    base_required = ['first_name', 'last_name', 'email', 'password']
    missing = [field for field in base_required if not data.get(field)]
    if missing:
        return Response({'error': f"Missing required field(s): {', '.join(missing)}"}, status=400)

    if role in ['intern', 'student']:
        student_required = ['matric_number', 'set_number', 'study_stream']
        missing_student = [field for field in student_required if not data.get(field)]
        if missing_student:
            return Response({'error': f"Missing student field(s): {', '.join(missing_student)}"}, status=400)

        matric_value = str(data['matric_number']).strip().upper()
        if not re.fullmatch(r'^[A-Z]{2}/\d{2}/\d{3}$', matric_value):
            return Response({'error': 'Matric number must be in the format: XX/00/000', 'field': 'matric_number'}, status=400)
        data = {**data, 'matric_number': matric_value}

        user, error = create_base_user(
            username=data['matric_number'],
            email=data['email'],
            password=data['password'],
            role='student',
            is_active=True
        )
        if error:
            return Response({'error': error}, status=400)

        StudentProfile.objects.create(
            user=user,
            matric_number=data['matric_number'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            gender=str(data.get('gender') or 'male').lower(),
            date_of_birth=data.get('date_of_birth') or data.get('dob'),
            country=data.get('country', 'Nigeria'),
            state=data.get('state', 'Not Applicable'),
            study_stream=resolve_stream_value(data['study_stream']),
            set_number=int(data['set_number']),
            admission_year=int(data['admission_year']) if data.get('admission_year') else None
        )

        return Response({
            'message': 'Student user created',
            'user': {
                'id': str(user.id),
                'email': user.email,
                'role': 'student',
                'username': user.username,
                'set_number': int(data['set_number']),
                'study_stream': resolve_stream_value(data['study_stream']),
                'matric_number': data['matric_number'],
                'profile_photo_url': None,
            }
        })

    if role in ['instructor', 'teacher']:
        if not data.get('ph_code'):
            return Response({'error': 'ph_code is required for instructor creation'}, status=400)

        user, error = create_base_user(
            username=data['ph_code'],
            email=data['email'],
            password=data['password'],
            role='teacher',
            is_active=True
        )
        if error:
            return Response({'error': error}, status=400)

        StaffProfile.objects.create(
            user=user,
            ph_code=data['ph_code'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            gender=str(data.get('gender') or 'male').lower(),
            date_of_birth=data.get('date_of_birth') or data.get('dob'),
            country=data.get('country', 'Nigeria')
        )

        return Response({'message': 'Instructor user created', 'user': {'id': str(user.id), 'email': user.email, 'role': 'teacher', 'username': user.username, 'profile_photo_url': None}})

    if role == 'admin':
        user, error = create_base_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            role='teacher',
            is_active=True,
            is_staff=True
        )
        if error:
            return Response({'error': error}, status=400)

        return Response({'message': 'Admin user created', 'user': {'id': str(user.id), 'email': user.email, 'role': 'admin', 'username': user.username, 'profile_photo_url': None}})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_active_interns(request):
    students = StudentProfile.objects.filter(user__is_active=True).select_related('user')
    grouped = {}
    for s in students:
        set_no = s.set_number or 1
        stream = s.study_stream or 'general'
        grouped.setdefault(str(set_no), {}).setdefault(stream, []).append({
            'id': str(s.user.id),
            'username': s.user.username,
            'first_name': s.first_name,
            'last_name': s.last_name,
            'matric_number': s.matric_number,
        })

    # Convert grouped dict into a list for predictable ordering
    sets = []
    for set_key in sorted(grouped.keys(), key=lambda x: int(x)):
        streams = grouped[set_key]
        sets.append({'set_number': int(set_key), 'streams': streams})

    return Response({'total': students.count(), 'sets': sets})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_active_instructors(request):
    staffs = StaffProfile.objects.filter(user__is_active=True).select_related('user')
    items = []
    for s in staffs:
        items.append({
            'id': str(s.user.id),
            'username': s.user.username,
            'first_name': s.first_name,
            'last_name': s.last_name,
            'ph_code': s.ph_code,
        })
    return Response({'total': len(items), 'instructors': items})


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_user(request, user_id):
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    if request.method == 'GET':
        item = {
            'id': str(u.id),
            'username': u.username,
            'email': u.email,
            'role': 'admin' if u.is_staff else getattr(u, 'role', None),
            'first_name': '',
            'last_name': '',
            'matric_number': None,
            'ph_code': None,
            'admission_year': None,
            'set_number': None,
            'study_stream': None,
            'is_active': bool(u.is_active),
        }
        if hasattr(u, 'student_profile'):
            sp = u.student_profile
            item.update({
                'first_name': sp.first_name,
                'last_name': sp.last_name,
                'matric_number': sp.matric_number,
                'admission_year': getattr(sp, 'admission_year', None),
                'set_number': sp.set_number,
                'study_stream': sp.study_stream,
            })
        if hasattr(u, 'staff_profile'):
            sp = u.staff_profile
            item.update({
                'first_name': sp.first_name,
                'last_name': sp.last_name,
                'ph_code': sp.ph_code,
            })
        return Response(item)

    # DELETE
    username = u.username
    u.delete()
    return Response({'message': 'User deleted', 'user': {'id': str(user_id), 'username': username}})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsActiveUser])
def upload_profile_photo(request):
    user = request.user
    profile = None
    if hasattr(user, 'student_profile'):
        profile = user.student_profile
    elif hasattr(user, 'staff_profile'):
        profile = user.staff_profile

    if 'profile_photo' not in request.FILES:
        return Response({'error': 'No file uploaded'}, status=400)

    photo = request.FILES['profile_photo']
    try:
        if profile is not None:
            profile.profile_photo.save(photo.name, photo, save=True)
            photo_url = request.build_absolute_uri(profile.profile_photo.url)
        else:
            user.profile_photo.save(photo.name, photo, save=True)
            photo_url = request.build_absolute_uri(user.profile_photo.url)
    except Exception:
        return Response({'error': 'Failed to save photo'}, status=500)

    return Response({'message': 'Photo uploaded', 'url': photo_url})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def approve_user(request, user_id):
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    u.is_active = True
    u.save()
    return Response({'message': 'User approved', 'user': {'id': str(u.id), 'username': u.username}})


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def decline_user(request, user_id):
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    username = u.username
    u.delete()
    return Response({'message': 'User declined', 'user': {'id': str(user_id), 'username': username}})




@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def live_sessions(request):
    user = request.user
    is_admin = user.is_staff or getattr(user, 'is_superuser', False)
    is_instructor = getattr(user, 'role', '') in ('teacher', 'instructor')

    if request.method == 'GET':
        if is_admin:
            sessions = LiveSession.objects.all()
        elif is_instructor:
            sessions = LiveSession.objects.filter(instructor=user)
        else:
            enrolled_course_ids = Course.objects.filter(
                enrollments__student=user
            ).values_list('id', flat=True) if hasattr(Course, 'enrollments') else \
            Course.objects.filter(course_instructors__instructor=user).values_list('id', flat=True)
            sessions = LiveSession.objects.filter(course_id__in=enrolled_course_ids)

        data = [{
            'id': s.id,
            'topic': s.topic,
            'course_id': s.course_id,
            'course_title': s.course.title,
            'instructor_name': f"{s.instructor.first_name} {s.instructor.last_name}".strip() or s.instructor.username,
            'scheduled_date': str(s.scheduled_date),
            'scheduled_time': str(s.scheduled_time),
            'status': s.status,
        } for s in sessions]
        return Response({'sessions': data})

    if request.method == 'POST':
        if not is_instructor and not is_admin:
            return Response({'error': 'Only instructors can schedule sessions.'}, status=403)

        course_id = request.data.get('course')
        topic = request.data.get('topic')
        date = request.data.get('date')
        time = request.data.get('time')

        if not all([course_id, topic, date, time]):
            return Response({'error': 'course, topic, date, and time are required.'}, status=400)

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=404)

        session = LiveSession.objects.create(
            course=course,
            instructor=user,
            topic=topic,
            scheduled_date=date,
            scheduled_time=time,
        )
        return Response({
            'id': session.id,
            'topic': session.topic,
            'course_id': session.course_id,
            'course_title': session.course.title,
            'instructor_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'scheduled_date': str(session.scheduled_date),
            'scheduled_time': str(session.scheduled_time),
            'status': session.status,
        }, status=201)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def live_session_detail(request, session_id):
    try:
        session = LiveSession.objects.get(id=session_id)
    except LiveSession.DoesNotExist:
        return Response({'error': 'Session not found.'}, status=404)

    if request.method == 'DELETE':
        is_admin = request.user.is_staff or getattr(request.user, 'is_superuser', False)
        if not (is_admin or session.instructor_id == request.user.id):
            return Response({'error': 'You can only delete sessions you created.'}, status=403)
        session.delete()
        return Response({'message': 'Session deleted.'})

    return Response({
        'id': session.id,
        'topic': session.topic,
        'course_id': session.course_id,
        'course_title': session.course.title,
        'instructor_name': f"{session.instructor.first_name} {session.instructor.last_name}".strip() or session.instructor.username,
        'scheduled_date': str(session.scheduled_date),
        'scheduled_time': str(session.scheduled_time),
        'status': session.status,
    })