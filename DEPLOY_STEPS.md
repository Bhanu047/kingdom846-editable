# Kingdom 846 → Live at kingdom846.com (step-by-step, no GitHub experience needed)

You will end up with your site live 24/7 at **kingdom846.com** with your database
saved on a persistent disk. Total time: ~20 minutes. Cost: $7/month (Render Starter,
required for a saved database).

---

## STEP 1 — Download the source and unzip it

1. Download the **"Kingdom 846 — Source Code"** zip file (shared with you).
2. Unzip it:
   - **Windows:** right-click the zip → **Extract All** → choose your Desktop.
   - **Mac:** double-click the zip → a folder called `kingdom846-editable` appears.
3. You now have a folder named **`kingdom846-editable`**. Remember where it is.

---

## STEP 2 — Create a GitHub account

1. Go to **https://github.com** and click **Sign up**.
2. Enter your email, create a password, pick a username (anything you like).
3. Complete the email verification and skip the "personalization" questions (or answer them — doesn't matter).
4. You now have a GitHub account.

---

## STEP 3 — Install GitHub Desktop

1. Go to **https://desktop.github.com** and click **Download for Windows** (or **Mac**).
2. Run the installer (just click Next through it).
3. Open **GitHub Desktop**.
4. Click **Sign in to GitHub.com** and log in with the GitHub account you just made.
5. Click **Finish**.

---

## STEP 4 — Put your files onto GitHub

1. In GitHub Desktop, top menu: **File → Add Local Repository…**
2. Click **Choose…** and select your **`kingdom846-editable`** folder (the one you unzipped).
3. It will say "this is not a Git repository" → click the blue **create a repository here** link.
4. A small window appears. Leave everything as-is and click **Create repository**.
5. Now the main screen shows a long list of files under "Changes". This is normal.
6. In the **Summary** box (top-left), type: `Initial commit`
7. Click the blue **Commit to main** button.
8. Click **Publish repository** (top-right, big button).
9. A window appears with the name `kingdom846-editable`. You can leave it public or check **Keep this code private** (recommended). Click **Publish repository**.
10. Wait a few seconds. Your files are now on GitHub. ✅

---

## STEP 5 — Create a Render account

1. Go to **https://render.com** and click **Get Started** (or **Sign up**).
2. Click **Continue with GitHub** and authorize Render to use your GitHub.
3. You're in. No credit card needed to sign up; you'll add one at deploy (Starter is $7/mo, required for a saved database).

---

## STEP 6 — Deploy the site (one click)

1. In Render, top-right: **New +** → **Blueprint**.
2. Select your **kingdom846-editable** repository.
3. Render reads the `render.yaml` file and shows a service named **kingdom-846**.
4. Click **Apply** (or **Create New Resources**).
5. It starts building. Click the **Events** or **Logs** tab to watch progress — first build takes ~2–3 minutes.
6. When it says **Live**, click the URL at the top: `https://kingdom-846.onrender.com`. Your site is live. ✅

If the build fails, open **Logs** and the error is usually at the bottom — copy it and send it to me.

---

## STEP 7 — Connect kingdom846.com

> You must already own the domain **kingdom846.com**. If you don't, buy it first from a registrar (Namecheap, Porkbun, GoDaddy, or Google Domains via Squarespace — about $10–15/year).

1. In Render, open your **kingdom-846** service → **Settings** tab → scroll to **Custom Domains**.
2. Click **Add Custom Domain**, type `kingdom846.com`, click **Add**.
3. Render shows you a **CNAME target** that looks like `king-846.onrender.com` (copy it).
4. Open your **domain registrar** (where you bought kingdom846.com) → DNS settings.
5. Add a record:
   - **Type:** CNAME
   - **Name / Host:** `@`  (use `www` too if you want www.king846.com)
   - **Target:** paste the Render value (`king-846.onrender.com`)
6. Save. DNS can take a few minutes to a few hours to spread.
7. Back in Render, the custom domain will show a green check once DNS + the free SSL certificate are ready.

Your site is now live at **https://kingdom846.com**. 🎉

---

## STEP 8 — Change the default passwords (important)

1. Open your live site → click **Royal Access** (sidebar).
2. Log in with `sparta` / `SpartaAdmin_846!`.
3. Open the **Master** page → **Kingdom Status** (edit the king/alliance anytime), **My Sparta Login** (change your own admin password), and reset each leader's password.
4. Give each leader their new login so they can upload their roster.

Default logins are only meant for the very first sign-in.

---

## If something breaks

- **Build fails on Render:** open Logs → copy the bottom error → send to me.
- **Site shows "Cannot GET /":** make sure the build finished and shows "Live"; the first build can take a few minutes.
- **Database empty after a change:** it shouldn't be — the 1 GB persistent disk at `/var/data` keeps `data.db` across restarts and redeploys. Only a manual wipe would lose it.
- **Domain not loading:** DNS hasn't propagated yet — wait up to a few hours, or check your registrar's DNS record is correct.

I've already prepared the `Dockerfile`, `render.yaml`, and `DEPLOY.md` in the source zip — you don't need to edit anything.
