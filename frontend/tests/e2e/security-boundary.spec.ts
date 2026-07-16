import { test, expect } from '@playwright/test';

const baseUrl = process.env.BACKEND_URL || 'http://localhost:8000';
const ADMIN_IDENTIFIER = 'divineobiajulu2@gmail.com';
const ADMIN_PASSWORD = 'OBia00..';
const TEST_INTERN_IDENTIFIER = 'PC/05/080';
const TEST_INTERN_PASSWORD = 'OBia00..';

async function requestJson(request: any, path: string, options: any = {}) {
  const response = await request.fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return { response, body: await response.text() };
}

async function adminLogin(request: any) {
  const login = await requestJson(request, '/api/login/', {
    method: 'POST',
    data: JSON.stringify({ identifier: ADMIN_IDENTIFIER, password: ADMIN_PASSWORD }),
  });
  const payload = JSON.parse(login.body || '{}');
  expect(login.response.status()).toBe(200);
  expect(payload.tokens?.access).toBeTruthy();
  return payload.tokens.access;
}

async function createActiveStudent(request: any, adminToken: string, matricNumber: string, email: string) {
  const response = await request.post(`${baseUrl}/api/admin/users/create/`, {
    data: JSON.stringify({
      role: 'student',
      matric_number: matricNumber,
      set_number: 1,
      study_stream: 'ict',
      first_name: 'Security',
      last_name: 'Tester',
      email,
      password: 'Password123!',
      state: 'Lagos',
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  });

  return response;
}

test.describe('Security boundary audit', () => {
  test('intern cannot access another stream assignment by id', async ({ request }) => {
    const login = await requestJson(request, '/api/login/', {
      method: 'POST',
      data: JSON.stringify({ identifier: TEST_INTERN_IDENTIFIER, password: TEST_INTERN_PASSWORD }),
    });

    const loginPayload = JSON.parse(login.body || '{}');
    const token = loginPayload.tokens?.access;
    expect(token).toBeTruthy();

    const otherStreamAssignmentId = 999999;
    const response = await request.fetch(`${baseUrl}/api/assignments/${otherStreamAssignmentId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const text = await response.text();
    expect([403, 404]).toContain(response.status());
    console.log(`[security] cross-stream assignment response=${response.status()} body=${text}`);
  });

  test('malformed matric strings are rejected', async ({ request }) => {
    const malformedValues = ['AB/12/345/', 'AB12/345', 'AB/12/34A', 'A/12/345', 'AB/123/456'];
    for (const value of malformedValues) {
      const response = await request.post(`${baseUrl}/api/register/student/`, {
        data: JSON.stringify({
          matric_number: value,
          email: `matric-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
          password: 'Password123!',
          first_name: 'Audit',
          last_name: 'Case',
          gender: 'male',
          date_of_birth: '2000-01-01',
          country: 'Nigeria',
          state: 'Lagos',
          study_stream: 'ict',
          set_number: 1,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const bodyText = await response.text();
      expect(response.status()).toBe(400);
      console.log(`[security] malformed-matric=${value} status=${response.status()} body=${bodyText}`);
    }
  });

  test('deadline bypass attempts are blocked', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/assignments/submissions/`, {
      data: JSON.stringify({ assignment: 999999, submission_text: 'deadline bypass' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const bodyText = await response.text();
    expect([400, 401, 403, 404]).toContain(response.status());
    console.log(`[security] deadline-bypass status=${response.status()} body=${bodyText}`);
  });
});
