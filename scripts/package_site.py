from pathlib import Path
import shutil,hashlib
root=Path(__file__).resolve().parents[1];dist=root/'dist';dist.mkdir(exist_ok=True)
for name in ['index.html','app.js','style.css']:
 shutil.copy2(root/name,dist/name)
for name in ['vendor','data']:
 shutil.copytree(root/name,dist/name,dirs_exist_ok=True)
index=(dist/'index.html').read_text()
for asset in ['app.js','style.css']:
 version=hashlib.sha256((dist/asset).read_bytes()).hexdigest()[:12]
 index=index.replace('\"'+asset+'\"','\"'+asset+'?v='+version+'\"')
(dist/'index.html').write_text(index)
(dist/'.nojekyll').touch()
print('Sitio estático preparado.')
