from django.db import models

# Create your models here.
class Player(models.Model):
    name = models.CharField(max_length=30)
    is_buzzed = models.BooleanField()
    score = models.IntegerField()

    
    
