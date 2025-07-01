FROM python:3.11-slim

WORKDIR /app

COPY . /app

# Install build tools and secp256k1 C library
RUN apt-get update && apt-get install -y \
    build-essential \
    libsecp256k1-dev \
    python3-dev \
    gcc \
    make \
    && rm -rf /var/lib/apt/lists/*

RUN apt update && apt install -y sqlite3   

# Install Python dependencies
RUN pip install --no-cache-dir \
    flask pandas python-dotenv markdown requests websockets bech32 secp256k1 markdown2

CMD ["bash"]
