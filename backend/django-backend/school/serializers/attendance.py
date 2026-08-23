from rest_framework import serializers

from school.models.attendance import Attendance, AttendanceIntelligenceSetting, LearningBehaviour
from school.models.student import Student
from school.serializers.student import StudentSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(), write_only=True, source='student'
    )
    learning_behaviour = serializers.ListField(
        child=serializers.ChoiceField(choices={
            'Completed homework': 'Completed homework',
            'Completed classwork': 'Completed classwork',
            'Asked questions': 'Asked questions',
            'Helped others': 'Helped others',
        }),
        required=False,
        default=list,
        write_only=True,
    )

    def validate(self, attrs):
        if attrs.get('status') == 'Absent' and not attrs.get('absence_reason'):
            raise serializers.ValidationError({'absence_reason': 'This field is required when status is Absent.'})
        if attrs.get('status') == 'Late' and not attrs.get('late_reason'):
            raise serializers.ValidationError({'late_reason': 'This field is required when status is Late.'})
        return attrs

    def create(self, validated_data):
        values = validated_data.pop('learning_behaviour', [])
        attendance = super().create(validated_data)
        self._save_learning_behaviour(attendance, values)
        return attendance

    def update(self, instance, validated_data):
        values = validated_data.pop('learning_behaviour', None)
        attendance = super().update(instance, validated_data)
        if values is not None:
            self._save_learning_behaviour(attendance, values)
        return attendance

    @staticmethod
    def _save_learning_behaviour(attendance, values):
        LearningBehaviour.objects.filter(attendance=attendance).delete()
        if values:
            LearningBehaviour.objects.create(
                attendance=attendance,
                homework_completed='Completed homework' in values,
                classwork_completed='Completed classwork' in values,
                asked_questions='Asked questions' in values,
                helped_others='Helped others' in values,
            )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        behaviour = instance.learning_behaviours.order_by('behaviour_id').first()
        data['learning_behaviour'] = []
        if behaviour:
            data['learning_behaviour'] = [
                label for label, selected in [
                    ('Completed homework', behaviour.homework_completed),
                    ('Completed classwork', behaviour.classwork_completed),
                    ('Asked questions', behaviour.asked_questions),
                    ('Helped others', behaviour.helped_others),
                ] if selected
            ]
        return data

    class Meta:
        model = Attendance
        fields = [
            'attendance_id',
            'student',
            'student_id',
            'attendance_date',
            'status',
            'time_in',
            'time_out',
            'absence_reason',
            'late_reason',
            'participation_level',
            'attention_level',
            'behaviour',
            'tutor_observation',
            'what_was_different',
            'any_concern',
            'any_positive_change',
            'learning_behaviour',
        ]


class AttendanceIntelligenceSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceIntelligenceSetting
        fields = [
            'setting_id', 'notification_mode', 'notification_channels',
            'alert_student_mode', 'alert_student_ids',
            'absence_alert_enabled', 'absence_alert_days', 'absence_alert_recipients',
            'engagement_alert_enabled', 'engagement_alert_recipients', 'updated_at',
            'engagement_alert_level',
        ]

    def validate_notification_channels(self, value):
        invalid = set(value) - set(AttendanceIntelligenceSetting.CHANNELS)
        if invalid:
            raise serializers.ValidationError(f'Unsupported notification channels: {", ".join(sorted(invalid))}.')
        return value

    def validate_alert_student_ids(self, value):
        if not all(str(student_id).isdigit() for student_id in value):
            raise serializers.ValidationError('Alert student IDs must be numeric.')
        return value

    def validate_absence_alert_recipients(self, value):
        return self._validate_recipients(value)

    def validate_engagement_alert_recipients(self, value):
        return self._validate_recipients(value)

    @staticmethod
    def _validate_recipients(value):
        invalid = set(value) - set(AttendanceIntelligenceSetting.RECIPIENTS)
        if invalid:
            raise serializers.ValidationError(f'Unsupported recipients: {", ".join(sorted(invalid))}.')
        return value
