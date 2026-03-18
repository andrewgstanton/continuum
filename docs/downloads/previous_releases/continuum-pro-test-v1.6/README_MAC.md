# Continuum Install - MacOS

Continuum is a small, **local-first** tool for publishing profiles, notes, and long-form posts (articles) using Nostr.

Nothing runs in the cloud.  
No accounts. No sign-ups.  
Everything happens on your machine.


---

## What you need

- macOS  
- Docker Desktop  
  https://www.docker.com/products/docker-desktop
- Terminal access  

---

## Step 1 – Install Docker

Before you do anything else

1. download docker desktop for Mac

https://docs.docker.com/desktop/setup/install/mac-install

2. Select Mac with Apple Silicon or Intel as appropriate to your Mac

3. Install the application (may prompt you to allow installation)

NOTE: If you already have Docker Installed make sure it is started and jump to Step 5, sometimes it will prompt to Upgrade first.

4. Start docker 

5. Run this command in a terminal window 

-> If you have not used terminal before search for "Terminal" app in Utilities and double click to start or use Finder and search for "Terminal"

```
docker run hello-world
```

it should say 

"Hello from Docker"

If it does you are done, if it says "Docker not running" you need Start Docker -> Double click in the Docker app in Applications.


## Step 2 – Unzip the package

Open Terminal and navigate to the folder where you unzipped the package:

usually in your Downloads folder.

## Step 3 – Verify Download (Recommended)

Before proceeding, verify the integrity of the ZIP file.

In Terminal, navigate to your Downloads folder:

```
cd ~/Downloads
```

Run:

```
shasum -a 256 continuum-pro-test-<version>.zip
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

## Step 4 - Navigate to the dashboard

Now move into the unzipped project directory:

```
cd ~/Downloads/continuum-pro-test-<version>/dashboard
```

From this directory, run

```
chmod +x *.sh
```

## Step 5 – Verify platform

From the dashboard directory, run:

```
./load.sh
./verify_platform.sh
```

You should see:

linux/amd64

If you do, you’re good to continue.

## Step 6 - Run Continuum
From the dashboard directory, run:

```
./run.sh
```

Then open your browser to:

```
http://127.0.0.1:5000/nostr/dashboard
```

(First load may take a few seconds.)

---


## Use a new key pair

### Create new key pair  from the Welcome page-

Click "Create New Identity"
Give your identity a nickname
Click "Create Identity" 

You will be directed back to the Nostr Dashboard

Run through these tests:

- Create your new profile for your new npub (Click "Create Profile" to start)
- Publish, edit and delete a short article (Click "Write Article" to start)
- Publish, edit and delete a short note (Click "Wrote Note" to start)

## Feedback

- Was anything confusing?
- Did anything feel unnecessary?
- Where did you pause or hesitate?

---

You are welcome to use Continuum for personal use subject to the terms in the notice.md
