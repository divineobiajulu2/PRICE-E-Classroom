from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Assignment, ClassroomMaterial, Notification, StaffProfile, StudentProfile, Submission, User
from .serializers import StudentRegistrationSerializer
from .views import derive_set_number_from_matric


class ClassroomMaterialAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.instructor = User.objects.create_user(
            username='teacher1',
            email='teacher@example.com',
            password='secret123',
            role='teacher',
            is_active=True,
        )
        self.instructor.is_active = True
        self.instructor.save(update_fields=['is_active'])
        StaffProfile.objects.create(
            user=self.instructor,
            ph_code='PH001',
            first_name='Ada',
            last_name='Lovelace',
            gender='female',
            date_of_birth='1990-01-01',
            country='Nigeria',
        )

        self.student = User.objects.create_user(
            username='student1',
            email='student@example.com',
            password='secret123',
            role='student',
            is_active=True,
        )
        self.student.is_active = True
        self.student.save(update_fields=['is_active'])
        StudentProfile.objects.create(
            user=self.student,
            matric_number='AB/20',
            first_name='Ben',
            last_name='Ayo',
            gender='male',
            date_of_birth='2000-01-01',
            country='Nigeria',
            state='Lagos',
            study_stream='ict',
            set_number=1,
        )

        self.material = ClassroomMaterial.objects.create(
            title='Week 1 Notes',
            description='Introductory lesson',
            study_stream='ict',
            created_by=self.instructor,
        )

    def test_student_sees_only_their_stream_materials(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/classroom/materials/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]['title'], 'Week 1 Notes')

    def test_instructor_can_create_material_for_a_stream(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post('/api/classroom/materials/', {
            'title': 'New Lesson',
            'description': 'Hands-on lab',
            'study_stream': 'ict',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(ClassroomMaterial.objects.filter(title='New Lesson').exists())
        self.assertTrue(Notification.objects.filter(recipient=self.student).exists())

    def test_instructor_can_upload_material_attachment(self):
        self.client.force_authenticate(user=self.instructor)
        uploaded_file = SimpleUploadedFile(
            'lesson-notes.pdf',
            b'%PDF-1.4 test content',
            content_type='application/pdf',
        )

        response = self.client.post('/api/classroom/materials/', {
            'title': 'Lecture Handout',
            'description': 'Attachment for the lesson',
            'study_stream': 'ict',
            'file_attachment': uploaded_file,
        }, format='multipart')

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload['file_attachment_url'])
        self.assertTrue(ClassroomMaterial.objects.filter(title='Lecture Handout').exists())

    def test_assignment_requires_due_date(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post('/api/assignments/', {
            'title': 'Phase 3 Task',
            'description': 'Publish to a specific set',
            'stream': 'ict',
            'set_number': 5,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Assignment.objects.filter(title='Phase 3 Task').exists())


class TestStudentRegistrationAndAssignmentSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student = User.objects.create_user(
            username='student-secure',
            email='student-secure@example.com',
            password='secret123',
            role='student',
            is_active=True,
        )
        self.student.is_active = True
        self.student.save(update_fields=['is_active'])
        StudentProfile.objects.create(
            user=self.student,
            matric_number='AB/20/123',
            first_name='Secure',
            last_name='Student',
            gender='male',
            date_of_birth='2000-01-01',
            country='Nigeria',
            state='Lagos',
            study_stream='ict',
            set_number=3,
        )

    def test_student_registration_serializer_normalizes_lowercase_matric(self):
        serializer = StudentRegistrationSerializer(data={
            'matric_number': 'ab/12/345',
            'email': 'lowercase@example.com',
            'password': 'Password123!',
            'first_name': 'Lower',
            'last_name': 'Case',
            'gender': 'male',
            'date_of_birth': '2001-01-01',
            'country': 'Nigeria',
            'state': 'Lagos',
            'study_stream': 'ict',
            'set_number': 1,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['matric_number'], 'AB/12/345')

    def test_set_number_is_derived_from_the_middle_matric_segment(self):
        self.assertEqual(derive_set_number_from_matric('PC/06/615'), 6)
        self.assertEqual(derive_set_number_from_matric('AB/20/123'), 20)

    def test_submission_is_rejected_after_deadline(self):
        assignment = Assignment.objects.create(
            title='Past Assignment',
            description='Too late',
            instructor=self.student,
            stream='ict',
            set_number=3,
            due_date='2000-01-01T00:00:00Z',
            assignment_type='STANDARD',
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/assignments/submissions/', {
            'assignment': assignment.id,
            'submission_text': 'late submission',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'Deadline passed')

    def test_student_only_sees_assignments_for_their_stream_and_set(self):
        Assignment.objects.create(
            title='Matching Assignment',
            description='Visible',
            instructor=self.student,
            stream='ict',
            set_number=3,
            due_date='2100-01-01T00:00:00Z',
            assignment_type='STANDARD',
        )
        Assignment.objects.create(
            title='Other Stream Assignment',
            description='Hidden',
            instructor=self.student,
            stream='mechatronics',
            set_number=3,
            due_date='2100-01-01T00:00:00Z',
            assignment_type='STANDARD',
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/assignments/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]['title'], 'Matching Assignment')

    def test_draft_submission_does_not_count_as_submitted(self):
        assignment = Assignment.objects.create(
            title='Draft Assignment',
            description='Draft early save',
            instructor=self.student,
            stream='ict',
            set_number=3,
            due_date='2100-01-01T00:00:00Z',
            assignment_type='STANDARD',
        )

        Submission.objects.create(
            assignment=assignment,
            intern=self.student,
            submission_text='draft answer',
            is_draft=True,
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/assignments/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertFalse(payload[0]['has_submitted'])

    def test_student_can_save_draft_submission(self):
        assignment = Assignment.objects.create(
            title='Draft Save Assignment',
            description='Save draft',
            instructor=self.student,
            stream='ict',
            set_number=3,
            due_date='2100-01-01T00:00:00Z',
            assignment_type='STANDARD',
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/assignments/submissions/draft/', {
            'assignment': assignment.id,
            'submission_text': 'This is a draft.',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload['is_draft'])
        self.assertIsNone(payload['submitted_at'])
        self.assertEqual(payload['submission_text'], 'This is a draft.')

        draft_submission = Submission.objects.get(assignment=assignment, intern=self.student)
        self.assertTrue(draft_submission.is_draft)
        self.assertIsNone(draft_submission.submitted_at)

    def test_final_submission_converts_existing_draft(self):
        assignment = Assignment.objects.create(
            title='Finalize Draft Assignment',
            description='Finalize draft',
            instructor=self.student,
            stream='ict',
            set_number=3,
            due_date='2100-01-01T00:00:00Z',
            assignment_type='STANDARD',
        )

        Submission.objects.create(
            assignment=assignment,
            intern=self.student,
            submission_text='Draft answer',
            is_draft=True,
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/assignments/submissions/', {
            'assignment': assignment.id,
            'submission_text': 'Final answer',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertFalse(payload['is_draft'])
        self.assertIsNotNone(payload['submitted_at'])
        self.assertEqual(payload['submission_text'], 'Final answer')

        submission = Submission.objects.get(assignment=assignment, intern=self.student)
        self.assertFalse(submission.is_draft)
        self.assertIsNotNone(submission.submitted_at)

    def test_duplicate_final_submission_is_prevented(self):
        assignment = Assignment.objects.create(
            title='Duplicate Final Assignment',
            description='Duplicate prevent',
            instructor=self.student,
            stream='ict',
            set_number=3,
            due_date='2100-01-01T00:00:00Z',
            assignment_type='STANDARD',
        )

        Submission.objects.create(
            assignment=assignment,
            intern=self.student,
            submission_text='Final answer',
            is_draft=False,
            submitted_at='2025-01-01T00:00:00Z',
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/assignments/submissions/', {
            'assignment': assignment.id,
            'submission_text': 'Another final answer',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'You have already submitted this assignment. Only one submission per assignment is allowed.')

    def test_draft_endpoint_rejects_non_interns(self):
        instructor = User.objects.create_user(
            username='teacher2',
            email='teacher2@example.com',
            password='secret123',
            role='teacher',
            is_active=True,
        )
        instructor.is_active = True
        instructor.save(update_fields=['is_active'])
        StaffProfile.objects.create(
            user=instructor,
            ph_code='PH002',
            first_name='Grace',
            last_name='Hopper',
            gender='female',
            date_of_birth='1990-01-01',
            country='Nigeria',
        )

        assignment = Assignment.objects.create(
            title='Non-intern draft test',
            description='Should fail',
            instructor=self.student,
            stream='ict',
            set_number=3,
            due_date='2100-01-01T00:00:00Z',
            assignment_type='STANDARD',
        )

        self.client.force_authenticate(user=instructor)
        response = self.client.post('/api/assignments/submissions/draft/', {
            'assignment': assignment.id,
            'submission_text': 'Teacher draft attempt',
        }, format='json')

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['error'], 'Only interns can save drafts.')
