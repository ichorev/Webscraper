const playwright = require('playwright-chromium');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const csvWriter = createCsvWriter({
  path: '/tmp/hotels.csv',
  header: [
    { id: 'name', title: 'Hotel Name' },
    { id: 'city', title: 'City' },
    { id: 'rating', title: 'Rating' }
  ]
});

async function scrapeWithPlaywright() {
  let browser;
  try {
    console.log('Launching Playwright...');
    browser = await playwright.chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    console.log('Navigating to Snapp Trip with Playwright...');
    await page.goto('https://www.snapptrip.com/', { waitUntil: 'networkidle' });
    
    // Wait for the hotel list to load
    await page.waitForSelector('.hotelList__item', { timeout: 60000 });

    const hotels = await page.$$eval('.hotelList__item', elements =>
      elements.map(el => ({
        name: el.querySelector('.hotelList__name')?.textContent.trim() || '',
        city: el.querySelector('.hotelList__city')?.textContent.trim() || '',
        rating: el.querySelector('.hotelList__rating-text')?.textContent.trim() || ''
      }))
    );

    if (hotels.length === 0) {
      console.warn('No hotels found. Check the selector or website structure.');
    } else {
      console.log(`Found ${hotels.length} hotels.`);
      await csvWriter.writeRecords(hotels);
      console.log('Data saved to /tmp/hotels.csv successfully.');
    }
    return hotels;
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

// If this script is run directly (not imported), run the scraper
if (require.main === module) {
  scrapeWithPlaywright()
    .then(hotels => {
      console.log('Scraping completed successfully.');
      console.log('Hotels:', hotels);
    })
    .catch(error => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeWithPlaywright };