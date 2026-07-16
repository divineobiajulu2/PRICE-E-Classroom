"""
Regression tests for Course and Grade API endpoints.
Tests RBAC, data validation, and edge cases.
"""
from datetime import timedelta
from decimal import Decimal

from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Course, Grade, User, StaffProfile, StudentProfile, CourseInstructor, Assignment, ClassroomMaterial


class CourseAPITests(TestCase):
    """Tests for course creation, listing, and management endpoints."""
    
    def setUp(self):
        """Set up test users and base data."""
        self.client = APIClient()
        
        # Create instructor
        self.instructor = User.objects.create_user(
            username='instructor1',
            email='instructor@test.com',
            password='testpass123',
        )
        self.instructor.is_active = True
        self.instructor.role = 'teacher'
        self.instructor.save()
        
        StaffProfile.objects.create(
            user=self.instructor,
            ph_code='PH001',
            first_name='Prof',
            last_name='Teacher',
            gender='male',
            date_of_birth='1980-01-01',
            country='Nigeria',
        )
        
        # Create student
        self.student = User.objects.create_user(
            username='student1',
            email='student@test.com',
            password='testpass123',
        )
        self.student.is_active = True
        self.student.role = 'student'
        self.student.save()
        
        StudentProfile.objects.create(
            user=self.student,
            matric_number='AB/20/001',
            first_name='John',
            last_name='Doe',
            gender='male',
            date_of_birth='2000-01-01',
            country='Nigeria',
            state='Lagos',
            study_stream='ict',
            set_number=20,
        )
        
        # Create second instructor for testing ownership
        self.instructor2 = User.objects.create_user(
            username='instructor2',
            email='instructor2@test.com',
            password='testpass123',
        )
        self.instructor2.is_active = True
        self.instructor2.role = 'teacher'
        self.instructor2.save()
        
        StaffProfile.objects.create(
            user=self.instructor2,
            ph_code='PH002',
            first_name='Dr',
            last_name='Smith',
            gender='female',
            date_of_birth='1985-01-01',
            country='Nigeria',
        )
        
        # Create admin user
        self.admin = User.objects.create_user(
            username='admin1',
            email='admin@test.com',
            password='testpass123',
        )
        self.admin.is_active = True
        self.admin.is_staff = True
        self.admin.role = 'admin'
        self.admin.save()

    def test_instructor_can_create_course(self):
        """Test that instructors can create courses."""
        self.client.force_authenticate(user=self.instructor)
        course_data = {
            'title': 'Advanced Python',
            'description': 'Learn advanced Python concepts',
            'category': 'Programming',
            'level': 'Advanced',
            'thumbnail': 'https://example.com/image.jpg',
            'status': 'Draft',
            'modules': [],
        }
        
        response = self.client.post('/api/admin/courses/', course_data, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Course.objects.filter(title='Advanced Python').exists())
        course = Course.objects.get(title='Advanced Python')
        self.assertEqual(course.instructor, self.instructor)

    def test_assignment_and_classroom_material_delete_are_protected_by_course_and_instructor(self):
        """Assignments and classroom materials should be protected when their course or instructor is removed."""
        course = Course.objects.create(
            title='Protected Content Course',
            description='Course with protected content',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Published',
            modules=[],
        )
        assignment = Assignment.objects.create(
            title='Protected assignment',
            description='Protected assignment',
            instructor=self.instructor,
            course=course,
            stream='ict',
            set_number=20,
            due_date=timezone.now() + timedelta(days=1),
            assignment_type='STANDARD',
            published=True,
            status='published',
        )
        material = ClassroomMaterial.objects.create(
            title='Protected material',
            description='Protected material',
            course=course,
            instructor=self.instructor,
            created_by=self.instructor,
            status='published',
        )

        self.assertEqual(assignment.status, 'published')
        self.assertEqual(material.status, 'published')

        with self.assertRaises(ProtectedError):
            course.delete()

        with self.assertRaises(ProtectedError):
            self.instructor.delete()

        self.assertTrue(Assignment.objects.filter(pk=assignment.pk).exists())
        self.assertTrue(ClassroomMaterial.objects.filter(pk=material.pk).exists())

    def test_instructors_cannot_delete_courses(self):
        """Only admins should be able to delete courses."""
        course = Course.objects.create(
            title='Protected Course',
            description='Instructor cannot delete',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Published',
            modules=[],
        )
        CourseInstructor.objects.create(course=course, instructor=self.instructor, assigned_by=self.admin)
        course.instructor = self.instructor
        course.save(update_fields=['instructor'])

        self.client.force_authenticate(user=self.instructor)
        response = self.client.delete(f'/api/admin/courses/{course.id}/')

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Course.objects.filter(pk=course.pk).exists())

    def test_student_cannot_create_course(self):
        """Test that students cannot create courses."""
        self.client.force_authenticate(user=self.student)
        course_data = {
            'title': 'Unauthorized Course',
            'description': 'Should fail',
            'category': 'Programming',
            'level': 'Beginner',
            'thumbnail': '',
            'status': 'Draft',
            'modules': [],
        }
        
        response = self.client.post('/api/admin/courses/', course_data, format='json')
        
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Course.objects.filter(title='Unauthorized Course').exists())

    def test_unauthenticated_cannot_create_course(self):
        """Test that unauthenticated users cannot create courses."""
        course_data = {
            'title': 'Unauthenticated Course',
            'description': 'Should fail',
            'category': 'Programming',
            'level': 'Beginner',
            'thumbnail': '',
            'status': 'Draft',
            'modules': [],
        }
        
        response = self.client.post('/api/admin/courses/', course_data, format='json')
        
        self.assertEqual(response.status_code, 401)
        self.assertFalse(Course.objects.filter(title='Unauthenticated Course').exists())

    def test_get_courses_lists_all_published_courses(self):
        """Test that GET /api/admin/courses/ returns published courses for students."""
        # Create courses
        Course.objects.create(
            title='Published Course',
            description='Visible',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Published',
            modules=[],
        )
        Course.objects.create(
            title='Draft Course',
            description='Hidden from students',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Draft',
            modules=[],
        )
        
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/admin/courses/')
        
        self.assertEqual(response.status_code, 200)
        courses = response.json()
        titles = [c['title'] for c in courses]
        self.assertIn('Published Course', titles)
        self.assertNotIn('Draft Course', titles)

    def test_instructor_sees_own_courses_when_listing(self):
        """Test that instructors see only their own courses when listing."""
        Course.objects.create(
            title='My Draft Course',
            description='My draft',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Draft',
            modules=[],
        )
        Course.objects.create(
            title='Other Published Course',
            description='Not mine',
            category='Programming',
            level='Beginner',
            instructor=self.instructor2,
            status='Published',
            modules=[],
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get('/api/admin/courses/')
        
        self.assertEqual(response.status_code, 200)
        courses = response.json()
        titles = [c['title'] for c in courses]
        # Instructors only see their own courses, not other instructors' courses
        self.assertIn('My Draft Course', titles)
        self.assertNotIn('Other Published Course', titles)

    def test_admin_can_assign_course_instructors(self):
        course = Course.objects.create(
            title='Assignable Course',
            description='Admin assigns instructors',
            category='Programming',
            level='Intermediate',
            instructor=self.instructor,
            status='Published',
            modules=[],
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/admin/courses/{course.id}/instructors/',
            {'instructor_ids': [self.instructor2.id]},
            format='json'
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('instructors', data)
        self.assertEqual(len(data['instructors']), 1)
        self.assertEqual(data['instructors'][0]['id'], self.instructor2.id)
        self.assertTrue(CourseInstructor.objects.filter(course=course, instructor=self.instructor2).exists())
        course.refresh_from_db()
        self.assertEqual(course.instructor_id, self.instructor2.id)

    def test_admin_can_remove_course_instructor(self):
        course = Course.objects.create(
            title='Unassignable Course',
            description='Admin removes instructors',
            category='Programming',
            level='Intermediate',
            instructor=self.instructor,
            status='Published',
            modules=[],
        )
        CourseInstructor.objects.create(course=course, instructor=self.instructor, assigned_by=self.admin)
        CourseInstructor.objects.create(course=course, instructor=self.instructor2, assigned_by=self.admin)
        course.instructor = self.instructor
        course.save(update_fields=['instructor'])

        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/admin/courses/{course.id}/instructors/{self.instructor.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(CourseInstructor.objects.filter(course=course, instructor=self.instructor).exists())
        course.refresh_from_db()
        self.assertEqual(course.instructor_id, self.instructor2.id)

    def test_student_can_view_course_instructors_for_published_course(self):
        course = Course.objects.create(
            title='Student Visible Course',
            description='Published course for student',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Published',
            modules=[],
        )
        CourseInstructor.objects.create(course=course, instructor=self.instructor, assigned_by=self.admin)

        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/courses/{course.id}/instructors/')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('instructors', data)
        self.assertEqual(len(data['instructors']), 1)
        self.assertEqual(data['instructors'][0]['id'], self.instructor.id)

    def test_student_cannot_view_course_instructors_for_draft_course(self):
        course = Course.objects.create(
            title='Hidden Course',
            description='Draft course hidden from students',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Draft',
            modules=[],
        )
        CourseInstructor.objects.create(course=course, instructor=self.instructor, assigned_by=self.admin)

        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/courses/{course.id}/instructors/')

        self.assertEqual(response.status_code, 403)

    def test_student_can_view_published_course_detail(self):
        course = Course.objects.create(
            title='Course Details Visible',
            description='Published course details',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Published',
            modules=[],
        )

        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/courses/{course.id}/')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['title'], 'Course Details Visible')
        self.assertEqual(data['status'], 'Published')

    def test_instructor_can_update_own_course(self):
        """Test that instructors can update their own courses."""
        course = Course.objects.create(
            title='Original Title',
            description='Original description',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Draft',
            modules=[],
        )
        
        self.client.force_authenticate(user=self.instructor)
        update_data = {
            'title': 'Updated Title',
            'description': 'Updated description',
            'category': 'Programming',
            'level': 'Advanced',
        }
        response = self.client.patch(f'/api/admin/courses/{course.id}/', update_data, format='json')
        
        self.assertEqual(response.status_code, 200)
        course.refresh_from_db()
        self.assertEqual(course.title, 'Updated Title')
        self.assertEqual(course.description, 'Updated description')

    def test_instructor_cannot_update_others_course(self):
        """Test that instructors cannot update courses they don't own."""
        course = Course.objects.create(
            title='Original Title',
            description='Original description',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Draft',
            modules=[],
        )
        
        self.client.force_authenticate(user=self.instructor2)
        update_data = {'title': 'Hacked Title'}
        response = self.client.patch(f'/api/admin/courses/{course.id}/', update_data, format='json')
        
        self.assertEqual(response.status_code, 403)
        course.refresh_from_db()
        self.assertEqual(course.title, 'Original Title')

    def test_instructor_can_delete_own_course(self):
        """Test that instructors can delete their own courses."""
        course = Course.objects.create(
            title='Deletable Course',
            description='To be deleted',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Draft',
            modules=[],
        )
        course_id = course.id
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.delete(f'/api/admin/courses/{course_id}/')
        
        self.assertEqual(response.status_code, 200)  # API returns 200 with message, not 204
        self.assertFalse(Course.objects.filter(id=course_id).exists())

    def test_instructor_cannot_delete_others_course(self):
        """Test that instructors cannot delete courses they don't own."""
        course = Course.objects.create(
            title='Protected Course',
            description='Cannot delete',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Draft',
            modules=[],
        )
        
        self.client.force_authenticate(user=self.instructor2)
        response = self.client.delete(f'/api/admin/courses/{course.id}/')
        
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Course.objects.filter(id=course.id).exists())


class GradeAPITests(TestCase):
    """Tests for grade creation, listing, and management endpoints."""
    
    def setUp(self):
        """Set up test users and courses."""
        self.client = APIClient()
        
        # Create instructor
        self.instructor = User.objects.create_user(
            username='teacher1',
            email='teacher@test.com',
            password='testpass123',
        )
        self.instructor.is_active = True
        self.instructor.role = 'teacher'
        self.instructor.save()
        
        StaffProfile.objects.create(
            user=self.instructor,
            ph_code='PH001',
            first_name='Prof',
            last_name='Teacher',
            gender='male',
            date_of_birth='1980-01-01',
            country='Nigeria',
        )
        
        # Create student
        self.student = User.objects.create_user(
            username='student1',
            email='student@test.com',
            password='testpass123',
        )
        self.student.is_active = True
        self.student.role = 'student'
        self.student.save()
        
        StudentProfile.objects.create(
            user=self.student,
            matric_number='AB/20/001',
            first_name='John',
            last_name='Doe',
            gender='male',
            date_of_birth='2000-01-01',
            country='Nigeria',
            state='Lagos',
            study_stream='ict',
            set_number=20,
        )
        
        # Create course
        self.course = Course.objects.create(
            title='Test Course',
            description='For testing grades',
            category='Programming',
            level='Beginner',
            instructor=self.instructor,
            status='Published',
            modules=[],
        )

    def test_instructor_can_create_grade(self):
        """Test that instructors can create grades for their courses."""
        self.client.force_authenticate(user=self.instructor)
        grade_data = {
            'student_id': self.student.id,
            'score': Decimal('85.50'),
            'title': 'Midterm Exam',
            'feedback': 'Good performance',
        }
        
        response = self.client.post(f'/api/admin/courses/{self.course.id}/grades/', grade_data, format='json')
        
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Grade.objects.filter(
            course=self.course,
            student=self.student,
            title='Midterm Exam'
        ).exists())

    def test_grade_requires_student_id(self):
        """Test that grade creation fails without student_id."""
        self.client.force_authenticate(user=self.instructor)
        grade_data = {
            'score': Decimal('85.50'),
            'title': 'Midterm Exam',
            'feedback': 'Good performance',
        }
        
        response = self.client.post(f'/api/admin/courses/{self.course.id}/grades/', grade_data, format='json')
        
        self.assertEqual(response.status_code, 400)

    def test_grade_requires_score(self):
        """Test that grade creation fails without score."""
        self.client.force_authenticate(user=self.instructor)
        grade_data = {
            'student_id': self.student.id,
            'title': 'Midterm Exam',
            'feedback': 'Good performance',
        }
        
        response = self.client.post(f'/api/admin/courses/{self.course.id}/grades/', grade_data, format='json')
        
        self.assertEqual(response.status_code, 400)

    def test_student_cannot_create_grade(self):
        """Test that students cannot create grades."""
        self.client.force_authenticate(user=self.student)
        grade_data = {
            'student_id': self.student.id,
            'score': Decimal('100.00'),
            'title': 'Self Grade',
            'feedback': 'Perfect!',
        }
        
        response = self.client.post(f'/api/admin/courses/{self.course.id}/grades/', grade_data, format='json')
        
        self.assertEqual(response.status_code, 403)

    def test_get_course_grades_lists_for_instructor(self):
        """Test that instructors can fetch grades for their courses."""
        # Create grades
        Grade.objects.create(
            course=self.course,
            student=self.student,
            graded_by=self.instructor,
            title='Quiz 1',
            score=Decimal('90.00'),
            feedback='Excellent',
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/admin/courses/{self.course.id}/grades/')
        
        self.assertEqual(response.status_code, 200)
        grades = response.json()
        self.assertEqual(len(grades), 1)
        self.assertEqual(grades[0]['title'], 'Quiz 1')
        self.assertEqual(grades[0]['student_username'], self.student.username)

    def test_student_cannot_see_all_grades(self):
        """Test that students cannot see all course grades."""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/admin/courses/{self.course.id}/grades/')
        
        # Should either return 403 or empty list (depends on implementation)
        self.assertIn(response.status_code, [403, 200])
        if response.status_code == 200:
            # If it returns 200, it should be empty or filtered
            grades = response.json()
            self.assertEqual(len(grades), 0)

    def test_grade_with_large_score(self):
        """Test that grades accept realistic score values."""
        self.client.force_authenticate(user=self.instructor)
        grade_data = {
            'student_id': self.student.id,
            'score': Decimal('99.99'),
            'title': 'Final Project',
            'feedback': 'Outstanding work',
        }
        
        response = self.client.post(f'/api/admin/courses/{self.course.id}/grades/', grade_data, format='json')
        
        self.assertEqual(response.status_code, 201)
        grade = Grade.objects.get(title='Final Project')
        self.assertEqual(grade.score, Decimal('99.99'))

    def test_update_grade_overwrites_existing(self):
        """Test that POSTing a grade for the same student/title updates it."""
        # Create initial grade
        Grade.objects.create(
            course=self.course,
            student=self.student,
            graded_by=self.instructor,
            title='Assignment 1',
            score=Decimal('75.00'),
            feedback='Needs improvement',
        )
        
        # Update via POST
        self.client.force_authenticate(user=self.instructor)
        grade_data = {
            'student_id': self.student.id,
            'score': Decimal('88.00'),
            'title': 'Assignment 1',
            'feedback': 'Much better!',
        }
        
        response = self.client.post(f'/api/admin/courses/{self.course.id}/grades/', grade_data, format='json')
        
        # When updating an existing grade, response should be 200 (updated), not 201 (created)
        self.assertEqual(response.status_code, 200)
        grade = Grade.objects.get(course=self.course, student=self.student, title='Assignment 1')
        self.assertEqual(grade.score, Decimal('88.00'))
        self.assertEqual(grade.feedback, 'Much better!')
        # Should only have 1 grade with this title for this student
        self.assertEqual(Grade.objects.filter(
            course=self.course,
            student=self.student,
            title='Assignment 1'
        ).count(), 1)
