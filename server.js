const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const csvWriter = createCsvWriter({
  path: '/tmp/hotels.csv',
  header: [{ id: 'name', title: 'Hotel Name' }]
});

async function scrapeWithAxios() {
  try {
    console.log('Fetching the Snapp Trip page...');
    const { data } = await axios.get('https://www.snapptrip.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    console.log('Parsing the page...');
    const $ = cheerio.load(data);
    
    // Debug: Print out all text content
    console.log('Debugging - All text content:');
    console.log($('body').text());
    
    // Try different selectors
    const selectors = [
      'h3', '.hotel-name', '[data-test-id="hotel-name"]', '.hotel-card .name',
      '.hotel-title', '.listing-item-title', '.search-result-item h3'
    ];
    
    let hotelNames = [];
    
    selectors.forEach(selector => {
      console.log(`\nTrying selector: ${selector}`);
      $(selector).each((index, element) => {
        const name = $(element).text().trim();
        console.log(`Found: ${name}`);
        if (name && !hotelNames.includes(name)) {
          hotelNames.push(name);
        }
      });
    });

    if (hotelNames.length === 0) {
      console.warn('No hotel names found. The page might be using dynamic loading or require JavaScript execution.');
      console.log('Page URL:', $('link[rel="canonical"]').attr('href'));
      console.log('Page Title:', $('title').text());
    } else {
      console.log(`Found ${hotelNames.length} unique hotel names.`);
      await csvWriter.writeRecords(hotelNames.map(name => ({ name })));
      console.log('Data saved to /tmp/hotels.csv successfully.');
    }
    
    return hotelNames;
  } catch (error) {
    console.error('An error occurred:', error);
    throw error;
  }
}

scrapeWithAxios()
  .then(hotelNames => {
    console.log('Scraping completed successfully.');
    console.log('Hotel names:', hotelNames);
  })
  .catch(error => {
    console.error('Scraping failed:', error);
    process.exit(1);
  });