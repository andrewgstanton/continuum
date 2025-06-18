from flask import Flask, send_from_directory

app = Flask(__name__, static_folder="docs")

@app.route("/")
def home():
    return "<h1>MyContinuum Dashboard</h1><p>Go to <a href='/dashboard.html'>dashboard.html</a></p>"

@app.route("/dashboard.html")
def dashboard():
    return send_from_directory("docs", "dashboard.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)