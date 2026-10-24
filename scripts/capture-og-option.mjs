import puppeteer from "puppeteer-core";
import { mkdir, rm, copyFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const theme = process.argv[2];
if (!theme) {
  console.error("Usage: node scripts/capture-og-option.mjs <theme>");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const framesDir = `/tmp/og-option-${theme}-frames`;
const htmlPath = path.join(__dirname, "og-options.html");
const outDir = path.join(root, "assets", "og-options");
const outVideo = path.join(outDir, `${theme}.mp4`);
const outImage = path.join(outDir, `${theme}.jpg`);
const posterPng = `/tmp/og-option-${theme}-poster.png`;

const TOTAL_FRAMES = 240; // 8s @ 30fps — snappy for option browsing
const FPS = 30;

async function run(cmd, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
await mkdir(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"]
});

const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => { window.__capturing = true; });
const url = `${pathToFileURL(htmlPath).href}?theme=${encodeURIComponent(theme)}`;
await page.goto(url, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await page.waitForFunction(() => typeof window.__render === "function" && window.__ready === true, {
  timeout: 30000
});

for (let i = 0; i < TOTAL_FRAMES; i++) {
  await page.evaluate((frame, total) => window.__render(frame, total), i, TOTAL_FRAMES);
  await page.screenshot({
    path: path.join(framesDir, `frame-${String(i).padStart(4, "0")}.png`),
    type: "png"
  });
  if (i % 40 === 0) process.stdout.write(`[${theme}] ${i}/${TOTAL_FRAMES}\n`);
}

await page.evaluate((frame, total) => window.__render(frame, total), 30, TOTAL_FRAMES);
await page.screenshot({ path: posterPng, type: "png" });
await browser.close();

await run("ffmpeg", [
  "-y", "-framerate", String(FPS),
  "-i", path.join(framesDir, "frame-%04d.png"),
  "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", "-an", "-crf", "23", "-preset", "fast",
  outVideo
]);

await run("ffmpeg", ["-y", "-i", posterPng, "-q:v", "3", outImage]);
await copyFile(posterPng, path.join(outDir, `${theme}.png`));
process.stdout.write(`wrote ${outVideo}\n`);
