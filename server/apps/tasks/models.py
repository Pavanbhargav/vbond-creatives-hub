

# Create your models here.
from django.db import models
from apps.accounts.models import User
from apps.workspace.models import Workspace,Team

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
    approval_team = models.ForeignKey(
        Team, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="tasks_to_approve",
        help_text="The team responsible for reviewing and approving this task."
    )
    

    def __str__(self):
        return f"{self.title}"


class TaskFile(models.Model):
    """
    Model to handle multiple files per task.
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="files")
    user = models.ForeignKey(User, on_delete = models.CASCADE,related_name="user_files")
    file = models.FileField(upload_to="task_files/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name


class Approvals(models.Model):
    """
    Model to track individual approval history and feedback for each team member.
    """
    APPROVAL_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('rework', 'Rework'),
    ]
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="approvals")
    
    # Track the specific person from the team who is making the decision
    approver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="my_approvals")
    
    status = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='pending')
    
    # Essential for rework instructions and feedback
    comment = models.TextField(blank=True, null=True) 
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Prevents the same user from having two separate approval records for the same task
        unique_together = ('task', 'approver') 

    def __str__(self):
        return f"{self.task.title}-{self.status}"


class TaskHistory(models.Model):
    """
    Model to track the entire history of a task including file uploads, approval comments, and rework requests.
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="history")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="task_history")
    action = models.CharField(max_length=50) # e.g., 'approved', 'rework', 'file_uploaded', 'comment'
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.task.title} - {self.action} by {self.user.username}"