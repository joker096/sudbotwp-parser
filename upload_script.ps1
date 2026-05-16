$b64Content = Get-Content -Raw "F:\AISTUDIO\sud.cvr.name\server\patch_nginx.b64"
$result = $b64Content | ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 user0@130.49.175.224 "python3 -c `"import base64,sys; open('/tmp/patch_nginx.py','wb').write(base64.b64decode(sys.stdin.read()))`"" 2>&1
Write-Output $result