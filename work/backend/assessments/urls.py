from django.urls import path
from .views import create_assessment, get_assessment, list_assessments, submit_assessment, view_submissions, grade_submission, student_submissions

urlpatterns = [
    path("create/", create_assessment),
    path("list/", list_assessments),
    path("<int:assessment_id>/", get_assessment),
    path("submit/<int:assessment_id>/", submit_assessment),
    path("<int:assessment_id>/submissions/", view_submissions),
    path("submission/<int:submission_id>/grade/", grade_submission),
    path("student/submissions/", student_submissions),
]
