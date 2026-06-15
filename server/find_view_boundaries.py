import sys
sys.stdout.reconfigure(encoding='utf-8')

app_path = r"C:\Users\VTS\.gemini\antigravity\scratch\mugenbunko-react\src\App.jsx"
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines, 1):
    if "currentView === '" in line and "{" in line and "&&" in line:
        print(f"Line {i}: {line.strip()}")
