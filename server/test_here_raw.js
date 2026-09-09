const axios = require('axios');
const fs = require('fs');

const hereKey = '7-X_IS29w3fq2PfY5n9FwRMADKzxDlbbqFnF2-wJA8g';
const origin = '52.743839,5.852587';
const destination = '52.71265,5.77785';

async function run() {
  try {
    const res = await axios.get('https://router.hereapi.com/v8/routes', {
      params: {
        origin,
        via: '52.72911,5.81165',
        destination,
        return: 'summary,actions,instructions,polyline',
        transportMode: 'truck',
        apiKey: hereKey,
      }
    });
    
    // Clear out polyline for size if it is returned
    if (res.data.routes) {
      res.data.routes.forEach(r => {
        if (r.sections) {
          r.sections.forEach(s => {
            delete s.polyline;
          });
        }
      });
    }

    fs.writeFileSync('here_route_waypoint.json', JSON.stringify(res.data, null, 2));
    console.log('Saved here_route_waypoint.json');
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}

run();
