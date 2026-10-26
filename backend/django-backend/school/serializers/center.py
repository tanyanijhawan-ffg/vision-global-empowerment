from rest_framework import serializers

from school.models.center import Center


class CenterSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='centre_id', read_only=True)
    name = serializers.CharField(source='centre_name', read_only=True)
    district = serializers.CharField(source='district.district_name', read_only=True)
    region = serializers.SerializerMethodField()
    location = serializers.CharField(source='block', read_only=True)
    facilitator_name = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model = Center
        fields = ['id', 'name', 'district', 'region', 'location', 'facilitator_name']

    def get_region(self, obj):
        region = obj.region or (obj.district.region if obj.district_id and obj.district else None)
        return region.region_name if region else None
