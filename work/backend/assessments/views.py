from django.shortcuts import render
import json
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Assessment, Submission
from core.permissions import IsStaffUser
from core.permissions import IsStudentUser
from core.models import StudentProfile, Notification
from django.utils import timezone


def serialize_assessment(assessment):
    return {
        "id": assessment.id,
        "title": assessment.title,
        "description": assessment.description,
        "instructions": assessment.description,
        "target_stream": assessment.target_stream,
        "target_set": assessment.target_set,
        "deadline": assessment.deadline,
        "dueDate": assessment.deadline,
        "total_points": getattr(assessment, 'max_points', 100),
        "type": getattr(assessment, 'assessment_type', 'WRITTEN'),
        "created_by": assessment.created_by.username,
        
        "status": "Published",
        "submissions": Submission.objects.filter(assessment=assessment).count(),
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffUser])
def create_assessment(request):
    data = request.data

    required_fields = ["title", "description", "target_stream", "target_set", "deadline"]

    for field in required_fields:
        if field not in data or not data[field]:
            return Response({
                "success": False,
                "error": f"{field} is required",
                "field": field
            }, status=400)

    # Create assessment
    assessment = Assessment.objects.create(
        title=data["title"],
        description=data["description"],
        target_stream=data["target_stream"],
        target_set=data["target_set"],  # NEW
        deadline=data["deadline"],
        max_points=data.get("max_points", 100),
        assessment_type=data.get("type", data.get("assessment_type", 'WRITTEN')),
        created_by=request.user # IMPORTANT: comes from JWT
    )  

    return Response({
        "success": True,
        "message": "Assessment created successfully",
        "assessment": serialize_assessment(assessment)
    }, status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_assessments(request):
    user = request.user

    if getattr(user, "role", None) == "teacher" or user.is_staff:
        assessments = Assessment.objects.filter(created_by=user).order_by("-created_at")
        return Response([serialize_assessment(a) for a in assessments])

    # Get student's stream
    student_profile = StudentProfile.objects.filter(user=user).first()

    if not student_profile:
        return Response({
            "success": False,
            "error": "Student profile not found",
            "user": user.username,
            "role": user.role
        }, status=400)

    student_stream = student_profile.study_stream
    student_set = student_profile.set_number

    #filter assessments
    assessments = Assessment.objects.filter(
        target_stream=student_stream,
        target_set=student_set,
        deadline__gte=timezone.now()
    )

    return Response([serialize_assessment(a) for a in assessments])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_assessment(request, assessment_id):
    try:
        assessment = Assessment.objects.get(id=assessment_id)
    except Assessment.DoesNotExist:
        return Response({"error": "Assessment not found"}, status=404)

    user = request.user
    if getattr(user, "role", None) == "teacher" or user.is_staff:
        if assessment.created_by != user and not user.is_staff:
            return Response({"error": "You are not allowed to view this assessment"}, status=403)
        return Response(serialize_assessment(assessment))

    student_profile = StudentProfile.objects.filter(user=user).first()
    if not student_profile:
        return Response({"error": "Student profile not found"}, status=400)

    if assessment.target_stream != student_profile.study_stream or assessment.target_set != student_profile.set_number:
        return Response({"error": "You are not allowed to view this assessment"}, status=403)

    return Response(serialize_assessment(assessment))

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStudentUser])
def submit_assessment(request, assessment_id):
    user = request.user

    try:
        assessment = Assessment.objects.get(id=assessment_id)
    except Assessment.DoesNotExist:
        return Response({"error": "Assessment not found"}, status=404)

    # Deadline check
    if assessment.deadline < timezone.now():
        return Response({
            "success": False,
            "error": "Deadline passed"
        }, status=400)

    # Prevent duplicate submission
    if Submission.objects.filter(student=user, assessment=assessment).exists():
        return Response({
            "success":False,
            "error": "Already submitted"
        }, status=400)


    # Proper submission validation to check if the student is in the right stream and set to submit assessment
    student_profile = StudentProfile.objects.filter(user=user).first()

    if not student_profile:
        return Response({
            "success": False,
            "error": "Student profile not found"
        }, status=400)

    student_stream = student_profile.study_stream
    student_set = student_profile.set_number

    # STRICT CHECK: BOTH stream AND set must match
    if (
        assessment.target_stream != student_stream or
        assessment.target_set != student_set
    ):
        return Response({
            "success": False,
            "error": "You are not allowed to submit this assessment"
        }, status=403)


    submission = Submission.objects.create(
        student=user,
        assessment=assessment,
        text_answer=request.data.get("text_answer"),
        file_upload=request.FILES.get("file")
    )

    # Notify the assessment owner (instructor) about new submission
    try:
        Notification.objects.create(
            recipient=assessment.created_by,
            title='New submission received',
            message=f"{user.username} submitted for '{assessment.title}'",
            type='assignment'
        )
    except Exception:
        print('Failed to create notification for new submission')

    return Response({
        "success": True,
        "message": "Submission successful"})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffUser])
def view_submissions(request, assessment_id):
    try:
        assessment = Assessment.objects.get(id=assessment_id)
    except Assessment.DoesNotExist:
        return Response({
            "success": False,
            "error": "Assessment not found"
            }, status=404)

    submissions = Submission.objects.filter(assessment=assessment)

    data = []
    for s in submissions:
        data.append({
            "id": s.id,
            "student": s.student.username,
            "text_answer": s.text_answer,
            "file": s.file_upload.url if s.file_upload else None,
            "submitted_at": s.submitted_at,
            "score": s.score,
            "feedback": s.feedback,
            "status": s.status,
        })

    return Response({
        "assessment": assessment.title,
        "total_submissions": submissions.count(),
        "submissions": data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffUser])
def grade_submission(request, submission_id):

    try:
        submission = Submission.objects.get(id=submission_id)
    except Submission.DoesNotExist:
        return Response({
            "success": False,
            "error": "Submission not found"
        }, status=404)

    # to ensure that the staff who creates the assessment is the one who grades it
    if submission.assessment.created_by != request.user:
        return Response({
            "success":False,
            "error": "You are not allowed to grade this submission"
        }, status=403)

    # to ensure the score allocated is a number
    try:
        score = int(request.data.get("score"))
    except:
        return Response({
            "success": False,
            "error": "Score must be a number"
        }, status=400)

    submission.score = request.data.get("score")
    submission.feedback = request.data.get("feedback")
    submission.status = "graded"
    submission.save()

    # Notify the student about grading
    try:
        Notification.objects.create(
            recipient=submission.student,
            title='Your submission was graded',
            message=f"Your submission for '{submission.assessment.title}' has been graded. Score: {submission.score}",
            type='grading'
        )
    except Exception:
        print('Failed to create notification for grading')

    return Response({
        "message": "Submission graded successfully"
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStudentUser])
def student_submissions(request):
    """Return graded submissions for the authenticated student."""
    submissions = Submission.objects.filter(student=request.user, status='graded').order_by('-submitted_at')

    data = []
    for s in submissions:
        data.append({
            "id": s.id,
            "assessment_id": s.assessment.id if s.assessment else None,
            "assessment_title": s.assessment.title if s.assessment else None,
            "score": s.score,
            "feedback": s.feedback,
            "submitted_at": s.submitted_at,
        })

    return Response({
        "total": submissions.count(),
        "submissions": data
    })
