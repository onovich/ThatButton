"""Flatten authoring modules to one device entry; no runtime require."""
import hashlib
import json
import re
import subprocess
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]

def build():
    subprocess.run(['node', str(ROOT / 'scripts/export-progression.mjs')], check=True, cwd=ROOT.parents[1])
    subprocess.run([__import__('sys').executable,str(ROOT/'scripts/generate-words.py')],check=True)
    if not (ROOT/'app/domain/bank.lua').exists():
        raise RuntimeError('Generate and validate offline bank before build')
    folder = ROOT / 'build'
    folder.mkdir(exist_ok=True)
    defined = set()
    def replace(match):
        name = match[1]
        if name not in defined:
            raise ValueError('Missing or out-of-order module: ' + name)
        return '__tb_' + name
    def expand(source):
        return re.sub(r'require\("domain\.([a-z]+)"\)', replace, source)
    output = ['-- Generated locally by ThatButton scripts/build.py.\n']
    for name in ['rules', 'bank', 'game', 'ruleimages', 'pixels', 'view', 'app']:
        source = (ROOT / f'app/domain/{name}.lua').read_text(encoding='utf-8')
        output.append(f'local __tb_{name} = (function()\n{expand(source)}\nend)()\n')
        defined.add(name)
    output.append(expand((ROOT / 'app/index.lua').read_text(encoding='utf-8')))
    entry = '\n'.join(output)
    assert 'require(' not in entry
    (folder / 'index.lua').write_text(entry, encoding='utf-8', newline='\r\n')
    (folder / 'manifest.json').write_bytes((ROOT / 'app/manifest.json').read_bytes())
    with ZipFile(folder / 'ThatButton-studio-source.zip', 'w', ZIP_DEFLATED) as archive:
        for name in ['index.lua', 'manifest.json']:
            archive.write(folder / name, name)
        for asset in sorted((ROOT / 'assets/rule-text').glob('*.png')):
            archive.write(asset, 'rule-images/' + asset.name)
        for asset in sorted((ROOT / 'assets/words').glob('*.png')):
            archive.write(asset, 'word-images/' + asset.name)
    hashes = {name: hashlib.sha256((folder / name).read_bytes()).hexdigest()
              for name in ['index.lua','manifest.json']}
    (folder / 'SHA256.json').write_text(json.dumps(hashes, indent=2)+'\n', encoding='utf-8')
    print('Built device entry:',(folder / 'index.lua').stat().st_size,'bytes', hashes)
    return folder

if __name__ == '__main__':
    build()
