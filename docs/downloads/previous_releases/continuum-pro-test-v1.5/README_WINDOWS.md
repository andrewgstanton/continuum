
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

## Step 3 – Start Docker Desktop

Open Docker Desktop

Wait until Docker shows as Running

## Step 4 – Start a WSL session

In the same terminal, start WSL:

```
wsl
```

At this point, you are inside a Linux environment.

Navigate to the folder where the zip was expanded (usually in Downloads):

```
cd UNZIPPED_PACKAGE_LOCATION
```

On my machine this was:

```
cd /mnt/c/Users/astan/Downloads/continuum-pro-test
```

(/mnt/c maps to your Windows C:\ drive.)

Then:

```
cd dashboard
```

👉 **Continue with: `README_FIRST_MAC.md`**

(starting from Step 3)
