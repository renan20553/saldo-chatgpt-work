"""Build review archives offline, with explicit production allowlist and stable metadata."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.parent
manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8-sig'))
assert manifest['manifest_version'] == 3
assert manifest['incognito'] == 'split'
assert set(manifest['permissions']) == {'alarms', 'storage'}
assert manifest['host_permissions'] == ['https://chatgpt.com/*']
assert manifest['background'] == {'service_worker': 'service-worker.js', 'type': 'module'}

production = ['manifest.json', 'service-worker.js', 'popup.html', 'popup.js', 'popup.css', 'PRIVACY.md']
production += [str(p.relative_to(ROOT)).replace('\\', '/') for p in (ROOT / 'lib').glob('*.js')]
production += sorted(set(manifest['icons'].values()))

def package(filename, names):
    target = OUT / filename
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(set(names)):
            path = (ROOT / name).resolve()
            assert path.is_relative_to(ROOT) and path.is_file()
            data = path.read_bytes()
            if path.suffix in {'.js', '.mjs', '.json', '.css', '.html', '.md', '.py', '.yml', '.txt'}:
                data = data.decode('utf-8-sig').replace('\r\n', '\n').encode('utf-8')
            info = zipfile.ZipInfo(name, date_time=(2026, 9, 6, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data, compresslevel=9)
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        assert 'manifest.json' in archive.namelist()
        assert json.loads(archive.read('manifest.json')) == manifest
    return {'file': filename, 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}

version = manifest['version']
review = package(f'saldo-chatgpt-work-{version}-review.zip', production)
source_files = [str(p.relative_to(ROOT)).replace('\\', '/') for p in ROOT.rglob('*')
                if p.is_file() and not any(part in {'.git', 'node_modules', '__pycache__'} for part in p.relative_to(ROOT).parts)
                and p.suffix not in {'.zip', '.pyc', '.patch'}]
source = package(f'saldo-chatgpt-work-{version}-source.zip', source_files)
report = {'version': version, 'production_files': sorted(production), 'artifacts': [review, source]}
(OUT / 'package-report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2, ensure_ascii=False))
