const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs').promises;

const csvWriter = createCsvWriter({
  path: '/tmp/iran_hotels.csv',
  header: [
    { id: 'name', title: 'Hotel Name' },
    { id: 'city', title: 'City' }
  ]
});

const baseUrl = 'https://www.snapptrip.com';

async function fetchPage(browser, url) {
  console.log(`Fetching: ${url}`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
  }
  return page;
}

async function scrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

async function scrapeHotelsFromCity(browser, cityUrl, cityName) {
  let hotels = [];
  let pageNum = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const page = await fetchPage(browser, `${cityUrl}?page=${pageNum}`);
    await scrollToBottom(page);
    await page.waitForTimeout(2000); // Wait for any lazy-loaded content

    const pageHotels = await page.evaluate(() => {
      const hotels = [];
      document.querySelectorAll('.hotel-item').forEach((item) => {
        const nameElement = item.querySelector('.hotel-name');
        if (nameElement) {
          hotels.push(nameElement.textContent.trim());
        }
      });
      return hotels;
    });

    hotels = hotels.concat(pageHotels.map(name => ({ name, city: cityName })));
    console.log(`Scraped ${pageHotels.length} hotels from ${cityName} (Page ${pageNum})`);

    hasNextPage = await page.evaluate(() => {
      const nextButton = document.querySelector('.pagination .next:not(.disabled)');
      return !!nextButton;
    });

    await page.close();
    pageNum++;
  }

  return hotels;
}

async function scrapeAllIranHotels() {
  let browser;
  let allHotels = [];

  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
    });
    console.log('Browser launched successfully');

    const homePage = await fetchPage(browser, `${baseUrl}/iran-hotels`);
    const cityLinks = await homePage.evaluate(() => {
      return Array.from(document.querySelectorAll('.city-list a')).map(a => ({
        url: a.getAttribute('href'),
        name: a.textContent.trim()
      }));
    });
    await homePage.close();

    console.log(`Found ${cityLinks.length} cities to scrape`);

    for (const city of cityLinks) {
      console.log(`Scraping hotels from ${city.name}`);
      const hotels = await scrapeHotelsFromCity(browser, `${baseUrl}${city.url}`, city.name);
      allHotels = allHotels.concat(hotels);
      await fs.appendFile('/tmp/progress.log', `Scraped ${hotels.length} hotels from ${city.name}\n`);
    }

  } catch (error) {
    console.error('An error occurred during scraping:', error);
    console.error('Error stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }

  return allHotels;
}

async function main() {
  try {
    console.log('Starting to scrape all hotels in Iran...');
    console.log('Puppeteer cache dir:', process.env.PUPPETEER_CACHE_DIR);
    console.log('Puppeteer executable path:', process.env.PUPPETEER_EXECUTABLE_PATH);
    
    const hotels = await scrapeAllIranHotels();
    
    console.log(`Total hotels found: ${hotels.length}`);
    await csvWriter.writeRecords(hotels);
    console.log('Data saved to /tmp/iran_hotels.csv successfully.');
  } catch (error) {
    console.error('An error occurred in the main function:', error);
    console.error('Error stack:', error.stack);
  }
}

main();