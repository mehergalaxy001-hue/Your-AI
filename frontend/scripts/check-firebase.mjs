// Verifies the Firebase Web API key against Google's Identity Toolkit (Firebase Auth) API.
// Usage: npm run check:firebase   (checks the apiKey in src/lib/firebase.ts)
import fs from "node:fs";
const envFile = new URL("../.env", import.meta.url);
const fromFile = fs.existsSync(envFile) ? /^VITE_FIREBASE_API_KEY=(.*)$/m.exec(fs.readFileSync(envFile, "utf8"))?.[1]?.trim() : "";
const src = fs.readFileSync(new URL("../src/lib/firebase.ts", import.meta.url), "utf8");
const fallback = /apiKey: "([^"]+)"/.exec(src)?.[1];
const key = process.env.VITE_FIREBASE_API_KEY || fromFile || fallback;
const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(key)}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Referer: "http://localhost:5173/" },
  body: JSON.stringify({ providerId: "google.com", continueUri: "http://localhost:5173/" }),
});
const body = await res.json();
const reason = body?.error?.details?.find?.((d) => d.reason)?.reason || body?.error?.message;
if (res.ok) console.log("✓ Firebase API key is valid and Google sign-in is reachable.");
else if (reason === "API_KEY_INVALID") console.error("✗ API_KEY_INVALID: this key does not exist (typo, deleted, or from another project). Copy the Web app apiKey from Firebase Console.");
else if (/REFERER|REFERRER/i.test(reason)) console.error("✗ Key is restricted by HTTP referrer. Allow your site's domains in Google Cloud → Credentials.");
else if (/SERVICE_BLOCKED|blocked/i.test(reason)) console.error("✗ Key's API restrictions block Identity Toolkit API. Allow it in Google Cloud → Credentials.");
else if (/CONFIGURATION_NOT_FOUND|OPERATION_NOT_ALLOWED/.test(reason)) console.error("✗ Firebase Authentication isn't set up or Google sign-in is disabled. Enable it in Firebase Console → Authentication.");
else console.error("✗ Unexpected response:", reason);
process.exit(res.ok ? 0 : 1);
