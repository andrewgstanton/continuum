from flask import Flask, send_from_directory

app = Flask(__name__, static_folder="docs")

@app.route("/")
def home():
    return "<h1>MyContinuum Dashboard</h1><p>Go to <a href='/dashboard.html'>dashboard.html</a></p>"

@app.route("/dashboard.html")
def dashboard():
    return send_from_directory("docs", "dashboard.html")

@app.route('/notes.html')
def notes():
    return send_from_directory('docs', 'notes.html')

@app.route('/replies.html')
def replies():
    return send_from_directory('docs', 'replies.html')

@app.route('/articles.html')
def articles():
    return send_from_directory('docs', 'articles.html')

@app.route('/timeline.html')
def timeline():
    return send_from_directory('docs', 'timeline.html')    

@app.route('/data/<path:filename>')
def serve_data(filename):
    return send_from_directory('data', filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)