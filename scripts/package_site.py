from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1];dist=root/'dist';dist.mkdir(exist_ok=True)
for name in ['index.html','app.js','style.css']:
 shutil.copy2(root/name,dist/name)
for name in ['vendor','data']:
 shutil.copytree(root/name,dist/name,dirs_exist_ok=True)
(dist/'.nojekyll').touch()
print('Sitio estático preparado.')
