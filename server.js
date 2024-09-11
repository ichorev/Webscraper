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

async function searchAndScrapeHotels(page, searchTerm) {
  console.log(`Searching for hotels with term: ${searchTerm}`);
  await page.goto(`${baseUrl}/hotel`, { waitUntil: 'networkidle0' });
  
  // Fill in the search input and submit
  await page.type('input[name="searchTerm"]', searchTerm);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  let hotels = [];
  let hasNextPage = true;
  let pageNum = 1;

  while (hasNextPage) {
    console.log(`Scraping search results for "${searchTerm}" - Page ${pageNum}`);
    await scrollToBottom(page);
    await page.waitForTimeout(2000); // Wait for any lazy-loaded content

    const pageHotels = await page.evaluate(() => {
      const hotels = [];
      document.querySelectorAll('.hotel-item').forEach((item) => {
        const nameElement = item.querySelector('.hotel-name');
        const cityElement = item.querySelector('.hotel-city');
        if (nameElement && cityElement) {
          hotels.push({
            name: nameElement.textContent.trim(),
            city: cityElement.textContent.trim()
          });
        }
      });
      return hotels;
    });

    hotels = hotels.concat(pageHotels);
    console.log(`Found ${pageHotels.length} hotels on this page. Total: ${hotels.length}`);

    hasNextPage = await page.evaluate(() => {
      const nextButton = document.querySelector('.pagination .next:not(.disabled)');
      if (nextButton) {
        nextButton.click();
        return true;
      }
      return false;
    });

    if (hasNextPage) {
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      pageNum++;
    }
  }

  return hotels;
}

async function scrapeAllIranHotels() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let allHotels = [];
  const searchTerms = ['تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کیش', 'قشم', 'ایران']; // Add more cities or search terms as needed

  try {
    for (const term of searchTerms) {
      const hotels = await searchAndScrapeHotels(page, term);
      allHotels = allHotels.concat(hotels);
      await fs.appendFile('/tmp/progress.log', `Scraped ${hotels.length} hotels for search term "${term}"\n`);
    }
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }

  // Remove duplicates
  allHotels = Array.from(new Set(allHotels.map(JSON.stringify))).map(JSON.parse);
  
  return allHotels;
}

async function main() {
  console.log('Starting to scrape all hotels in Iran...');
  const hotels = await scrapeAllIranHotels();
  
  console.log(`Total unique hotels found: ${hotels.length}`);
  await csvWriter.writeRecords(hotels);
  console.log('Data saved to /tmp/iran_hotels.csv successfully.');
}

main();