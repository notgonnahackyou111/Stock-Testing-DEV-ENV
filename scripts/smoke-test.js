const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle2' });

    // Open Options
    await page.waitForSelector('.btn-options', { timeout: 5000 });
    await page.click('.btn-options');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Change starting capital
    await page.waitForSelector('#startingCapital', { timeout: 5000 });
    await page.evaluate(() => { document.getElementById('startingCapital').value = '30000'; });

    // Start test from options page
    await page.waitForSelector('.btn-start', { timeout: 5000 });
    await page.click('.btn-start');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Check cash display
    await page.waitForSelector('#cashDisplay', { timeout: 5000 });
    const cash = await page.$eval('#cashDisplay', el => el.textContent.trim());

    // Check stocks rendered
    const stocksCount = await page.$$eval('#stocksGrid .stock-card', els => els.length);

    // Check time advancement
    await page.waitForSelector('#timeDisplay', { timeout: 5000 });
    const timeBefore = await page.$eval('#timeDisplay', el => el.textContent.trim());

    // Speed up time and wait
    await page.click('#speed10x');
    await page.waitForTimeout(900);
    const timeAfter = await page.$eval('#timeDisplay', el => el.textContent.trim());

    // Navigate home, then help
    await page.click('.btn-home');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.click('.btn-help');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    const helpUrl = page.url();

    // Assertions
    if (!cash.includes('30000')) {
        throw new Error(`Expected cash to reflect configured value, got "${cash}"`);
    }
    if (stocksCount === 0) {
        throw new Error('No stocks rendered after starting simulation');
    }
    if (timeBefore === timeAfter) {
        throw new Error('Time did not advance after speeding up simulation');
    }
    if (!helpUrl.endsWith('help.html')) {
        throw new Error(`Help navigation failed, landed at "${helpUrl}"`);
    }

    console.log('SMOKE_TEST_PASSED', { cash, stocksCount, timeBefore, timeAfter, helpUrl });
  } catch (err) {
    console.error('SMOKE_TEST_ERROR', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
