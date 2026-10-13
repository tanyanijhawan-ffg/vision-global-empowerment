from io import BytesIO
from posixpath import normpath
from pathlib import PurePosixPath
from xml.etree import ElementTree
from zipfile import ZIP_DEFLATED, ZipFile


MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PACKAGE_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
DRAWING_NS = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'


def build_workbook(sheet_name, headers, rows):
    def cell(column, row_number, value, style=None):
        reference = f'{column_name(column)}{row_number}'
        style_attribute = f' s="{style}"' if style is not None else ''
        return f'<c r="{reference}"{style_attribute} t="inlineStr"><is><t>{escape_xml(value)}</t></is></c>'

    worksheet_rows = []
    for row_number, values in enumerate([headers, *rows], start=1):
        cells = ''.join(cell(column, row_number, value, 1 if row_number == 1 and '*' in str(value) else None) for column, value in enumerate(values, start=1))
        worksheet_rows.append(f'<row r="{row_number}">{cells}</row>')

    contents = {
        '[Content_Types].xml': (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            '</Types>'
        ),
        '_rels/.rels': (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<Relationships xmlns="{PACKAGE_REL_NS}"><Relationship Id="rId1" Type="{REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>'
        ),
        'xl/workbook.xml': (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<workbook xmlns="{MAIN_NS}" xmlns:r="{REL_NS}"><sheets><sheet name="{escape_xml(sheet_name)}" sheetId="1" r:id="rId1"/></sheets></workbook>'
        ),
        'xl/_rels/workbook.xml.rels': (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<Relationships xmlns="{PACKAGE_REL_NS}"><Relationship Id="rId1" Type="{REL_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="{REL_NS}/styles" Target="styles.xml"/></Relationships>'
        ),
        'xl/styles.xml': (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<styleSheet xmlns="{MAIN_NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><sz val="11"/><color rgb="FFFF0000"/><name val="Calibri"/></font></fonts>'
            '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
            '<borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'
        ),
        'xl/worksheets/sheet1.xml': (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<worksheet xmlns="{MAIN_NS}"><sheetData>{"".join(worksheet_rows)}</sheetData></worksheet>'
        ),
    }

    workbook = BytesIO()
    with ZipFile(workbook, 'w', ZIP_DEFLATED) as archive:
        for name, content in contents.items():
            archive.writestr(name, content)
    return workbook.getvalue()


def read_first_sheet(uploaded_file):
    with ZipFile(uploaded_file) as archive:
        shared_strings = read_shared_strings(archive)
        sheet_name = next(name for name in archive.namelist() if name.startswith('xl/worksheets/') and name.endswith('.xml'))
        root = ElementTree.fromstring(archive.read(sheet_name))

    rows = []
    for row in root.findall(f'.//{{{MAIN_NS}}}row'):
        values = {}
        for cell in row.findall(f'{{{MAIN_NS}}}c'):
            reference = cell.attrib.get('r', 'A1')
            values[column_index(reference)] = read_cell(cell, shared_strings)
        if values:
            rows.append([values.get(index, '') for index in range(1, max(values) + 1)])

    if not rows:
        return [], []
    headers = [str(value).strip() for value in rows[0]]
    records = [dict(zip(headers, row)) for row in rows[1:] if any(str(value).strip() for value in row)]
    return headers, records


def read_first_sheet_images(uploaded_file):
    """Return embedded images keyed by their zero-based worksheet row and column."""
    images = {}
    with ZipFile(uploaded_file) as archive:
        worksheet = next(name for name in archive.namelist() if name.startswith('xl/worksheets/') and name.endswith('.xml'))
        rels_path = f"{PurePosixPath(worksheet).parent}/_rels/{PurePosixPath(worksheet).name}.rels"
        if rels_path not in archive.namelist():
            return images
        worksheet_rels = relationship_targets(archive, rels_path)
        worksheet_root = ElementTree.fromstring(archive.read(worksheet))
        drawing = worksheet_root.find(f'.//{{{MAIN_NS}}}drawing')
        if drawing is None:
            return images
        drawing_path = resolve_target(worksheet, worksheet_rels.get(drawing.attrib.get(f'{{{REL_NS}}}id'), ''))
        drawing_rels_path = f"{PurePosixPath(drawing_path).parent}/_rels/{PurePosixPath(drawing_path).name}.rels"
        if drawing_rels_path not in archive.namelist():
            return images
        drawing_rels = relationship_targets(archive, drawing_rels_path)
        drawing_root = ElementTree.fromstring(archive.read(drawing_path))
        for anchor in drawing_root:
            from_node = anchor.find(f'{{{DRAWING_NS}}}from')
            blip = anchor.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}blip')
            if from_node is None or blip is None:
                continue
            row = int(from_node.findtext(f'{{{DRAWING_NS}}}row', '-1'))
            column = int(from_node.findtext(f'{{{DRAWING_NS}}}col', '-1'))
            target = drawing_rels.get(blip.attrib.get(f'{{{REL_NS}}}embed'))
            if target:
                media_path = resolve_target(drawing_path, target)
                images[(row, column)] = (PurePosixPath(media_path).name, archive.read(media_path))
    return images


def relationship_targets(archive, rels_path):
    root = ElementTree.fromstring(archive.read(rels_path))
    return {node.attrib['Id']: node.attrib['Target'] for node in root}


def resolve_target(source_path, target):
    return normpath(str(PurePosixPath(source_path).parent / target)).lstrip('/')


def read_shared_strings(archive):
    if 'xl/sharedStrings.xml' not in archive.namelist():
        return []
    root = ElementTree.fromstring(archive.read('xl/sharedStrings.xml'))
    return [''.join(node.itertext()) for node in root.findall(f'{{{MAIN_NS}}}si')]


def read_cell(cell, shared_strings):
    cell_type = cell.attrib.get('t')
    if cell_type == 'inlineStr':
        text = cell.find(f'.//{{{MAIN_NS}}}t')
        return text.text if text is not None and text.text else ''
    value = cell.find(f'{{{MAIN_NS}}}v')
    if value is None or value.text is None:
        return ''
    if cell_type == 's':
        return shared_strings[int(value.text)]
    return value.text


def column_name(index):
    result = ''
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def column_index(reference):
    letters = ''.join(character for character in reference if character.isalpha())
    value = 0
    for character in letters:
        value = value * 26 + ord(character.upper()) - 64
    return value


def escape_xml(value):
    return str(value if value is not None else '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')