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
    const hotelNames = [];
    
    // Update this selector to match the actual structure of the SnappTrip website
    $('h3.hotel-name').each((index, element) => {
      hotelNames.push($(element).text().trim());
    });

    if (hotelNames.length === 0) {
      console.warn('No hotel names found. Check the selector.');
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