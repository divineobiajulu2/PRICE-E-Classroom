import json

from django.test import TestCase


class LoginViewTests(TestCase):
    def test_login_with_unknown_identifier_returns_json_error(self):
        response = self.client.post(
            '/api/login/',
            data=json.dumps({'identifier': 'missing@example.com', 'password': 'Password123'}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['error'], 'Invalid credentials')
