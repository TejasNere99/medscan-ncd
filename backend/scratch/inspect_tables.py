from bs4 import BeautifulSoup

path = r"C:\Users\PC\.gemini\antigravity-ide\brain\2dd65285-500b-4881-b6c7-a62a5831d1a2\.system_generated\steps\1371\content.md"

with open(path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

soup = BeautifulSoup(text, "html.parser")
tables = soup.find_all("table")
print(f"Found {len(tables)} tables")

for i, table in enumerate(tables):
    print(f"\n--- Table {i} ---")
    for tr in table.find_all("tr")[:10]:
        cells = [td.get_text(strip=True) for td in tr.find_all(["th", "td"])]
        links = [a["href"] for a in tr.find_all("a", href=True)]
        print("Cells:", cells)
        print("Links:", links)
