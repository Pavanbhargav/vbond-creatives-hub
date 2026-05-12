from django.contrib.auth.models import AbstractUser
from django.db import models
class User(AbstractUser):
    # AbstractUser automatically provides 'username' and 'password'.
    # It also sets 'username' as the primary login field by default.
    
    # We use 'pass' here because we don't need to add any custom fields yet.
    # We are just claiming the model as our own for future-proofing!
    designation = models.CharField(max_length=100,blank=True,null=True)
    
    def __str__(self):
        return self.username