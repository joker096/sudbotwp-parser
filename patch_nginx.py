import re, sys

NGINX = "/etc/nginx/sites-enabled/sud.cvr.name"
SPA = """    location / {
        try_files $uri $uri/ /index.html;
    }

"""
PROXY = """    location /parse-case {
        proxy_pass http://127.0.0.1:3007;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
"""

with open(NGINX) as f:
    content = f.read()

has_spa = "try_files" in content
has_proxy = "/parse-case" in content

if has_spa and has_proxy:
    print("Already patched")
else:
    insert = ""
    if not has_proxy:
        insert += PROXY
    if not has_spa:
        insert = SPA + insert
    lines = content.split('\n')
    for i in range(len(lines)-1, -1, -1):
        if lines[i].strip() == '}':
            lines.insert(i, insert)
            break
    new_content = '\n'.join(lines)
    with open(NGINX, 'w') as f:
        f.write(new_content)
    print("Patched successfully")
