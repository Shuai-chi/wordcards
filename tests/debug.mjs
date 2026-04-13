import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log('Navigating to app...');
const resp = await page.goto('http://localhost:5173/wordcards/', { waitUntil: 'networkidle', timeout: 15000 });
console.log('Status:', resp?.status());
console.log('URL:', page.url());

const title = await page.title();
console.log('Title:', title);

const bodyText = await page.locator('body').innerText();
console.log('Body (first 500 chars):', bodyText.slice(0, 500));

// Look for any h1
const h1s = await page.locator('h1').allInnerTexts();
console.log('H1 elements:', h1s);

await browser.close();
