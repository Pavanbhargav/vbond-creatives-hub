from django.shortcuts import render
from rest_framework import Response,status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Task
# Create your views here.

