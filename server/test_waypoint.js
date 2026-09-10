const axios = require('axios');

const hereKey = '7-X_IS29w3fq2PfY5n9FwRMADKzxDlbbqFnF2-wJA8g';

const origin = '52.743839,5.852587';
const waypoint = '52.72911,5.81165'; // A point directly on N351 (Marknesserweg)
const destination = '52.71265,5.77785';

async function testWithWaypoint() {
  try {
    // 1. Check direct route
    const directRes = await axios.get('https://router.hereapi.com/v8/routes', {
      params: {
        origin,
        destination,
        return: 'summary',
        transportMode: 'truck',
        apiKey: hereKey,
      }
    });
    const directSummary = directRes.data.routes?.[0]?.sections?.[0]?.summary;
    console.log('Direct Route length:', directSummary?.length, 'meters, duration:', directSummary?.duration, 'seconds');

    // 2. Check route via N351 waypoint
    const waypointRes = await axios.get('https://router.hereapi.com/v8/routes', {
      params: {
        origin,
        via: waypoint,
        destination,
        return: 'summary',
        transportMode: 'truck',
        apiKey: hereKey,
      }
    });
    const waypointSections = waypointRes.data.routes?.[0]?.sections || [];
    const totalLength = waypointSections.reduce((sum, s) => sum + (s.summary?.length || 0), 0);
    const totalDuration = waypointSections.reduce((sum, s) => sum + (s.summary?.duration || 0), 0);
    console.log('Route via N351 Waypoint length:', totalLength, 'meters, duration:', totalDuration, 'seconds');
    
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}

testWithWaypoint();
