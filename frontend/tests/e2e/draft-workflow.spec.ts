import { test, expect } from '@playwright/test';

const BACKEND_BASE_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const ADMIN_USERNAME = 'admin1';
const ADMIN_PASSWORD = 'password123';
const STUDENT_PASSWORD = 'Password123!';
const INSTRUCTOR_PASSWORD = 'Password123!';

async function adminLogin(request: any) {
  const response = await request.post(`${BACKEND_BASE_URL}/api/login/`, {
    data: JSON.stringify({ identifier: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok()) {
    const text = await response.text();
    console.error(`Admin login failed: ${response.status()} - ${text}`);
    throw new Error(`Admin login failed: ${response.status()} - ${text}`);
  }
  const body = await response.json();
  return body;
}

async function approvePendingUsers(request: any, emailPattern: string) {
  const auth = await adminLogin(request);
  const token = auth.tokens?.access;
  if (!token) {
    throw new Error('Admin login did not return an access token');
  }

  const pendingRes = await request.get(`${BACKEND_BASE_URL}/api/admin/pending-users/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!pendingRes.ok()) {
    const text = await pendingRes.text();
    throw new Error(`Fetch pending users failed: ${pendingRes.status()} - ${text}`);
  }

  const pendingBody = await pendingRes.json();
  const users = Array.isArray(pendingBody.users) ? pendingBody.users : [];
  const toApprove = users.filter((user: any) => String(user.email || '').includes(emailPattern));

  for (const user of toApprove) {
    const approveRes = await request.post(`${BACKEND_BASE_URL}/api/admin/approve/${user.id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!approveRes.ok()) {
      const text = await approveRes.text();
      console.warn(`Approve user ${user.id} failed: ${approveRes.status()} - ${text}`);
    }
  }
}

async function registerInstructor(request: any, email: string, ph_code: string) {
  const response = await request.post(`${BACKEND_BASE_URL}/api/register/staff/`, {
    data: JSON.stringify({
      ph_code,
      email,
      password: INSTRUCTOR_PASSWORD,
      first_name: 'Instructor',
      last_name: 'User',
      gender: 'male',
      date_of_birth: '1985-01-01',
      country: 'Nigeria',
    }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok()) {
    const text = await response.text();
    console.error(`Instructor registration failed: ${response.status()} - ${text}`);
    throw new Error(`Instructor registration failed: ${response.status()} - ${text}`);
  }
  return response.json();
}

async function registerStudent(request: any, email: string, matric: string) {
  const response = await request.post(`${BACKEND_BASE_URL}/api/register/student/`, {
    data: JSON.stringify({
      matric_number: matric,
      email,
      password: STUDENT_PASSWORD,
      first_name: 'Student',
      last_name: 'User',
      gender: 'female',
      date_of_birth: '2003-01-01',
      country: 'Nigeria',
      state: 'Lagos',
      study_stream: 'ict',
      set_number: '1',
      admission_year: '2023',
    }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok()) {
    const text = await response.text();
    console.error(`Student registration failed: ${response.status()} - ${text}`);
    throw new Error(`Student registration failed: ${response.status()} - ${text}`);
  }
  return response.json();
}

async function createAssignment(request: any, token: string, payload: any) {
  const response = await request.post(`${BACKEND_BASE_URL}/api/assignments/`, {
    data: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok()) {
    const text = await response.text();
    console.error(`Assignment creation failed: ${response.status()} - ${text}`);
    throw new Error(`Assignment creation failed: ${response.status()} - ${text}`);
  }
  return response.json();
}

async function loginAsInstructor(request: any, email: string) {
  const response = await request.post(`${BACKEND_BASE_URL}/api/login/`, {
    data: JSON.stringify({ identifier: email, password: INSTRUCTOR_PASSWORD }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok()) {
    const text = await response.text();
    console.error(`Login failed: ${response.status()} - ${text}`);
    throw new Error(`Login failed: ${response.status()} - ${text}`);
  }
  const body = await response.json();
  if (!body.tokens?.access) {
    throw new Error('No access token in response');
  }
  return body.tokens.access;
}

test.describe('Intern draft workflow', () => {
  test('should save and restore a draft for a standard assignment', async ({ page, request }) => {
    const ts = Date.now();
    const instructorEmail = `draft-instructor-${ts}@example.com`;
    const studentEmail = `draft-student-${ts}@example.com`;
    const studentMatric = `PC/99/${Math.floor(100 + Math.random() * 900)}`;
    const instructorCode = `PH${ts}`;

    // Register instructor and student
    await registerInstructor(request, instructorEmail, instructorCode);
    await registerStudent(request, studentEmail, studentMatric);

    // Approve the instructor
    await approvePendingUsers(request, instructorEmail);

    // Login as instructor and create assignment
    const instructorToken = await loginAsInstructor(request, instructorEmail);

    const futureDate = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const assignmentTitle = `Draft Workflow Test Assignment ${ts}`;

    const assignment = await createAssignment(request, instructorToken, {
      title: assignmentTitle,
      description: 'This assignment is used for draft workflow validation.',
      stream: 'ict',
      set_number: 1,
      due_date: futureDate,
      assignment_type: 'STANDARD',
    });

    const draftText = `This is a saved draft at ${new Date().toISOString()}`;

    await page.goto('/#/login');
    await page.getByPlaceholder('Enter your Email, Staff Code, or Matric Number').fill(studentEmail);
    await page.getByPlaceholder('••••••••').fill(STUDENT_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL('**/#/intern/**', { waitUntil: 'domcontentloaded' });

    await page.goto('/#/intern/assignments');
    const card = page.locator('div', { hasText: assignmentTitle }).first();
    await expect(card).toBeVisible({ timeout: 15000 });

    await card.getByRole('button', { name: /Submit Work/i }).click();
    const responseField = page.getByPlaceholder('Enter your response or notes for this assignment...');
    await expect(responseField).toBeVisible();
    await responseField.fill(draftText);

    await page.getByRole('button', { name: /Save Draft/i }).click();
    await expect(page.getByText(/Draft saved successfully/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Cancel/i }).click();
    await card.getByRole('button', { name: /Submit Work/i }).click();
    await expect(responseField).toHaveValue(draftText);

    await page.getByRole('button', { name: /Submit Assignment/i }).click();
    await page.getByRole('button', { name: /Submit/i }).click();
    await expect(page.getByText(/Submission sent successfully/i)).toBeVisible({ timeout: 10000 });

    await expect(card.getByRole('button', { name: /Submitted/i })).toBeVisible({ timeout: 10000 });

    const storedDraft = await page.evaluate((assignmentId) => localStorage.getItem(`assignment-draft-${assignmentId}`), assignment.id);
    expect(storedDraft).toBeNull();
  });

  test('should save and restore a draft for a quiz assignment', async ({ page, request }) => {
    const ts = Date.now();
    const instructorEmail = `draft-quiz-instructor-${ts}@example.com`;
    const studentEmail = `draft-quiz-student-${ts}@example.com`;
    const studentMatric = `PC/99/${Math.floor(100 + Math.random() * 900)}`;
    const instructorCode = `PH${ts}01`;

    await registerInstructor(request, instructorEmail, instructorCode);
    await registerStudent(request, studentEmail, studentMatric);
    await approvePendingUsers(request, instructorEmail);

    const instructorToken = await loginAsInstructor(request, instructorEmail);

    const futureDate = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const quizTitle = `Draft Quiz Test ${ts}`;

    const assignment = await createAssignment(request, instructorToken, {
      title: quizTitle,
      description: 'This quiz is used for draft workflow validation.',
      stream: 'ict',
      set_number: 1,
      due_date: futureDate,
      assignment_type: 'QUIZ',
      questions: [
        {
          question_text: 'What is 2 + 2?',
          question_type: 'MULTIPLE_CHOICE',
          options: [
            { option_text: '3', is_correct: false },
            { option_text: '4', is_correct: true },
            { option_text: '5', is_correct: false },
          ],
        },
        {
          question_text: 'What is the capital of France?',
          question_type: 'SHORT_ANSWER',
        },
      ],
    });

    await page.goto('/#/login');
    await page.getByPlaceholder('Enter your Email, Staff Code, or Matric Number').fill(studentEmail);
    await page.getByPlaceholder('••••••••').fill(STUDENT_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL('**/#/intern/**', { waitUntil: 'domcontentloaded' });

    await page.goto('/#/intern/assignments');
    const card = page.locator('div', { hasText: quizTitle }).first();
    await expect(card).toBeVisible({ timeout: 15000 });

    await card.getByRole('button', { name: /Submit Work/i }).click();
    await page.waitForURL('**/#/intern/assignments/**', { waitUntil: 'domcontentloaded' });

    const quizContent = page.locator('div').filter({ has: page.locator('text=/Question 1/') });
    await expect(quizContent).toBeVisible({ timeout: 10000 });

    // Select first question answer
    const option4 = page.locator('button:has-text("4")').first();
    await option4.click();

    // Move to second question and answer
    const nextBtn = page.getByRole('button', { name: /Next|Forward/i }).first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }

    const shortAnswerField = page.locator('input[placeholder*="answer"], textarea').first();
    if (await shortAnswerField.isVisible()) {
      await shortAnswerField.fill('Paris');
    }

    // Save draft
    const reviewBtn = page.getByRole('button', { name: /Review|Review Submission/i }).first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
    }

    const saveDraftBtn = page.getByRole('button', { name: /Save Draft/i });
    if (await saveDraftBtn.isVisible()) {
      await saveDraftBtn.click();
      await expect(page.getByText(/Draft saved|saved successfully/i)).toBeVisible({ timeout: 10000 });
    }

    // Cancel and reopen quiz
    await page.getByRole('button', { name: /Cancel|Close/i }).click();
    await page.goto('/#/intern/assignments');
    await card.getByRole('button', { name: /Submit Work/i }).click();
    await page.waitForURL('**/#/intern/assignments/**', { waitUntil: 'domcontentloaded' });

    // Verify first question answer was restored
    const restoredOption = page.locator('button:has-text("4")').first();
    await expect(restoredOption).toHaveClass(/selected|active|checked/i);

    // Submit quiz
    const submitBtn = page.getByRole('button', { name: /Submit Quiz|Submit|Finish/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /Submit|Confirm/i }).nth(1);
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }

    await expect(page.getByText(/submitted|thank you/i)).toBeVisible({ timeout: 10000 });
  });

  test('should persist draft across page reloads', async ({ page, request }) => {
    const ts = Date.now();
    const instructorEmail = `draft-reload-instructor-${ts}@example.com`;
    const studentEmail = `draft-reload-student-${ts}@example.com`;
    const studentMatric = `PC/99/${Math.floor(100 + Math.random() * 900)}`;
    const instructorCode = `PH${ts}02`;

    await registerInstructor(request, instructorEmail, instructorCode);
    await registerStudent(request, studentEmail, studentMatric);
    await approvePendingUsers(request, instructorEmail);

    const instructorToken = await loginAsInstructor(request, instructorEmail);

    const futureDate = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const assignmentTitle = `Draft Persistence Test ${ts}`;

    const assignment = await createAssignment(request, instructorToken, {
      title: assignmentTitle,
      description: 'This assignment tests draft persistence across reloads.',
      stream: 'ict',
      set_number: 1,
      due_date: futureDate,
      assignment_type: 'STANDARD',
    });

    const draftText1 = `First draft version at ${new Date().toISOString()}`;
    const draftText2 = `Updated draft version at ${new Date().toISOString()}`;

    await page.goto('/#/login');
    await page.getByPlaceholder('Enter your Email, Staff Code, or Matric Number').fill(studentEmail);
    await page.getByPlaceholder('••••••••').fill(STUDENT_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL('**/#/intern/**', { waitUntil: 'domcontentloaded' });

    await page.goto('/#/intern/assignments');
    const card = page.locator('div', { hasText: assignmentTitle }).first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // First draft save
    await card.getByRole('button', { name: /Submit Work/i }).click();
    const responseField = page.getByPlaceholder('Enter your response or notes for this assignment...');
    await expect(responseField).toBeVisible();
    await responseField.fill(draftText1);
    await page.getByRole('button', { name: /Save Draft/i }).click();
    await expect(page.getByText(/Draft saved successfully/i)).toBeVisible({ timeout: 10000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Reopen assignment and verify draft persists
    await page.goto('/#/intern/assignments');
    await card.getByRole('button', { name: /Submit Work/i }).click();
    const reloadedField = page.getByPlaceholder('Enter your response or notes for this assignment...');
    await expect(reloadedField).toHaveValue(draftText1);

    // Update draft
    await reloadedField.clear();
    await reloadedField.fill(draftText2);
    await page.getByRole('button', { name: /Save Draft/i }).click();
    await expect(page.getByText(/Draft saved successfully/i)).toBeVisible({ timeout: 10000 });

    // Reload again
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify updated draft persists
    await page.goto('/#/intern/assignments');
    await card.getByRole('button', { name: /Submit Work/i }).click();
    const finalField = page.getByPlaceholder('Enter your response or notes for this assignment...');
    await expect(finalField).toHaveValue(draftText2);
  });

  test('should clear draft from localStorage after final submission', async ({ page, request }) => {
    const ts = Date.now();
    const instructorEmail = `draft-clear-instructor-${ts}@example.com`;
    const studentEmail = `draft-clear-student-${ts}@example.com`;
    const studentMatric = `PC/99/${Math.floor(100 + Math.random() * 900)}`;
    const instructorCode = `PH${ts}03`;

    await registerInstructor(request, instructorEmail, instructorCode);
    await registerStudent(request, studentEmail, studentMatric);
    await approvePendingUsers(request, instructorEmail);

    const instructorToken = await loginAsInstructor(request, instructorEmail);

    const futureDate = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const assignmentTitle = `Draft Cleanup Test ${ts}`;

    const assignment = await createAssignment(request, instructorToken, {
      title: assignmentTitle,
      description: 'This assignment tests draft cleanup on final submission.',
      stream: 'ict',
      set_number: 1,
      due_date: futureDate,
      assignment_type: 'STANDARD',
    });

    const draftText = `Draft for cleanup test at ${new Date().toISOString()}`;

    await page.goto('/#/login');
    await page.getByPlaceholder('Enter your Email, Staff Code, or Matric Number').fill(studentEmail);
    await page.getByPlaceholder('••••••••').fill(STUDENT_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL('**/#/intern/**', { waitUntil: 'domcontentloaded' });

    await page.goto('/#/intern/assignments');
    const card = page.locator('div', { hasText: assignmentTitle }).first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // Save draft
    await card.getByRole('button', { name: /Submit Work/i }).click();
    const responseField = page.getByPlaceholder('Enter your response or notes for this assignment...');
    await expect(responseField).toBeVisible();
    await responseField.fill(draftText);
    await page.getByRole('button', { name: /Save Draft/i }).click();
    await expect(page.getByText(/Draft saved successfully/i)).toBeVisible({ timeout: 10000 });

    // Verify draft is in localStorage
    let storedDraft = await page.evaluate((assignmentId) => localStorage.getItem(`assignment-draft-${assignmentId}`), assignment.id);
    expect(storedDraft).not.toBeNull();

    // Submit assignment
    await page.getByRole('button', { name: /Submit Assignment/i }).click();
    await page.getByRole('button', { name: /Submit/i }).click();
    await expect(page.getByText(/Submission sent successfully/i)).toBeVisible({ timeout: 10000 });

    // Verify draft is cleared from localStorage
    storedDraft = await page.evaluate((assignmentId) => localStorage.getItem(`assignment-draft-${assignmentId}`), assignment.id);
    expect(storedDraft).toBeNull();
  });
});
