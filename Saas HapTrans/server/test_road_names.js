const axios = require('axios');

const hereKey = '7-X_IS29w3fq2PfY5n9FwRMADKzxDlbbqFnF2-wJA8g';
const origin = '52.743839,5.852587';
const waypoint = '52.72911,5.81165';
const destination = '52.71265,5.77785';

async function getRoadNames(name, params) {
  try {
    const res = await axios.get('https://router.hereapi.com/v8/routes', {
      params: {
        origin,
        destination,
        return: 'spans,summary',
        transportMode: 'truck',
        apiKey: hereKey,
        ...params
      }
    });

    const route = res.data.routes?.[0];
    const sections = route?.sections || [];
    
    console.log(`\n=== ${name} ===`);
    let totalLength = 0;
    let totalDuration = 0;
    const roadNames = [];

    sections.forEach((section, sIdx) => {
      totalLength += section.summary?.length || 0;
      totalDuration += section.summary?.duration || 0;
      
      const spans = section.spans || [];
      spans.forEach((span) => {
        if (span.names) {
          span.names.forEach((n) => {
            const roadName = n.value;
            if (roadNames[roadNames.length - 1] !== roadName) {
              roadNames.push(roadName);
            }
          });
        }
      });
    });

    console.log(`Total Length: ${totalLength} meters`);
    console.log(`Total Duration: ${totalDuration} seconds (${Math.round(totalDuration / 60)} min)`);
    console.log(`Roads: ${roadNames.join(' -> ')}`);
  } catch (e) {
    console.error(`Error for ${name}:`, e.response?.data || e.message);
  }
}

async function run() {
  // 1. Direct Truck Route
  await getRoadNames('Direct Route (Truck)', {});

  // 2. Waypoint Route (Forced via N351)
  await getRoadNames('Forced Waypoint Route (Truck)', { via: waypoint });
}

run();
