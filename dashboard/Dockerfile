FROM python:3.11-slim

WORKDIR /app

COPY . /app


# Install all required dependencies
RUN pip install flask pandas python-dotenv markdown requests websockets bech32

CMD ["bash", "-c", "python scripts/fetch_nostr_data.py && python scripts/render_dashboard.py && python scripts/render_articles.py && python app.py"]
