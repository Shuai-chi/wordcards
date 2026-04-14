import { chromium } from 'playwright';

async function debugLiveSite() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const consoles = [];
  const networkErrors = [];

  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => consoles.push(`[${msg.type()}] ${msg.text()}`));
  page.on('requestfailed', (req) => networkErrors.push(`${req.url()}: ${req.failure().errorText}`));
  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      networkErrors.push(`${resp.url()}: ${resp.status()} ${resp.statusText()}`);
    }
  });

  console.log('Navigating to Live Site: https://shuai-chi.github.io/wordcards/');
  try {
    const response = await page.goto('https://shuai-chi.github.io/wordcards/', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    console.log('Navigation Status:', response?.status());
    console.log('Final URL:', page.url());
    
    const title = await page.title();
    console.log('Page Title:', title);
    
    const rootContent = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'EMPTY');
    console.log('Root Element Content:', rootContent);
    
    // Check if scripts are loaded
    const scripts = await page.evaluate(() => 
      Array.from(document.querySelectorAll('script')).map(s => ({ src: s.src, type: s.type }))
    );
    console.log('Scripts found:', JSON.stringify(scripts, null, 2));

    console.log('\n--- Errors ---');
    errors.forEach(e => console.error(e));
    
    console.log('\n--- Console Logs ---');
    consoles.forEach(c => console.log(c));
    
    console.log('\n--- Network Errors ---');
    networkErrors.forEach(n => console.error(n));

  } catch (err) {
    console.error('Navigation failed:', err.message);
  } finally {
    await browser.close();
  }
}

debugLiveSite();
