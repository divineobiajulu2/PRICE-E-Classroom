## ✅ DONE (verified)
- Assessment model: instructor/course made non-nullable, row 6 (real user) preserved, migration applied and verified.
- CourseInstructor migration bookkeeping fixed (fake-applied 0025_courseinstructor_state_sync).
- Assignment/ClassroomMaterial seed data (13 rows) deleted — tables confirmed empty.
- App.tsx: removed /instructor/courses/create and /instructor/courses/:id/edit routes.
- InstructorCourses.tsx: Create/Edit/Delete buttons now admin-only; dead handleViewCourse() removed.
- CreateAssignment.tsx: replaced Stream/Set dropdowns with a Course dropdown; sends `course` field instead of stream/set_number.
- Fixed broken migration dependency chain (core/0021, assessments/0007, assessments/0009 all pointed to deleted files) — repointed all three, showmigrations runs clean 0001-0029.
- Fixed ClassroomMaterial.course field — restored null=True/blank=True and correct related_name='classroom_materials' after accidental corruption.
- Fixed 0021 migration — removed orphaned DeleteModel(name='Material') step.
- Assignment.stream/set_number fully removed from views, serializer, and model. Migration 0026 applied and verified.
- Fixed CourseDetailSerializer.get_content_by_instructor() — simplified to course=obj, fixed published=True → status='published'.
- Fixed available_courses() and my_courses() — both now check for 'general' stream. Verified via search.
- Removed enroll_course()/unenroll_course() views + URL routes — confirmed dead via frontend-wide search.
- Removed EnrollmentSerializer, Enrollment model, and all imports. Migration 0027 applied and verified.
- Removed Course.set/Course.stream (legacy singular fields). Migration 0028 applied and verified.
- Removed Assignment.published field (confirmed dead, status is sole source of truth). Migration 0029 applied and verified.
- Fixed ClassroomMaterialSerializer — added course/instructor/status to fields list.
- Fixed InstructorDashboard.tsx material-posting form — Course dropdown instead of Stream, sends `course` field.
- Fixed createClassroomMaterial() in api.ts — signature updated from study_stream to course.
- Verified classroom_materials() GET view already correctly included 'general' in its stream filter.
- Deleted 3 orphaned files never actually removed from the original FIX document: CreateAssessment.tsx, AssessmentList.tsx, AssessmentSubmissions.tsx.
- Removed 5 dead adminService methods from api.ts (getAssessments, getAssessment, createAssessment, updateAssessment, updateAssessmentStatus).
- Rewrote InternDashboard.tsx completely — removed unscoped Assignments/Classroom Feed sections, window.__ globals, ts-nocheck, broken links. Now shows welcome header, My Courses shortcut, Recent Performance, GPA summary.
- Full audit: listed every .tsx file in pages/ and cross-referenced against every import in App.tsx to find all orphaned files in one pass.
- Deleted 5 more confirmed-orphaned dead files: admin/ApprovalDetail.tsx, instructor/Grading.tsx, intern/Assignments.tsx, intern/Grades.tsx, instructor/Gradebook.tsx.
- Built new pages/instructor/InstructorCourseDetail.tsx — instructor-facing course detail page showing that instructor's own materials, assignments, and grades for a specific course (mirrors the intern-side CourseDetail.tsx/CourseInstructorView.tsx pattern). Reuses the existing content_by_instructor data from CourseDetailSerializer, filtered to the logged-in instructor's own id.
- Wired new routes in App.tsx: /instructor/courses/:id → InstructorCourseDetail, /instructor/courses/:id/assignments/create → CreateAssignment. This closes the gap where CreateAssignment.tsx existed and worked but had no route anywhere — instructors can now actually reach it.
- Verified via terminal search: both imports and both routes present and correctly wired.
- Fixed InstructorCourses.tsx — added missing "Open Course" link (previously had zero way to view a single course; only had dead create/edit navigation targets pointing at deleted routes). Added Link import. Verified via search: "Open Course" text confirmed present in the file.
- Full instructor course flow now verified end-to-end: /instructor/courses (list) → "Open Course" → /instructor/courses/:id (InstructorCourseDetail) → "Create Assignment" → /instructor/courses/:id/assignments/create (CreateAssignment, pre-fixed today to use course dropdown).
- Built new pages/admin/AdminCourseDetail.tsx — replaces the fake video-lesson-player demo (CoursePlayer.tsx) that was wrongly mounted at /admin/courses/:id. New page shows real course info plus content from ALL instructors teaching the course (materials + assignments), reusing the existing content_by_instructor data.
- Deleted pages/intern/CoursePlayer.tsx (confirmed only used at the one wrong admin route before deleting).
- Fixed App.tsx routing after a find-and-replace mishap swapped the intern and admin courses/:id targets — caught via terminal search, corrected: /intern/courses/:id → CourseDetail, /instructor/courses/:id → InstructorCourseDetail, /admin/courses/:id → AdminCourseDetail. Verified all three via terminal search after saving.
- Cleaned up CreateCourse.tsx properly (not just left as dead-but-harmless): removed isAdmin state and every conditional built around it, since this page is now only reachable via /admin/* routes (confirmed via search — instructor routes to it were deleted earlier today). Instructor-assignment UI and logic now unconditional. Also fixed a real bug found while cleaning up: navigate('/instructor/courses') on save success → corrected to navigate('/admin/courses'), since an admin managing courses should land back on the admin course list, not the instructor one. Verified via terminal search: no remaining isAdmin or /instructor/courses references.
- Investigated Course.instructor legacy field usage properly rather than assuming it was dead: found it was genuinely used as a fallback in CourseSerializer.get_instructors()/get_instructor_username() when CourseInstructor had zero entries for a course. Discussed the tradeoff and decided: remove the fallback entirely so an empty instructor list is shown honestly (rather than a possibly-stale fallback name), matching the "no misleading data" principle used throughout today's cleanup.
- Removed the Course.instructor fallback from CourseSerializer.get_instructors() and get_instructor_username().
- Removed the legacy-field sync logic from assign_course_instructors() (was updating course.instructor to "first assigned instructor" on every change — no longer needed since nothing reads it).
- Removed the same sync logic from course_instructor_detail() (DELETE endpoint).
- Removed the now-pointless course.instructor_id check from user_is_course_instructor() — CourseInstructor.objects.filter(...) already does the real, correct authorization check on its own.
- Verified via terminal search across views.py and serializers.py: zero remaining references to course.instructor or course.instructor_id anywhere. CourseInstructor is now the single, sole source of truth for who teaches a course.
- [x] Fixed instructor_dashboard() crash — `Q(course_instructors__in=[request.user])` was comparing CourseInstructor objects against a raw User object (type mismatch), causing a 500 error whenever any instructor or admin loaded their dashboard. Fixed to `Q(course_instructors__instructor=request.user)`. Verified via search that the correct pattern (used in courses() GET, which builds assigned_courses as an actual CourseInstructor queryset first) was not affected — only the one buggy spot existed.
- Added missing "Post Material" functionality to InstructorCourseDetail.tsx — inline toggle form (title, description, file/video upload) inside the Materials section, using the same createClassroomMaterial fix from earlier today. Instructor can now post materials AND create assignments from inside a single course page, matching the "ongoing, not one-time" workflow. Verified via terminal search: state, handler, and API call all present.
- Fixed routing bug: InstructorCourses.tsx "Open Course" link, "Create Course" button, and "Edit" button were all hardcoded to /instructor/... paths regardless of role. Root cause found: isAdmin check compared localStorage's raw role string against lowercase 'admin', but the app stores UserRole.ADMIN as uppercase 'ADMIN' — so isAdmin was ALWAYS false for real admins. Fixed properly using authService.getCurrentUser() + normalizeUserRole() + UserRole.ADMIN (matching the established pattern in AdminDashboard.tsx), then fixed handleCreateCourse()/handleEditCourse()/the Open Course link to branch on isAdmin correctly. Verified via terminal search and live testing.
- Added missing "Post Material" functionality to InstructorCourseDetail.tsx — inline toggle form inside Materials section.
- Fixed instructor_dashboard() 500 crash — Q(course_instructors__in=[request.user]) type mismatch, corrected to Q(course_instructors__instructor=request.user).
- Full admin-vs-teacher permission audit — fixed 4 real bugs where admin accounts (role='teacher' + is_staff=True) were wrongly caught by teacher-only restrictions: course_detail() GET, courses() POST (admin auto-assigning self as instructor), course_detail() PATCH, assignment_detail() GET.
- Removed Course Materials field/state/payload entirely from CreateCourse.tsx — contradicted spec (materials belong to instructors, posted ongoing, not admin-uploaded at course creation).
- Added a Status dropdown (Draft/Published) to CreateCourse.tsx — previously no way to publish a course after creating it.
- Replaced the instructor multi-select (Ctrl+click <select multiple>) with a scrollable checkbox list in CreateCourse.tsx — clearer UX for assigning instructors, shows live selected count.

## 🔧 IN PROGRESS
- [ ] Re-verify the three CreateCourse.tsx fixes above actually render/work correctly in the browser (status dropdown, checkbox list, no material field) — done via code edit, not yet re-tested live.
- [ ] Minor: after switching roles/logging in as a different user without a full logout, the sidebar briefly showed stale role-based nav (instructor layout under an admin session) until a fresh login. Workaround confirmed (logout/login fixes it); root cause not yet investigated — likely stale cached user state somewhere on refresh.

## 📋 KNOWN BUGS FOUND (not yet fixed)
- assign_course_instructors() legacy field note: already resolved earlier (Course.instructor fallback + sync fully removed) — keeping this line as historical record only.

## ⏳ NOT YET CHECKED
- Whether ClassroomMaterial has any stream/set_number-style duplication (initial read suggests no).

## 📁 DEPLOYMENT NOTE (not urgent — do before going live, not now)
- Frontend and backend currently live in different folder depths (frontend/ at project root, backend inside work/backend/). Before deploying, decide on a clean sibling structure and update any deploy scripts/config accordingly. Do NOT attempt this mid-session — risk of breaking every relative import at once. Treat as a dedicated, careful task on its own.
