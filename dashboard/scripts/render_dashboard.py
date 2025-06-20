import json
import html
from pathlib import Path

def render_profile_card(profile):
    name = profile.get("display_name") or profile.get("name", "Nostr User")
    about = profile.get("about", "")

    about = html.escape(profile.get("about", "")).replace("\n", "<br/>")

    picture = profile.get("picture", "")
    website = profile.get("website", "")
    lud16 = profile.get("lud16", "")
    banner = profile.get("banner", "")

    zap_html = f'<a href="lightning:{lud16}" title="Zap via Lightning"><img src="https://img.icons8.com/emoji/24/high-voltage.png"/></a>' if lud16 else ""

    return f"""
          <h1>🧾 Profile</h1>
        {'<img src="' + banner + '" class="profile-banner" />' if banner else ''}
        <div class="profile-details">
            {'<img src="' + picture + '" class="profile-avatar" />' if picture else ''}
            <h2>{name} {zap_html}</h2>
            <p>{about}</p>
            {'<p><a href="' + website + '">' + website + '</a></p>' if website else ''}
        </div>
    """

def render_summary_card(summary):

    return f"""
      <h1>🧾 Summary</h1>
      <ul class="summary">
          <li>📝 <a href='notes.html'>Notes: {summary['notes']}</a></li>
          <li>💬 <a href='replies.html'>Replies: {summary['replies']}</a></li>
          <li>🔁 Reposts: {summary['reposts']}</li>
          <li>❤️ Likes: {summary['likes']}</li>
          <li>🔐 DMs: {summary['dms']}</li>
          <li>📖 Articles: {summary['articles']['total']}</li>
          <ul class="summary-sublist">
              <li>✅ <a href ='articles.html'>Published: {summary['articles']['published']}</a></li>
              <li>🔄 Drafts: {summary['articles']['drafts']}</li>
              <li>🗑️ Deleted: {summary['articles']['deleted']}</li>
          </ul>
          <li>Other: {summary['other']}</li>
          <li>📊 Total: {summary['total']}</li>
      </ul>
    """


def render_dashboard(summary_path="data/summary.json", profile_metadata_path = "data/kind_0_profile_metadata.json", output_path="docs/dashboard.html"):
    
    try:
      with open(summary_path) as f:
          summary = json.load(f)
    except Exception as e:
      print("Error loading summary:", e)
      summary = []

    summary_card = render_summary_card(summary)    

    try:
      with open(profile_metadata_path) as f:
        profile_list = json.load(f)
        profile = json.loads(profile_list[0]["content"]) if profile_list else {}
    except Exception as e:
      print("Error loading profile:", e)
      profile = {}

    profile_card = render_profile_card(profile)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>MyContinuum Nostr Dashboard with Profile</title>
    <style>
    body {{
      font-family: Arial, sans-serif;
      background: #f8f9fa;
      margin: 0;
      padding: 2rem;
    }}
    .dashboard-container {{
      display: flex;
      gap: 2rem;
      align-items: flex-start;
    }}
    .profile-card {{
      max-width: 500px;
      background-color: #ffffff;
      border: 1px solid #ddd;
      border-radius: 10px;
      overflow: hidden;
      padding: 1rem 1.5rem;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }}
    .profile-banner {{
      width: 100%;
      height: 120px;
      object-fit: cover;
    }}
    .profile-details {{
      padding: 1rem;
    }}
    .profile-avatar {{
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 2px solid #eee;
      margin-bottom: 0.5rem;
    }}
    .profile-name {{
      font-size: 1.4rem;
      font-weight: bold;
      margin: 0.5rem 0 0.25rem;
    }}
    .profile-about {{
      font-size: 0.9rem;
      color: #555;
      margin-bottom: 0.5rem;
    }}
    .profile-link {{
      color: #007bff;
      text-decoration: none;
      font-size: 0.85rem;
    }}
    .summary-card {{
      flex-grow: 1;
      background-color: #ffffff;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 1rem 1.5rem;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    }}
    .summary-card h2 {{
      margin-top: 0;
      font-size: 1.5rem;
    }}
    .summary-list {{
      list-style: none;
      padding-left: 0;
      font-size: 1rem;
    }}
    .summary-list li {{
      padding: 0.4rem 0;
      border-bottom: 1px solid #eee;
    }}
    .summary-sublist li {{
      
    }}

    @media (max-width: 800px) {{
    .dashboard-container {{
      flex-direction: column;
      }}
    }}
  </style>
</head>
<body>
   <h1>My Continuum Dashboard With Profile View </h1>
    <div class="dashboard-container">
      <div class="profile-card">
        {profile_card}
      </div>  
      <div class="summary-card">
        {summary_card}
      </div>  
    </div>
</body>
</html>"""

    output_path = Path("docs/dashboard.html")
    output_path.parent.mkdir(parents=True, exist_ok=True)  # ✅ Ensures 'docs/' exists


    Path(output_path).write_text(html)
    print(f"Dashboard written to {output_path}")

if __name__ == "__main__":
    print("running render_dashboard")
    render_dashboard()

