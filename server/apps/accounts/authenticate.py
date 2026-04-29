from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import CSRFCheck
from rest_framework import exceptions

class CustomCookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # 1. Try to get the token from the HTTP-Only cookie
        raw_token = request.COOKIES.get('access_token')

        # 2. If it's not in the cookie, fall back to checking the standard headers (optional but good practice)
        if raw_token is None:
            return super().authenticate(request)

        # 3. Validate the token
        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except Exception:
            return None