import re
with open('apps/web/src/pages/Auth.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(r'\{\!isLogin && \(\s*<div>\s*<label className="block text-xs font-medium text-zinc-400 mb-1">Role</label>.*?</div>\s*\)\}', '', c, flags=re.DOTALL)

with open('apps/web/src/pages/Auth.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
