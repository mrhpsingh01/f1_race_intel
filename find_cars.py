import requests
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
r = requests.get('https://app.formula1dashboard.com/teams/', headers=headers)
html = r.text

# Find images in HTML or next.js data
imgs = set(re.findall(r'/images/[^"\']+', html))
if not imgs:
    imgs = set(re.findall(r'https?://[^"\'\s]+\.(?:png|webp|svg|jpg)', html))

print("Found images:", len(imgs))
for img in sorted(imgs):
    if any(k in img.lower() for k in ['car', 'livery', 'team', 'mercedes', 'ferrari', 'mclaren']):
        print(img)
