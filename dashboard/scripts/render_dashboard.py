import json
from pathlib import Path

def render_dashboard(summary_path="data/summary.json", output_path="docs/dashboard.html"):
    with open(summary_path) as f:
        summary = json.load(f)

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MyContinuum Nostr Dashboard</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 2rem; }}
        .summary, .articles {{ margin-bottom: 2rem; }}
        h1 {{ font-size: 1.8rem; }}
        ul {{ list-style: none; padding: 0; }}
        li {{ padding: 0.2rem 0; }}
    </style>
</head>
<body>
    <h1>🧾 Summary</h1>
    <ul class="summary">
        <li>📝 Notes: {summary['notes']}</li>
        <li>💬 Replies: {summary['replies']}</li>
        <li>🔁 Reposts: {summary['reposts']}</li>
        <li>❤️ Likes: {summary['likes']}</li>
        <li>🔐 DMs: {summary['dms']}</li>
        <li>📖 Articles: {summary['articles']['total']}</li>
        <ul>
            <li>✅ Published: {summary['articles']['published']}</li>
            <li>🔄 Drafts: {summary['articles']['drafts']}</li>
            <li>🗑️ Deleted: {summary['articles']['deleted']}</li>
        </ul>
        <li>Other: {summary['other']}</li>
        <li>📊 Total: {summary['total']}</li>
    </ul>
</body>
</html>"""

    output_path = Path("docs/dashboard.html")
    output_path.parent.mkdir(parents=True, exist_ok=True)  # ✅ Ensures 'docs/' exists


    Path(output_path).write_text(html)
    print(f"Dashboard written to {output_path}")

if __name__ == "__main__":
    print("running render_dashboard")
    render_dashboard()