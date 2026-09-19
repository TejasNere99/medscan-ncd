import re
from bs4 import BeautifulSoup

path = r"C:\Users\PC\.gemini\antigravity-ide\brain\2dd65285-500b-4881-b6c7-a62a5831d1a2\.system_generated\steps\1371\content.md"

with open(path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

soup = BeautifulSoup(text, "html.parser")
for a in soup.find_all("a", href=True):
    href = a["href"]
    text_content = a.get_text(strip=True)
    if any(k in href.lower() for k in ["demo", "xpt", "htm", "2017"]):
        print(f"Text: '{text_content}' | Href: '{href}'")
