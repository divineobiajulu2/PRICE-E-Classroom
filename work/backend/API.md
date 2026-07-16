# PRICE Assessment API

# the hosted website URL on render
- https://price-website-backend.onrender.com/

## Auth
- POST /api/register/student/
- POST /api/register/staff/
- POST /api/login/

## Assessments
- POST /api/assessments/create/ (staff only)
- GET /api/assessments/list/

## Submissions
- POST /api/assessments/submit/<id>/
- GET /api/assessments/<id>/submissions/ (staff only)
- POST /api/submission/<id>/grade/ (staff only)
