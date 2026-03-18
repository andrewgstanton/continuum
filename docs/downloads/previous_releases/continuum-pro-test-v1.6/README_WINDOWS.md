
# Continuum Install - Windows

Continuum is a small, **local-first** tool for publishing profiles, notes, long-form posts (articles) and secure messages (DMs) using Nostr.

Nothing runs in the cloud.  
No accounts. No sign-ups.  
Everything happens on your machine.

---

## What you need

- Windows 10 or 11
- Docker Desktop installed on Windows  
  https://www.docker.com/products/docker-desktop
- Terminal access  
  (On Windows, use **Terminal in admin mode**)

> **Note:** All commands below are run inside a **WSL (Linux) terminal** unless explicitly stated otherwise.

---

## Step 1 – Unzip the package

- Download the zip from the link I shared
- Expand it (I expanded it in the **Downloads** directory on my Windows machine)

---

## Step 2 – Install WSL (if not already installed)

Open a terminal session **in admin mode**:

- Double-click the **Terminal** app  
  **OR**
- Right-click Start → **Terminal (Admin)**

(You may be prompted to allow system changes — this is required for WSL and Docker.)

In the terminal, run:

```
wsl --version
```

If you see something like:

```
WSL version: 2.x
```

You’re good.

If WSL is not installed, run:

```
wsl --install
```

You may need to reboot after installation.

## Step 3 – Start a WSL session

In the same terminal, start WSL:

```
wsl
```

## Step 4 – Verify Download (Recommended)

Before proceeding, verify the integrity of the ZIP file.

Open a WSL terminal and navigate to your Downloads folder:

```
cd /mnt/c/Users/<YourUsername>/Downloads
```

Run:

```
sha256sum continuum-pro-test-<version>.zip
```

You will see output like:

```
<hash> continuum-pro-test-<version>.zip
```

(where <hash> should MATCH the value in the checksum file:
continuum-pro-test-<version>.zip.sha256.txt)

Replace <version> with the version you downloaded (for example: v1.6).

If it matches, continue.
If not, re-download the file.

## Step 5 – Start Docker Desktop

Open Docker Desktop

Wait until Docker shows as Running

## Step 6 – Continue Setup

In the WSL terminal, navigate to the folder where the zip was expanded (usually in Downloads):

```
cd UNZIPPED_PACKAGE_LOCATION
```

On my machine this was:

```
cd /mnt/c/Users/astan/Downloads/continuum-pro-test-<version>
```

(/mnt/c maps to your Windows C:\ drive.)

Then move into the dashboard directory:

```
cd dashboard
```

### 🔁 From here, instructions are the same as Mac

You should now be inside the project directory in WSL.

At this point, you are running inside a Linux (WSL) environment.

This means:

- The commands are the same as Mac/Linux
- The scripts (`./run.sh`, `./load.sh`, etc.) work the same way
- You can follow the Mac instructions starting from Step 4

👉 Continue with: README_MAC.md (starting from Step 4 – “Ensure scripts are executable”)

