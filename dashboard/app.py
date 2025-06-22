from flask import Flask, request, redirect, render_template, send_from_directory
import subprocess


app = Flask(__name__, static_folder="static", template_folder="templates")

# top level index

@app.route("/")
def index():
    return render_template("index.html")

# nostr routes

@app.route("/nostr/dashboard/")
def nostr_dashboard():
    return render_template("nostr/dashboard.html")

@app.route('/nostr/posts/')
def nostr_posts():
    return render_template('nostr/posts.html')

@app.route('/nostr/replies/')
def nostr_replies():
    return render_template('nostr/replies.html')

@app.route('/nostr/articles/')
def nostr_articles():
    return render_template('nostr/articles.html')

@app.route('/nostr/timeline/')
def nostr_timeline():
    return render_template('nostr/timeline.html')    


@app.route('/update')
def update_dashboard():
    npub = request.args.get('npub')
    print("npub from request: ", npub)
    if not npub:
        # redirect to the dashboard with prompt if no npub provided
        return redirect("/nostr/dashboard/?prompt=true")
    
    # optional: convert npub to hex here if needed
    subprocess.run(["python", "scripts/fetch_nostr_data.py", "--npub", npub])

    return redirect("/nostr/dashboard/")


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)
    
@app.route('/data/<path:filename>')
def serve_data(filename):
    return send_from_directory('data', filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)