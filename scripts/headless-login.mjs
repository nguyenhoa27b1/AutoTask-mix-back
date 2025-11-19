import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const logs = { console: [], requests: [], responses: [] };

  page.on('console', (msg) => {
    try {
      logs.console.push({ type: msg.type(), text: msg.text() });
    } catch (e) {
      logs.console.push({ type: 'error', text: `unserializable console msg` });
    }
  });

  page.on('request', (req) => {
    logs.requests.push({ url: req.url(), method: req.method(), postData: req.postData() });
  });

  page.on('response', async (res) => {
    const url = res.url();
    const status = res.status();
    let body = null;
    try {
      const headers = res.headers();
      const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
      if (ct.includes('application/json') || url.includes('/api/login') || ct.includes('text/')) {
        // attempt to read short responses (login JSON)
        try {
          body = await res.text();
        } catch (e) {
          body = `<<failed to read body: ${e.message}>>`;
        }
      }
      logs.responses.push({ url, status, headers, body });
    } catch (e) {
      logs.responses.push({ url, status, headers: {}, body: `<<error capturing response: ${e.message}>>` });
    }
  });

  const candidates = [
    'http://localhost:3001/',
    'http://127.0.0.1:3001/',
    'http://10.60.6.101:3001/'
  ];

  let navigated = false;
  for (const targetUrl of candidates) {
    console.log('Trying to navigate to', targetUrl);
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 8000 });
      console.log('Navigation succeeded to', targetUrl);
      navigated = true;
      break;
    } catch (e) {
      console.warn('Navigation failed for', targetUrl, e && e.message);
    }
  }
  if (!navigated) throw new Error('Unable to reach frontend on any candidate URL');

  // Wait for login inputs
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  await page.waitForSelector('input[type="password"]', { timeout: 8000 });

  // Fill demo admin credentials
  await page.type('input[type="email"]', 'admin@example.com', { delay: 30 });
  await page.type('input[type="password"]', 'adminpassword', { delay: 30 });

  // Submit and wait for the login API response
  console.log('Submitting login form...');
  try {
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForResponse((resp) => resp.url().includes('/api/login') && resp.status() < 500, { timeout: 8000 })
    ]);
  } catch (e) {
    console.warn('Login request did not appear or timed out:', e && e.message);
  }

  // Allow any client-side redirects / fetches to finish
  await page.waitForTimeout(800);

  // Save results
  const fs = await import('fs/promises');
  await fs.writeFile('headless-login-output.json', JSON.stringify(logs, null, 2));
  console.log('Saved headless-login-output.json');

  await browser.close();
}

main().catch((err) => {
  console.error('Headless script failed:', err);
  process.exit(1);
});
