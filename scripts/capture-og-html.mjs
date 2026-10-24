import puppeteer from "puppeteer-core";
import { mkdir, rm, copyFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const htmlRel = process.argv[2];
const outStem = process.argv[3] || "og-video";
if (!htmlRel) {
  console.error("Usage: node scripts/capture-og-html.mjs <html-relpath> [out-stem]");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, htmlRel);
const framesDir = `/tmp/og-capture-${outStem}-frames`;
const outVideo = path.join(root, "assets", `${outStem}.mp4`);
const outImage = path.join(root, "assets", `${outStem === "og-video" ? "og-image" : outStem}.jpg`);
const posterPng = `/tmp/og-capture-${outStem}-poster.png`;

const TOTAL_FRAMES = 300;
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
  await page.screenshot({
    path: path.join(framesDir, `frame-${String(i).padStart(4, "0")}.png`),
    type: "png"
  });
  if (i % 30 === 0) process.stdout.write(`[${outStem}] ${i}/${TOTAL_FRAMES}\n`);
}

await page.evaluate((frame, total) => window.__render(frame, total), 45, TOTAL_FRAMES);
await page.screenshot({ path: posterPng, type: "png" });
await browser.close();

await run("ffmpeg", [
  "-y", "-framerate", String(FPS),
  "-i", path.join(framesDir, "frame-%04d.png"),
  "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", "-an", "-crf", "23", "-preset", "slow",
  outVideo
]);

const jpgOut = outStem === "og-video"
  ? path.join(root, "assets", "og-image.jpg")
  : path.join(root, "assets", `${outStem}.jpg`);

await run("ffmpeg", ["-y", "-i", posterPng, "-q:v", "3", jpgOut]);
await copyFile(posterPng, path.join(root, "assets", outStem === "og-video" ? "og-image-poster.png" : `${outStem}.png`));
process.stdout.write(`wrote ${outVideo} and ${jpgOut}\n`);
