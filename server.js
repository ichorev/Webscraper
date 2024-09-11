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
    
    // Debug: Print out all h1, h2, h3 tags
    console.log('Debugging - All h1, h2, h3 tags:');
    $('h1, h2, h3').each((index, element) => {
      console.log(`${$(element).prop('tagName')}: ${$(element).text().trim()}`);
    });
    
    // Debug: Print out some divs with class names
    console.log('\nDebugging - Some divs with class names:');
    $('div[class]').slice(0, 10).each((index, element) => {
      console.log(`Div class: ${$(element).attr('class')}`);
    });
    
    const hotelNames = [];
    
    // Try different selectors
    const selectors = ['h3.hotel-name', '.hotel-name', '[data-test-id="hotel-name"]', '.hotel-card .name'];
    
    selectors.forEach(selector => {
      console.log(`\nTrying selector: ${selector}`);
      $(selector).each((index, element) => {
        const name = $(element).text().trim();
        console.log(`Found: ${name}`);
        hotelNames.push(name);
      });
    });

    if (hotelNames.length === 0) {
      console.warn('No hotel names found. Please check the console output to determine the correct selector.');
    } else {
      console.log(`Found ${hotelNames.length} hotel names.`);
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