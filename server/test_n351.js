const axios = require('axios');

const hereKey = '7-X_IS29w3fq2PfY5n9FwRMADKzxDlbbqFnF2-wJA8g';

// Origin: Ecu 6, Emmeloord (52.71265, 5.77785)
// Destination: A point on N351 nearby or a truck coordinate.
// Let's use the actual truck coordinates: 52.743839, 5.852587
const origin = '52.743839,5.852587';
const destination = '52.71265,5.77785';

async function testRoute(name, params) {
  try {
    const res = await axios.get('https://router.hereapi.com/v8/routes', {
      params: {
        origin,
        destination,
        return: 'summary',
        apiKey: hereKey,
        ...params
      }
    });
    const route = res.data.routes?.[0];
    const summary = route?.sections?.[0]?.summary;
    if (summary) {
      console.log(`[${name}] Distance: ${summary.length} m, Duration: ${summary.duration} s`);
    } else {
      console.log(`[${name}] No route summary returned.`);
    }
  } catch (e) {
    console.error(`[${name}] Error:`, e.response?.data || e.message);
  }
}

async function run() {
  // Test 1: Truck mode (default)
  await testRoute('Truck Fast (Default)', {
    transportMode: 'truck',
    'vehicle[grossWeight]': 40000,
  });

  // Test 2: Truck mode with shorter route mode
  await testRoute('Truck Short', {
    transportMode: 'truck',
    routingMode: 'short',
    'vehicle[grossWeight]': 40000,
  });

  // Test 3: Car mode (no truck restrictions)
  await testRoute('Car Fast', {
    transportMode: 'car',
  });

  // Test 4: Car mode short
  await testRoute('Car Short', {
    transportMode: 'car',
    routingMode: 'short',
  });
}

run();
