from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer

# Helper function to generate the tokens
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            
            response = Response({
                'detail': 'Account created successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
            # Set the HTTP-Only cookies
            response.set_cookie('access_token', tokens['access'], httponly=True, path='/', samesite='None', secure=True)
            response.set_cookie('refresh_token', tokens['refresh'], httponly=True, path='/', samesite='None', secure=True)
            return response
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # We are using username for login based on your AbstractUser model
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)
        
        if user is not None:
            tokens = get_tokens_for_user(user)
            response = Response({
                'detail': 'Login successful',
                'user': UserSerializer(user).data
            })
            
            # Set the HTTP-Only cookies
            response.set_cookie('access_token', tokens['access'], httponly=True, path='/', samesite='None', secure=True)
            response.set_cookie('refresh_token', tokens['refresh'], httponly=True, path='/', samesite='None', secure=True)
            return response
            
        return Response({'error': 'Invalid username or password'}, status=status.HTTP_401_UNAUTHORIZED)

class RefreshTokenView(APIView):
    """
    Next.js will hit this endpoint when the 15-minute access token expires.
    It reads the refresh_token cookie and issues a brand new access_token cookie.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Extract the refresh token straight from the browser's cookie
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response({'error': 'No refresh token found'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)

            response = Response({'detail': 'Access token refreshed successfully'})
            # Give the browser the new 15-minute access token
            response.set_cookie('access_token', access_token, httponly=True, path='/', samesite='None', secure=True)
            return response

        except Exception:
            return Response({'error': 'Refresh token is expired or invalid'}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    """
    Blacklists the refresh token so it can never be used again, 
    and instructs the browser to delete the cookies.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist() # Throws it on the database blacklist
        except Exception:
            # If the token is already invalid/expired, just ignore and continue logging out
            pass

        response = Response({'detail': 'Logged out successfully'})
        # Instruct the browser to destroy the cookies
        response.delete_cookie('access_token', path='/', samesite='None')
        response.delete_cookie('refresh_token', path='/', samesite='None')
        return response