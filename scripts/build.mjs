// Copies the static web app into www/ for Capacitor.
import { cpSync, mkdirSync, rmSync } from "node:fs";

const files = ["index.html", "privacy.html", "styles.css", "app.js", "manifest.webmanifest", "sw.js", "icons"];
rmSync("www", { recursive: true, force: true });
mkdirSync("www");
for (const f of files) cpSync(f, `www/${f}`, { recursive: true });
console.log("Built www/ with", files.join(", "));
