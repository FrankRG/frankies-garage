# Frankie's Garage 🚗

A calm, simple speech-practice app for iPad. Cartoon versions of Mom and Dad say short, useful phrases **in your own recorded voices**, with the same little movie every time. Then the scene pauses so Frankie can fill in the last word.

Nothing is uploaded. Recordings, cartoons and progress stay on the iPad.

## What's inside

| Activity | What happens | Why |
|---|---|---|
| 🎬 **Say it with me** | Pick a scene. Cartoon Dad says "Ready, set… GO!" and the car zooms off. Exactly the same every time. | Video modeling: kids who memorize movie lines learn well from short, repeatable clips of familiar people. |
| 👂 **Finish it** | The same scene pauses before the last word ("Ready, set… 👂"). The cartoon leans in and waits. If he says it, tap **👍 said it!** for a celebration. If not, the cartoon says it warmly. | Fill-in-the-blank (cloze): turns a memorized script into him producing the word himself. |
| 🚗 **Word garage** | Big picture tiles (go, stop, more, up, open, help, car, ball…). Tap one and the cartoon says it and acts it out. "2 words" mode builds "more car", "go up", and so on. | Moves from single words toward 2-word combinations. |

**Grown-ups area** (press and hold ⚙️ in the top-right corner for 3 seconds):
- **Family**: make the cartoons look like you (skin, hair, beard, glasses, shirt, Frankie's car color).
- **Voices**: record every phrase and word in your own voice. Anything not recorded uses the iPad's built-in voice.
- **Phrases / Words**: turn items on or off, choose who says them, pick the animation, add your own.
- **Progress**: counts of "said it!" taps, plus a one-tap summary to send his speech therapist.
- **Settings**: wait time for "Finish it", session timer (gentle "All done!" screen), sounds.
- **Tips**: how to get the most out of it.

---

## Putting it on the iPad (one time, about 10 minutes)

The iPad needs to load the app from a secure `https://` web address. That's what allows microphone recording and the Home Screen install. The free, simple way is **GitHub Pages**.

### Option A: GitHub Pages (recommended, free)
1. Make a free account at https://github.com.
2. Click **+** → **New repository**. Name it `frankies-garage`, choose **Public**, then **Create repository**.
3. Click **uploading an existing file**. Drag in everything from this folder (`index.html`, `manifest.json`, `sw.js`, and the `css`, `js` and `icons` folders), then **Commit changes**.
4. Go to **Settings** → **Pages**. Under "Branch," choose `main` and `/ (root)`, then **Save**.
5. After about a minute your app is at `https://YOUR-USERNAME.github.io/frankies-garage/`.

> The *app code* is public, but **your recordings and progress are not**. They never leave the iPad.

### Add it to the Home Screen
1. Open that address in **Safari** on the iPad.
2. Tap the **Share** button (square with an arrow) → **Add to Home Screen** → **Add**.
3. Open it from the new 🚗 **Garage** icon. It runs full-screen like a normal app and works offline.

### Lock Frankie into the app (optional)
**Settings → Accessibility → Guided Access → On.** Open the Garage app, then triple-click the top (or side) button to start. Triple-click again and enter your passcode to exit.

---

## First-time setup (in the app)
1. Press and hold ⚙️ for 3 seconds.
2. **Family** tab: make cartoon Mom, Dad, and Frankie.
3. **Voices** tab: tap ● to record, say the words, tap ■. Start with the phrases he likes best.
4. Tap **Done ✓**, and try **Say it with me** together.

## Trying it on a computer first
From this folder, run `python -m http.server 8000`, then open http://localhost:8000 in Chrome or Safari. (Recording works on `localhost`. On another device it needs the https address.)

## Updating the app later
If you change any files, open `sw.js` and bump `VERSION` (for example to `garage-v2`), then upload again. The iPad picks up the new version the next time it opens the app online.

---

*This supports Frankie's speech therapy. It does not replace it. Share it with his speech therapist so they can suggest phrases, and ask them about gestalt language processing.*
