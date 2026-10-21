from django.db import models


class TribalCommunity(models.Model):
    """Configurable list of tribal community / sub-caste names.

    Managed under Masters so programme teams can add community names used
    in their locations. Surfaced as a dropdown in student registration.
    """

    tribal_community_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150, unique=True)

    class Meta:
        db_table = "tribal_community"
        ordering = ["name"]

    def __str__(self):
        return self.name
