const axios = require('axios');

const hereKey = '7-X_IS29w3fq2PfY5n9FwRMADKzxDlbbqFnF2-wJA8g';

const origin = '52.743839,5.852587';
const destination = '52.71265,5.77785';
const waypoint = '52.72911,5.81165';

async function getDetails() {
  try {
    // 1. Direct Route
    const res1 = await axios.get('https://router.hereapi.com/v8/routes', {
      params: {
        origin,
        destination,
        return: 'summary,actions,polyline',
        transportMode: 'car',
        apiKey: hereKey,
      }
    });
    
    // 2. Waypoint Route
    const res2 = await axios.get('https://router.hereapi.com/v8/routes', {
      params: {
        origin,
        via: waypoint,
        destination,
        return: 'summary,actions,polyline',
        transportMode: 'car',
        apiKey: hereKey,
      }
    });

    console.log('=== DIRECT ROUTE MANEUVERS ===');
    const actions1 = res1.data.routes?.[0]?.sections?.[0]?.actions || [];
    actions1.forEach((a, i) => console.log(`${i+1}. ${a.action} ${a.direction || ''} (${a.length}m)`));

    console.log('\n=== WAYPOINT ROUTE MANEUVERS ===');
    const sections2 = res2.data.routes?.[0]?.sections || [];
    let idx = 1;
    sections2.forEach((s, sIdx) => {
      console.log(`--- Section ${sIdx+1} ---`);
      const actions = s.actions || [];
      actions.forEach((a) => {
        console.log(`${idx++}. ${a.action} ${a.direction || ''} (${a.length}m)`);
      });
    });

  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}

getDetails();
