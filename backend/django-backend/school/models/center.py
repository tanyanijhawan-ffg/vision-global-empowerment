from django.db import models


class Program(models.Model):
    program_id = models.AutoField(primary_key=True)
    program_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'program'

    def __str__(self):
        return self.program_name


class Region(models.Model):
    region_id = models.AutoField(primary_key=True)
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='regions', blank=True, null=True)
    region_name = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'region'

    def __str__(self):
        return self.region_name


class District(models.Model):
    district_id = models.AutoField(primary_key=True)
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='districts')
    district_name = models.CharField(max_length=100)

    class Meta:
        db_table = 'district'

    def __str__(self):
        return self.district_name


class Center(models.Model):
    centre_id = models.AutoField(primary_key=True)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='centres', blank=True, null=True)
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='centres', blank=True, null=True)
    centre_name = models.CharField(max_length=150)
    block = models.CharField(max_length=100, blank=True, null=True)
    village = models.CharField(max_length=100, blank=True, null=True)
    gps_location = models.CharField(max_length=255, blank=True, null=True)
    facilitator_name = models.CharField(max_length=100, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        db_table = 'centre'

    def __str__(self):
        return self.centre_name
