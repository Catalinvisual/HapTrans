const axios = require('axios');

const hereKey = '7-X_IS29w3fq2PfY5n9FwRMADKzxDlbbqFnF2-wJA8g';
const address = 'Calea cernauti 126 727108 Serbauti';

async function test() {
  try {
    console.log('Testing address:', address);
    const res = await axios.get('https://geocode.search.hereapi.com/v1/geocode', {
      params: { q: address, apiKey: hereKey, limit: 1 },
      timeout: 8000,
    });
    console.log('HERE Geocode result:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('HERE Geocode error:', e.message);
  }
}

test();
