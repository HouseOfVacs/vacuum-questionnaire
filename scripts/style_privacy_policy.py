"""Restyle Termly's HTML-format privacy policy to match thehouseofvacs.com, for a Squarespace Code Block.

    python3 scripts/style_privacy_policy.py "docs/Privacy Policy 2026.html" docs/privacy-policy-squarespace.html

- Drops Termly's own <style> blocks (they apply to the whole Squarespace page, with Arial and grey text).
- Scopes the site's look (Noto Serif headings, Lato text, navy ink, plum hover) to a .hov-policy wrapper,
  overriding Termly's inline grey/15px styles.
- Removes Termly's empty placeholder tags (<bdt></bdt>, empty <span>s) to cut the size.
- Lines up Termly's stacked tables and lets them wrap to fit a phone screen.
- Keeps every word, link, anchor and the Termly credit line unchanged.
Re-run after each new Termly export.
"""
import re
import sys

CSS = """
<style>
  .hov-policy {
    --ink: #1e2f3e; --soft: rgba(30, 47, 62, 0.72); --plum: #52414c;
    --line: rgba(30, 47, 62, 0.15); --tint: rgba(226, 208, 202, 0.45);
    max-width: 820px; margin: 0 auto; color: var(--ink);
    font-family: Lato, system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 17px; line-height: 1.6;
    overflow-wrap: break-word;
  }
  .hov-policy, .hov-policy * {
    font-family: Lato, system-ui, -apple-system, "Segoe UI", sans-serif !important;
    color: var(--ink) !important; font-size: inherit !important; background: transparent !important;
    letter-spacing: normal !important;
  }
  .hov-policy { font-size: 17px !important; line-height: 1.6 !important; }
  .hov-policy h1, .hov-policy h1 * {
    font-family: "Noto Serif", Georgia, serif !important; font-weight: 500 !important;
    font-size: clamp(30px, 6vw, 40px) !important; line-height: 1.2 !important; margin: 0 0 4px !important;
  }
  .hov-policy h2, .hov-policy h2 * {
    font-family: "Noto Serif", Georgia, serif !important; font-weight: 500 !important;
    font-size: clamp(19px, 3vw, 22px) !important; line-height: 1.35 !important; letter-spacing: 0.01em !important;
  }
  .hov-policy h2 { margin: 36px 0 10px !important; padding-top: 28px !important; border-top: 1px solid var(--line) !important; }
  .hov-policy h3, .hov-policy h3 * {
    font-family: "Noto Serif", Georgia, serif !important; font-weight: 500 !important;
    font-size: 19px !important; line-height: 1.4 !important;
  }
  .hov-policy h3 { margin: 26px 0 8px !important; }
  .hov-policy [data-custom-class='subtitle'], .hov-policy [data-custom-class='subtitle'] * { color: var(--soft) !important; font-size: 15px !important; }
  .hov-policy strong, .hov-policy b { font-weight: 700 !important; }
  .hov-policy h1 strong, .hov-policy h2 strong, .hov-policy h3 strong { font-weight: 500 !important; }
  .hov-policy em, .hov-policy i { font-style: italic !important; }
  .hov-policy a, .hov-policy a * {
    color: var(--ink) !important; text-decoration: underline !important; text-underline-offset: 3px;
    text-decoration-color: rgba(30, 47, 62, 0.45) !important; word-break: break-word;
  }
  .hov-policy a:hover, .hov-policy a:hover * { color: var(--plum) !important; text-decoration-color: var(--plum) !important; }
  .hov-policy ul { list-style-type: square; padding-left: 1.4em; margin: 6px 0; }
  .hov-policy ul ul { list-style-type: circle; }
  .hov-policy li { margin: 4px 0; }
  .hov-policy li::marker { color: var(--plum); }
  .hov-policy [id] { scroll-margin-top: 120px; }   /* table-of-contents jumps land below the fixed site header */
  /* Termly splits one table into several stacked tables with the same column widths; fixed layout keeps them lined up */
  .hov-policy table { width: 100% !important; table-layout: fixed; border-collapse: collapse !important; border: 0 !important; margin: 0 !important; }
  .hov-policy table, .hov-policy table * { font-size: 15px !important; line-height: 1.5 !important; }
  .hov-policy th, .hov-policy td {
    border: 1px solid var(--line) !important; padding: 10px 12px !important; vertical-align: top !important;
    text-align: left !important; overflow-wrap: anywhere; hyphens: auto;
  }
  .hov-policy th { background: var(--tint) !important; }
  .hov-policy th, .hov-policy th * { font-weight: 700 !important; }
  @media (max-width: 560px) {
    .hov-policy table, .hov-policy table * { font-size: 13.5px !important; }
    .hov-policy th, .hov-policy td { padding: 8px 6px !important; }
    /* give "Collected" room on phones (Termly's widths are 34% / 51% / 15%) */
    .hov-policy tr > :nth-child(1):nth-last-child(3) { width: 30% !important; }
    .hov-policy tr > :nth-child(2):nth-last-child(2) { width: 45% !important; }
    .hov-policy tr > :nth-child(3):last-child { width: 25% !important; }
  }
  .hov-policy .hov-credit, .hov-policy .hov-credit * { color: var(--soft) !important; font-size: 13px !important; }
</style>
"""


def restyle(src: str) -> str:
    html = re.sub(r"(?is)<style\b[^>]*>.*?</style>", "", src)               # Termly's page-wide styles
    while True:                                                              # empty placeholders, innermost first
        smaller = re.sub(r"<(bdt|span)\b[^>]*></\1>", "", html)
        if smaller == html:
            break
        html = smaller
    html = html.replace("<div><span data-custom-class='body_text'>This Privacy Policy was created using Termly",
                        "<div class=\"hov-credit\"><span data-custom-class='body_text'>This Privacy Policy was created using Termly")
    return CSS.strip() + '\n<div class="hov-policy">\n' + html.strip() + "\n</div>\n"


if __name__ == "__main__":
    src_path, out_path = sys.argv[1], sys.argv[2]
    src = open(src_path, encoding="utf-8").read()
    out = restyle(src)
    open(out_path, "w", encoding="utf-8").write(out)
    words = lambda s: len(re.sub(r"<[^>]+>", " ", s).split())
    print(f"{len(src):,} bytes -> {len(out):,} bytes; words before {words(src):,}, after {words(out) - words(CSS):,}")
