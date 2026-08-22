from django.db import models


ROLE_CHOICES = (
    ('super_admin', 'Super Admin'),
    ('regional_admin', 'Regional Admin'),
    ('facilitator', 'Facilitator'),
)


class Role(models.Model):
    name = models.CharField(max_length=128, unique=True)

    def __str__(self):
        return self.name
