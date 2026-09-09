const axios = require('axios');

const orsKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjVjYzBkYjc2MDY1ZTQ0NWI4OTlkYzcwYjc3ZTE2ZWRlIiwiaCI6Im11cm11cjY0In0=';
const origin = [5.852587, 52.743839]; // lng, lat
const destination = [5.77785, 52.71265]; // lng, lat

async function testORS() {
  try {
    const res = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-hgv',
      {
        coordinates: [origin, destination],
        format: 'geojson',
        instructions: false,
      },
      {
        headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
        timeout: 12000,
      }
    );

    const feature = res.data.features?.[0];
    const summary = feature?.properties?.summary;
    if (summary) {
      console.log(`[ORS Truck] Distance: ${Math.round(summary.distance / 1000)} km, Duration: ${Math.round(summary.duration / 60)} min`);
    } else {
      console.log('[ORS Truck] No route summary.');
    }
  } catch (e) {
    console.error('[ORS Truck] Error:', e.response?.data || e.message);
  }
}

testORS();
