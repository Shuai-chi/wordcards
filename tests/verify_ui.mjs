import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';

async function verifyAndScreenshot() {
  console.log('Starting preview server...');
  const preview = spawn('npm', ['run', 'preview'], { 
    cwd: process.cwd(),
    shell: true
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to http://localhost:4173/wordcards/');
    await page.goto('http://localhost:4173/wordcards/', { waitUntil: 'networkidle' });
    
    // The "No decks" screen is shown by default. 
    // I won't have decks in the fresh incognito browser unless I add some.
    // I'll take a screenshot of the empty state with the new header.
    
    await page.setViewportSize({ width: 1200, height: 800 });
    const screenshotPath = path.join(process.cwd(), '..', '.gemini', 'antigravity', 'brain', '555ab007-3cbb-4c6b-a7dd-ea11706bcf4e', 'artifacts', 'new_ui_empty_state.png');
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to:', screenshotPath);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
    preview.kill();
    process.exit(0);
  }
}

verifyAndScreenshot();
