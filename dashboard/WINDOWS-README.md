## 🪟 Windows Setup Notes

1. ✅ Install WSL (Windows Subsystem for Linux)
MyContinuum uses a Linux-based Docker container, which requires WSL on Windows.

Run this in PowerShell as Administrator:

```
wsl --install
```
Restart your machine if prompted.

2. 🐳 Install Docker Desktop for Windows

- Enable WSL 2 integration during installation
- Start Docker Desktop manually before running the project
- Verify Docker is working:

```
docker version
```

3. 📁 Prepare Identity Config

From the project root:

```
mkdir identity
copy local_identity.json-sample data\identity\local_identity.json
```

Then edit identity\local_identity.json in your preferred editor:

```
{
  "npub": "your_npub_here",
  "nsec": "your_nsec_here_or_blank",
  "timezone": "America/Los_Angeles",
  "relays": [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net"
  ]
}
```

4. 🛠️ Build and Run (WSL or Git Bash)

- set the helper shell scripts executable 

```
cd dashboard
chmod +x *.sh
```
- clear out any stale containers

```
./clean.sh
```

- build the docker image

```
./build.sh
```

- run the app

```
./run.sh
```


