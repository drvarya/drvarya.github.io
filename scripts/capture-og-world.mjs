import puppeteer from "puppeteer-core";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const framesDir = "/tmp/og-world-frames";
const htmlPath = path.join(__dirname, "og-world.html");
const outVideo = path.join(root, "assets", "og-video.mp4");
const outImage = path.join(root, "assets", "og-image.jpg");

const TOTAL_FRAMES = 300; // 10s @ 30fps, matches nikunjk.com duration
const FPS = 30;

async function run(cmd, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"]
});

const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => { window.__capturing = true; });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await page.waitForFunction(() => typeof window.__render === "function" && window.__ready === true, {
  timeout: 30000
});

for (let i = 0; i < TOTAL_FRAMES; i++) {
  await page.evaluate((frame, total) => window.__render(frame, total), i, TOTAL_FRAMES);
  const file = path.join(framesDir, `frame-${String(i).padStart(4, "0")}.png`);
  await page.screenshot({ path: file, type: "png" });
  if (i % 30 === 0) process.stdout.write(`captured ${i}/${TOTAL_FRAMES}\n`);
}

// poster = mid-day-ish frame
await page.evaluate((frame, total) => window.__render(frame, total), 40, TOTAL_FRAMES);
await page.screenshot({ path: "/tmp/og-world-poster.png", type: "png" });
await browser.close();

await run("ffmpeg", [
  "-y",
  "-framerate", String(FPS),
  "-i", path.join(framesDir, "frame-%04d.png"),
  "-c:v", "libx264",
  "-profile:v", "high",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  "-an",
  "-crf", "23",
  "-preset", "slow",
  outVideo
]);

await run("ffmpeg", [
  "-y",
  "-i", "/tmp/og-world-poster.png",
  "-q:v", "3",
  outImage
]);

process.stdout.write(`wrote ${outVideo} and ${outImage}\n`);
