#!/usr/bin/env python3
"""Regenerate the one-page public checklist with only the current Studio offers."""

from pathlib import Path
from textwrap import wrap

OUT = Path(__file__).resolve().parents[1] / "public/proof-gap-checklist.pdf"

# The web checklist owns both the checks and score denominator.
import json
import subprocess

COPY_PATH = OUT.parent.parent / "app/content/proof-gap.ts"
COPY = json.loads(subprocess.check_output([
    "node", "--experimental-strip-types", "--input-type=module", "-e",
    "const copy = await import(process.argv[1]); console.log(JSON.stringify(copy));",
    COPY_PATH.as_uri(),
], text=True))
SECTIONS = [
    (section["title"], [f"{check['id']} {check['text']}" for check in section["checks"]],
     section["redFlag"])
    for section in COPY["PROOF_GAP_SECTIONS"]
]



def literal(value: str) -> str:
    value = value.translate(str.maketrans({"’": "'", "‘": "'", "“": '"', "”": '"', "—": ":", "–": "-", "→": ">"}))
    encoded = value.encode("latin-1")
    out = []
    for byte in encoded:
        if byte in (40, 41, 92):
            out.append("\\" + chr(byte))
        elif byte < 32 or byte > 126:
            out.append(f"\\{byte:03o}")
        else:
            out.append(chr(byte))
    return "(" + "".join(out) + ")"


commands = []
y = 754


def line(value: str, size: int = 8, gap: int = 10) -> None:
    global y
    commands.append(f"BT /F1 {size} Tf 40 {y} Td {literal(value)} Tj ET")
    y -= gap


line("Proof-gap checklist", 18, gap=23)
line(COPY["PROOF_GAP_H1"], 11, gap=16)
line("An action record names who acted, what changed, and when.")
line("Mark Yes / Partial / No. Count No + Partial; choose one gap to fix this week.", gap=17)

for title, checks, red_flag in SECTIONS:
    line(title, 10, gap=13)
    for check in checks:
        for part in wrap(check, width=125, subsequent_indent="    "):
            line(part, 7, gap=9)
    line(red_flag, 7, gap=12)

line(COPY["PROOF_GAP_SCORE_PROMPT"], 8)
line("One gap I will fix this week: ________________________________________________________", 8, gap=16)
line("Next: Review one gap yourself or book a Consultation at $300 per hour.", 9)
line(COPY["PROOF_GAP_LADDER"], 8)
line("Book a free 30-minute intro on revealuistudio.com.", 8, gap=16)
line("RevealUI Studio \u00b7 Proof-gap checklist", 8)

if y < 35:
    raise SystemExit(f"Checklist overflowed one page: y={y}")

stream = "\n".join(commands).encode("latin-1") + b"\n"
objects = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"endstream",
]

pdf = bytearray(b"%PDF-1.4\n%\x00\xe2\xe3\xcf\xd3\n")
offsets = [0]
for number, body in enumerate(objects, 1):
    offsets.append(len(pdf))
    pdf.extend(f"{number} 0 obj\n".encode() + body + b"\nendobj\n")
xref = len(pdf)
pdf.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode())
for offset in offsets[1:]:
    pdf.extend(f"{offset:010d} 00000 n \n".encode())
pdf.extend(
    f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
)
OUT.write_bytes(pdf)
print(f"wrote {OUT} ({len(pdf)} bytes)")
