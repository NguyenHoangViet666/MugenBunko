import sys
sys.stdout.reconfigure(encoding='utf-8')

app_path = r"C:\Users\VTS\.gemini\antigravity\scratch\mugenbunko-react\src\App.jsx"
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
boundaries = [
    ("home", 1603, "currentView === 'home'"),
    ("library", 1852, "currentView === 'library'"),
    ("detail", 1909, "currentView === 'detail'"),
    ("reader", 2232, "currentView === 'reader'"),
    ("studio", 2327, "currentView === 'studio'"),
    ("mod-dashboard", 2491, "currentView === 'mod-dashboard'"),
    ("admin-dashboard", 2665, "currentView === 'admin-dashboard'"),
    ("profile", 2899, "currentView === 'profile'"),
]

for idx, (name, start_line, tag) in enumerate(boundaries):
    print(f"--- View: {name} starting at line {start_line} ---")
    print("START:")
    for l in range(start_line - 1, start_line + 4):
        print(f"  {l+1}: {lines[l]}")
    
    # Estimate end line
    next_start = boundaries[idx+1][1] if idx + 1 < len(boundaries) else len(lines)
    print("ESTIMATED END:")
    for l in range(next_start - 3, next_start):
        print(f"  {l+1}: {lines[l]}")
