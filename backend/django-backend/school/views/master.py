from datetime import date

from django.db import transaction
from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models.center import Center, District, Region
from school.permissions import IsSuperAdmin
from school.services.xlsx import build_workbook, read_first_sheet


REGION_COLUMNS = ['region_name', 'state', 'status']
CENTRE_COLUMNS = ['region_name', 'district_name', 'centre_name', 'centre_type', 'block', 'village', 'gps_location', 'facilitator_name', 'start_date', 'status']


class MasterDataView(APIView):
    def get_permissions(self):
        permissions = [IsAuthenticated]
        if self.request.method != 'GET':
            permissions.append(IsSuperAdmin)
        return [permission() for permission in permissions]


class MasterRegionListCreateView(MasterDataView):

    def get(self, request, *args, **kwargs):
        return Response([serialize_region(region) for region in Region.objects.order_by('region_name')])

    def post(self, request, *args, **kwargs):
        name = clean(request.data.get('region_name'))
        if not name:
            return Response({'region_name': ['Region name is required.']}, status=status.HTTP_400_BAD_REQUEST)
        region, created = Region.objects.get_or_create(region_name=name)
        changed = update_fields(region, request.data, ('state', 'status'))
        if changed:
            region.save(update_fields=changed)
        return Response(serialize_region(region), status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def patch(self, request, pk, *args, **kwargs):
        region = Region.objects.filter(pk=pk).first()
        if region is None:
            return Response({'detail': 'Region not found.'}, status=status.HTTP_404_NOT_FOUND)
        changed = update_fields(region, request.data, ('region_name', 'state', 'status'))
        if changed:
            region.save(update_fields=changed)
        return Response(serialize_region(region))

    def delete(self, request, pk, *args, **kwargs):
        deleted, _ = Region.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT if deleted else status.HTTP_404_NOT_FOUND)


class MasterCentreListCreateView(MasterDataView):

    def get(self, request, *args, **kwargs):
        return Response([serialize_centre(centre) for centre in Center.objects.select_related('region', 'district').order_by('centre_name')])

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        try:
            centre, _ = upsert_centre(request.data)
        except ValueError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_centre(centre), status=status.HTTP_201_CREATED)

    @transaction.atomic
    def patch(self, request, pk, *args, **kwargs):
        centre = Center.objects.filter(pk=pk).first()
        if centre is None:
            return Response({'detail': 'Centre not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            region_name = clean(request.data.get('region_name'))
            district_name = clean(request.data.get('district_name'))
            centre_name = clean(request.data.get('centre_name'))
            if not all((region_name, district_name, centre_name)):
                raise ValueError('Region name, district name, and centre name are required.')
            region, _ = Region.objects.get_or_create(region_name=region_name)
            district, _ = District.objects.get_or_create(region=region, district_name=district_name)
            centre.region = region
            centre.district = district
            centre.centre_name = centre_name
            update_fields(centre, request.data, ('centre_type', 'block', 'village', 'gps_location', 'facilitator_name', 'status'))
            start_date = clean(request.data.get('start_date'))
            centre.start_date = date.fromisoformat(start_date) if start_date else None
            centre.save()
        except ValueError as error:
            return Response({'detail': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_centre(centre))

    def delete(self, request, pk, *args, **kwargs):
        deleted, _ = Center.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT if deleted else status.HTTP_404_NOT_FOUND)


class MasterExportView(MasterDataView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    def get_permissions(self):
        return [IsAuthenticated(), IsSuperAdmin()]

    def get(self, request, resource, *args, **kwargs):
        if resource == 'regions':
            headers = REGION_COLUMNS
            rows = [[getattr(region, field) or '' for field in headers] for region in Region.objects.order_by('region_name')]
            filename = 'regions.xlsx'
        elif resource == 'centres':
            headers = CENTRE_COLUMNS
            rows = [[
                centre.region.region_name if centre.region else '',
                centre.district.district_name if centre.district else '',
                centre.centre_name,
                centre.centre_type or '', centre.block or '', centre.village or '', centre.gps_location or '',
                centre.facilitator_name or '', centre.start_date.isoformat() if centre.start_date else '', centre.status or '',
            ] for centre in Center.objects.select_related('region', 'district').order_by('centre_name')]
            filename = 'centres.xlsx'
        else:
            return Response({'detail': 'Unknown master-data resource.'}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(build_workbook(resource.title(), headers, rows), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class MasterBulkUploadView(MasterDataView):

    def get_permissions(self):
        return [IsAuthenticated(), IsSuperAdmin()]

    @transaction.atomic
    def post(self, request, resource, *args, **kwargs):
        uploaded_file = request.FILES.get('file')
        if uploaded_file is None or not uploaded_file.name.lower().endswith('.xlsx'):
            return Response({'file': ['Upload an .xlsx file.']}, status=status.HTTP_400_BAD_REQUEST)
        try:
            headers, records = read_first_sheet(uploaded_file)
        except Exception:
            return Response({'file': ['The uploaded file is not a valid Excel workbook.']}, status=status.HTTP_400_BAD_REQUEST)

        columns = REGION_COLUMNS if resource == 'regions' else CENTRE_COLUMNS if resource == 'centres' else None
        if columns is None:
            return Response({'detail': 'Unknown master-data resource.'}, status=status.HTTP_404_NOT_FOUND)
        missing_columns = [column for column in columns if column not in headers]
        if missing_columns:
            return Response({'file': [f'Missing required columns: {", ".join(missing_columns)}.']}, status=status.HTTP_400_BAD_REQUEST)

        summary = {'created': 0, 'updated': 0, 'skipped': 0}
        try:
            for record in records:
                outcome = upsert_region(record) if resource == 'regions' else upsert_centre(record)[1]
                summary[outcome] += 1
        except ValueError as error:
            transaction.set_rollback(True)
            return Response({'file': [str(error)]}, status=status.HTTP_400_BAD_REQUEST)
        return Response(summary)


def upsert_region(record):
    name = clean(record.get('region_name'))
    if not name:
        raise ValueError('Every row needs a region_name.')
    region, created = Region.objects.get_or_create(region_name=name)
    changed = update_fields(region, record, ('state', 'status'))
    if changed:
        region.save(update_fields=changed)
    return 'created' if created else 'updated' if changed else 'skipped'


def upsert_centre(record):
    region_name = clean(record.get('region_name'))
    district_name = clean(record.get('district_name'))
    centre_name = clean(record.get('centre_name'))
    if not all((region_name, district_name, centre_name)):
        raise ValueError('Every row needs region_name, district_name, and centre_name.')

    region, _ = Region.objects.get_or_create(region_name=region_name)
    district, _ = District.objects.get_or_create(region=region, district_name=district_name)
    centre, created = Center.objects.get_or_create(region=region, district=district, centre_name=centre_name)
    changed = update_fields(centre, record, ('centre_type', 'block', 'village', 'gps_location', 'facilitator_name', 'status'))
    start_date = clean(record.get('start_date'))
    if start_date:
        try:
            parsed_date = date.fromisoformat(start_date)
        except ValueError as error:
            raise ValueError(f'Invalid start_date for {centre_name}; use YYYY-MM-DD.') from error
        if centre.start_date != parsed_date:
            centre.start_date = parsed_date
            changed.append('start_date')
    elif centre.start_date is not None:
        centre.start_date = None
        changed.append('start_date')
    if changed:
        centre.save(update_fields=changed)
    return centre, 'created' if created else 'updated' if changed else 'skipped'


def update_fields(instance, record, fields):
    changed = []
    for field in fields:
        value = clean(record.get(field)) or None
        if getattr(instance, field) != value:
            setattr(instance, field, value)
            changed.append(field)
    return changed


def clean(value):
    return str(value).strip() if value is not None else ''


def serialize_region(region):
    return {'id': region.region_id, 'region_name': region.region_name, 'state': region.state, 'status': region.status}


def serialize_centre(centre):
    return {
        'id': centre.centre_id, 'region_name': centre.region.region_name if centre.region else '',
        'district_name': centre.district.district_name if centre.district else '', 'centre_name': centre.centre_name,
        'centre_type': centre.centre_type, 'block': centre.block, 'village': centre.village,
        'gps_location': centre.gps_location, 'facilitator_name': centre.facilitator_name,
        'start_date': centre.start_date.isoformat() if centre.start_date else '', 'status': centre.status,
    }