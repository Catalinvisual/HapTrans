const axios = require('axios');

const hereKey = '7-X_IS29w3fq2PfY5n9FwRMADKzxDlbbqFnF2-wJA8g';

const origin = '52.743839,5.852587';
const destination = '52.71265,5.77785';

async function getRouteManeuvers() {
  try {
    const res = await axios.get('https://router.hereapi.com/v8/routes', {
      params: {
        origin,
        destination,
        return: 'polyline,actions,summary',
        transportMode: 'car', // test with car first
        apiKey: hereKey,
      }
    });

    const route = res.data.routes?.[0];
    const section = route?.sections?.[0];
    
    console.log('--- ROUTE SUMMARY ---');
    console.log(`Length: ${section?.summary?.length} meters`);
    console.log(`Duration: ${section?.summary?.duration} seconds`);
    
    console.log('\n--- TURN-BY-TURN INSTRUCTIONS ---');
    if (section?.actions) {
      section.actions.forEach((action, idx) => {
        console.log(`${idx + 1}.`, action);
      });
    } else {
      console.log('No turn-by-turn actions returned. Check return parameter.');
    }
  } catch (e) {
    console.error('Error fetching route maneuvers:', e.response?.data || e.message);
  }
}

getRouteManeuvers();
