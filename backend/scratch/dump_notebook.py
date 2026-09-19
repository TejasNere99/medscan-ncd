import json

with open('ml_model/Diabetes_Model_Training.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

with open('backend/scratch/notebook_code.py', 'w', encoding='utf-8') as out:
    for i, cell in enumerate(nb['cells']):
        c_type = cell['cell_type']
        out.write(f"\n# {'='*60}\n")
        out.write(f"# CELL {i} ({c_type})\n")
        out.write(f"# {'='*60}\n")
        src = ''.join(cell['source'])
        out.write(src + '\n')
        if cell.get('outputs'):
            out.write("\n# --- OUTPUTS ---\n")
            for o in cell['outputs']:
                if 'text' in o:
                    txt = ''.join(o['text'])
                    out.write('# [text]: ' + txt.replace('\n', '\n# ') + '\n')
                elif 'data' in o and 'text/plain' in o['data']:
                    txt = ''.join(o['data']['text/plain'])
                    out.write('# [data]: ' + txt.replace('\n', '\n# ') + '\n')

print('Notebook code and outputs dumped to backend/scratch/notebook_code.py')
