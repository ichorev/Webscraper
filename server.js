const { chromium } = require('playwright-chromium');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
  path: '/tmp/hotels.csv',
  header: [{ id: 'name', title: 'Hotel Name' }]
});

async function scrapeWithPlaywright() {
  let browser;
  try {
    console.log('Launching Playwright...');
    browser = await chromium.launch({ 
      headless: true,
      executablePath: process.env.CHROME_BIN || null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    console.log('Navigating to Snapp Trip with Playwright...');
    await page.goto('https://www.snapptrip.com/', { waitUntil: 'networkidle' });
    const hotelNames = await page.$$eval('h3.hotel-name', elements =>
      elements.map(el => el.textContent.trim())
    );
    if (hotelNames.length === 0) {
      console.warn('No hotel names found with Playwright. Check the selector.');
    } else {
      console.log(`Found ${hotelNames.length} hotel names with Playwright.`);
      await csvWriter.writeRecords(hotelNames.map(name => ({ name })));
      console.log('Data saved to /tmp/hotels.csv successfully.');
    }
    return hotelNames;
  } catch (error) {
    console.error('An error occurred with Playwright:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

scrapeWithPlaywright()
  .then(hotelNames => {
    console.log('Scraping completed successfully.');
    console.log('Hotel names:', hotelNames);
  })
  .catch(error => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });