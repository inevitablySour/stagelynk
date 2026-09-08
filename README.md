# StageLynk

This guide will walk you through setting up this project on your own computer and opening it in your web browser, step by step. It assumes you have never done this before, so nothing is skipped.

You only need to do the setup steps once. After that, starting the project each day only takes one command.

## What you will install

- Node.js: the program that runs this project on your computer
- Git: a tool for downloading and managing the project code (you may already have this if you downloaded the project as a zip instead, in which case you can skip Git)
- A code editor is not required, but a plain text editor will be needed to create one configuration file

Everything below is free.

---

## Step 1: Install Node.js

Node.js is required to run this project.

### macOS

1. Open your web browser and go to https://nodejs.org
2. Click the button that says "LTS" (this stands for Long Term Support, the stable version)
3. Once downloaded, open the file (it will be in your Downloads folder, usually named something like `node-v20.x.x.pkg`)
4. Follow the installer prompts, clicking "Continue" and "Install" as needed
5. Enter your Mac password if asked
6. When finished, click "Close"

To confirm it installed correctly:

1. Open the "Terminal" app (press `Command + Space`, type `Terminal`, press `Enter`)
2. Type the following and press `Enter`:
   ```
   node -v
   ```
3. You should see a version number appear, such as `v20.11.0`. If you do, Node.js is installed correctly.

### Windows

1. Open your web browser and go to https://nodejs.org
2. Click the button that says "LTS"
3. Once downloaded, open the file (it will be in your Downloads folder, usually named something like `node-v20.x.x-x64.msi`)
4. Follow the installer prompts, clicking "Next" each time, and "Install" when prompted
5. Allow the app to make changes to your computer if asked
6. When finished, click "Finish"

To confirm it installed correctly:

1. Open the "Command Prompt" app (press the Windows key, type `cmd`, press `Enter`)
2. Type the following and press `Enter`:
   ```
   node -v
   ```
3. You should see a version number appear, such as `v20.11.0`. If you do, Node.js is installed correctly.

### Linux

1. Open your terminal application
2. Run the following commands one at a time, pressing `Enter` after each:
   ```
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
   (If you are not using a Debian/Ubuntu-based system, visit https://nodejs.org and follow the instructions for your distribution instead.)
3. Confirm it installed correctly:
   ```
   node -v
   ```
4. You should see a version number appear, such as `v20.11.0`.

---

## Step 2: Get the project code

If you already have this project folder on your computer (for example, you downloaded it as a zip file and extracted it), skip to Step 3.

Otherwise, you will need Git to download it.

### macOS

1. Open "Terminal"
2. Check if Git is already installed:
   ```
   git -v
   ```
3. If it is not installed, your Mac will prompt you to install the "Command Line Developer Tools." Click "Install" and wait for it to finish.
4. Navigate to the folder where you want the project to live, for example your Documents folder:
   ```
   cd ~/Documents
   ```
5. Download the project (replace the example URL with the actual project URL you were given):
   ```
   git clone <the-project-url>
   ```
6. Move into the new project folder:
   ```
   cd stagelynk
   ```

### Windows

1. Download Git from https://git-scm.com/downloads/win
2. Open the downloaded file and click "Next" through the installer using the default options, then "Install"
3. Open "Command Prompt"
4. Navigate to the folder where you want the project to live, for example your Documents folder:
   ```
   cd %USERPROFILE%\Documents
   ```
5. Download the project (replace the example URL with the actual project URL you were given):
   ```
   git clone <the-project-url>
   ```
6. Move into the new project folder:
   ```
   cd stagelynk
   ```

### Linux

1. Open your terminal
2. Install Git if you do not already have it:
   ```
   sudo apt-get install -y git
   ```
3. Navigate to the folder where you want the project to live:
   ```
   cd ~/Documents
   ```
4. Download the project (replace the example URL with the actual project URL you were given):
   ```
   git clone <the-project-url>
   ```
5. Move into the new project folder:
   ```
   cd stagelynk
   ```

---

## Step 3: Install the project's dependencies

Dependencies are the pieces of code this project needs in order to run. From inside the project folder (the `stagelynk` folder you moved into in Step 2), run:

```
npm install
```

This may take a minute or two. You will see a lot of text scroll by. That is normal. When it finishes, you will see your cursor return, ready for a new command.

---

## Step 4: Set up your configuration file

This project needs a small configuration file that tells it how to connect to its database and keep user logins secure. This file is never uploaded anywhere and is private to your computer.

1. In the project folder, find the file named `.env.example`
2. Make a copy of it and rename the copy to `.env`

   On macOS or Linux, you can do this in the terminal:
   ```
   cp .env.example .env
   ```

   On Windows, you can do this in Command Prompt:
   ```
   copy .env.example .env
   ```

3. Open the new `.env` file in a plain text editor (Notepad on Windows, TextEdit on macOS, or any code editor)

4. At minimum, fill in these two values with your database connection details (these come from your database provider, such as Supabase):
   ```
   DATABASE_URL=""
   DIRECT_URL=""
   ```
   If you do not yet have a database, see "Setting up a free database" below before continuing.

5. Generate a secret value for login security. Back in your terminal, run:
   ```
   npx auth secret
   ```
   This will automatically add a secret value to your `.env` file for you.

6. Save and close the `.env` file.

Everything else in the `.env` file (Google login, GitHub login, Spotify, Apple Music, etc.) is optional. You can leave those blank and the project will still run. They only need to be filled in if you want those specific login or import features to work.

### Setting up a free database

This project stores its data in a Postgres database. The easiest free option is Supabase:

1. Go to https://supabase.com and create a free account
2. Create a new project (choose any name and a password you will remember)
3. Once the project is created, go to "Project Settings" then "Database"
4. Under "Connection string," copy the "Transaction pooler" connection string into `DATABASE_URL` in your `.env` file
5. Copy the "Direct connection" string into `DIRECT_URL` in your `.env` file
6. Replace the `[YOUR-PASSWORD]` placeholder in both strings with the database password you chose when creating the project

---

## Step 5: Set up the database tables

Once your `.env` file has a working `DATABASE_URL` and `DIRECT_URL`, run this command from the project folder to create the necessary tables in your database:

```
npm run db:push
```

You only need to run this once, or again later if the project's data structure changes.

---

## Step 6: Start the project

From the project folder, run:

```
npm run dev
```

Wait for a message in the terminal that looks like:

```
Local:   http://localhost:3000
```

---

## Step 7: Open the webpage

Open your web browser (Chrome, Safari, Firefox, Edge, etc.) and go to:

```
http://localhost:3000
```

You should now see the website running on your own computer.

To stop the project, go back to your terminal window and press `Control + C` (on all of macOS, Windows, and Linux).

---

## Running the project again later

Once everything above is set up, you do not need to repeat all the steps every time. Each time you want to run the project again:

1. Open your terminal (Terminal, Command Prompt, or your Linux terminal)
2. Navigate back into the project folder, for example:
   ```
   cd ~/Documents/stagelynk
   ```
3. Run:
   ```
   npm run dev
   ```
4. Open your browser to `http://localhost:3000`

---

## Troubleshooting

**"npm: command not found" or "'npm' is not recognized"**
Node.js was not installed correctly, or you need to restart your terminal (or your computer) after installing it. Revisit Step 1.

**The page will not load in the browser**
Check the terminal window running `npm run dev` for red error text. Make sure it says the server is running on `http://localhost:3000` before opening the browser.

**Database connection errors**
Double check that `DATABASE_URL` and `DIRECT_URL` in your `.env` file are filled in correctly, with no extra spaces, and that the password in the connection string matches your database password exactly.

**Port 3000 is already in use**
This means another program on your computer is already using that address. Close any other running copies of this project, or restart your computer, then try `npm run dev` again.
