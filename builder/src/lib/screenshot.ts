import puppeteer from "puppeteer";

/**
 * Capture a screenshot of a web page.
 * Returns a base64-encoded PNG data URL.
 */
export async function captureScreenshot(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate and wait for network to settle
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Extra wait for JS rendering
    await new Promise((r) => setTimeout(r, 2000));

    const buffer = await page.screenshot({ type: "png" });
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  } finally {
    await browser.close();
  }
}
