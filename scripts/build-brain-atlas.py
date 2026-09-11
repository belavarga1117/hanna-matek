"""Convert the pinned fsaverage5 / Destrieux data without changing anatomy.

Inputs are the files recorded in docs/BRAIN-ATLAS-SOURCES.md. No smoothing,
invented geometry, parcel estimation or coordinate-based relabeling is used.
Run from the repository root after downloading those inputs into the source dir.
"""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import struct
import xml.etree.ElementTree as ET
import zlib

SOURCE = Path('.local/brain-atlas/source')
TARGET = Path('dist/assets/brain')


def gifti(name):
    arrays = []
    root = ET.fromstring(gzip.decompress((SOURCE / name).read_bytes()))
    for item in root.findall('DataArray'):
        assert item.attrib['Encoding'] == 'GZipBase64Binary'
        assert item.attrib['Endian'] == 'LittleEndian'
        raw = zlib.decompress(base64.b64decode(item.findtext('Data')))
        dtype = 'f' if item.attrib['DataType'] == 'NIFTI_TYPE_FLOAT32' else 'i'
        values = struct.unpack('<' + dtype * (len(raw) // 4), raw)
        arrays.append((item.attrib, values, raw))
    return arrays


def annotation(name):
    data = (SOURCE / name).read_bytes()
    offset = 0

    def integer():
        nonlocal offset
        value = struct.unpack_from('>i', data, offset)[0]
        offset += 4
        return value

    def string():
        nonlocal offset
        length = integer()
        value = data[offset:offset + length].rstrip(b'\0').decode()
        offset += length
        return value

    count = integer()
    pairs = [(integer(), integer()) for _ in range(count)]
    assert integer() == 1 and integer() == -2, 'Expected FreeSurfer v2 colour table'
    slots = integer()
    string()  # Original colour-table filename, not a local runtime dependency.
    labels = [None] * slots
    mapping = {}
    for _ in range(integer()):
        index, title = integer(), string()
        rgba = [integer() for _ in range(4)]
        mapping[rgba[0] + (rgba[1] << 8) + (rgba[2] << 16)] = index
        labels[index] = title
    assert all(labels) and offset == len(data)
    result = [0] * count
    assert len({vertex for vertex, _ in pairs}) == count
    for vertex, colour in pairs:
        result[vertex] = mapping.get(colour, 0)
    return labels, result


TARGET.mkdir(parents=True, exist_ok=True)
manifest = {'version': 1, 'template': 'FreeSurfer fsaverage5', 'atlas': 'Destrieux 2009 / 2010',
            'coordinates': 'Original surface RAS millimetres; browser rotates RAS into Y-up.',
            'hemispheres': [], 'labels': None}
for hemi in ['left', 'right']:
    arrays = gifti(f'pial_{hemi}.gii.gz')
    positions = next(item for item in arrays if item[0]['Intent'] == 'NIFTI_INTENT_POINTSET')
    faces = next(item for item in arrays if item[0]['Intent'] == 'NIFTI_INTENT_TRIANGLE')
    sulc = gifti(f'sulc_{hemi}.gii.gz')[0]
    labels, indices = annotation(f'{hemi}.annot')
    vertices, triangles = len(positions[1]) // 3, len(faces[1]) // 3
    assert vertices == 10242 and triangles == 20480
    assert len(indices) == len(sulc[1]) == vertices
    assert min(faces[1]) == 0 and max(faces[1]) < vertices
    assert all(0 <= label < len(labels) for label in indices)
    if manifest['labels'] is not None:
        assert manifest['labels'] == labels
    manifest['labels'] = labels
    payload = bytearray(struct.pack('<4sIII', b'HBA1', vertices, triangles, 1))
    payload.extend(positions[2])
    payload.extend(struct.pack('<' + 'H' * len(faces[1]), *faces[1]))
    payload.extend(bytes(indices))
    while len(payload) % 4:
        payload.append(0)
    payload.extend(sulc[2])
    filename = f'fsaverage5-{hemi}.bin'
    (TARGET / filename).write_bytes(payload)
    manifest['hemispheres'].append({'id': hemi, 'file': filename, 'vertices': vertices,
        'triangles': triangles, 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(),
        'boundsRAS': [[min(positions[1][axis::3]), max(positions[1][axis::3])] for axis in range(3)],
        'parcelCounts': {label: indices.count(i) for i, label in enumerate(labels)}})
(TARGET / 'atlas.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'vertices': sum(h['vertices'] for h in manifest['hemispheres']),
                  'triangles': sum(h['triangles'] for h in manifest['hemispheres']), 'labelsPerHemisphere': len(labels)}))
