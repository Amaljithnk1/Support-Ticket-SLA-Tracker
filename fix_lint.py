import re
with open('apps/web/src/pages/Auth.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Remove CustomSelect import
c = re.sub(r"import \{\s*CustomSelect\s*\} from '\.\./components/ui/CustomSelect';\n?", "", c)

# Replace const [role, setRole] = useState('REPORTER'); with const role = 'REPORTER';
c = re.sub(r"const \[role,\s*setRole\] = useState\('REPORTER'\);", "const role = 'REPORTER';", c)

with open('apps/web/src/pages/Auth.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
