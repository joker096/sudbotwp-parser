import sys
NGINX = "/etc/nginx/conf.d/sud.cvr.name.conf"
SPA_BLOCK = """    location / {
        try_files $uri $uri/ /index.html;
    }

"""
PROXY_BLOCK = """    location /parse-case {
        proxy_pass http://127.0.0.1:3007;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
"""
try:
    with open(NGINX) as f:
        content = f.read()

    has_spa = "try_files" in content
    has_proxy = "/parse-case" in content

    if has_spa and has_proxy:
        print("Already patched")
    else:
        lines = content.split("\n")
        insert = ""
        if not has_proxy:
            insert += PROXY_BLOCK
        if not has_spa:
            insert = SPA_BLOCK + insert
        for i in range(len(lines)-1, -1, -1):
            if lines[i].strip() == "}":
                lines.insert(i, insert)
                break
        with open(NGINX, "w") as f:
            f.write("\n".join(lines))
        print("Patched successfully")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
