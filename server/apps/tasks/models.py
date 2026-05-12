

# Create your models here.
from django.db import models
from apps.accounts.models import User
from apps.workspace.models import Workspace

class Task(models.Model):
    """
    Core Task model representing a deliverable in the Creative Hub.
    """
    PRIORITY_CHOICES = [
        ('Critical', 'Critical'),
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]

    STATUS_CHOICES = [
        ('Briefed', 'Briefed'),
        ('In Progress', 'In Progress'),
        ('Submitted', 'Submitted'),
        ('In Review', 'In Review'),
        ('Approved', 'Approved'),
        ('Rework', 'Rework'),
        ('Delivered', 'Delivered'),
    ]

    # Workspace relation (tasks must belong to a workspace)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='tasks')

    # Basic Info
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    task_type = models.CharField(max_length=100)  # e.g., 'Banner / Poster', 'Reel / Short'
    platform = models.CharField(max_length=100)   # e.g., 'Instagram', 'Print'
    
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Briefed')

    # Dates
    deadline = models.DateField()
    submitted_at = models.DateTimeField(blank=True, null=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Analytics & Metrics
    reworks = models.PositiveIntegerField(default=0)
    estimated_hours = models.PositiveIntegerField(default=4)
    actual_hours = models.PositiveIntegerField(default=0)

    # ==========================================
    # USER RELATIONS (The Allocation & Credits)
    # ==========================================
    
    # 1. The Main Assignee (The person currently doing the task)
    assignee = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_tasks',
        help_text="The main designer/member responsible for this task."
    )

    # 2. The Credit Roles (Who did what)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='tasks_created',
        help_text="Who allocated the task."
    )
    concept_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='tasks_concept'
    )
    design_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='tasks_design'
    )
    content_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='tasks_content'
    )

    def __str__(self):
        return f"{self.title} ({self.status})"