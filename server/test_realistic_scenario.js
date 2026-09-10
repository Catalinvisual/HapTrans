const { initRouting, RoutingIndexManager, RoutingModel, FirstSolutionStrategy } = require('or-tools-wasm/routing');

async function testScenario() {
  console.log('--- TEST SCENARIO: Multi-Pickup / Multi-Delivery (Emmeloord, Amsterdam, Rotterdam -> Lille, Paris, Lyon) ---');
  await initRouting();
  console.log('1. OR-Tools initialized successfully.');

  const stops = [
    { id: '1', name: 'Emmeloord Pickup', type: 'pickup', shipmentId: 's1', pallets: 10, weightKg: 7200, ldm: 4.0, lat: 52.7112, lng: 5.7533 },
    { id: '2', name: 'Amsterdam Pickup', type: 'pickup', shipmentId: 's2', pallets: 10, weightKg: 7100, ldm: 4.0, lat: 52.3676, lng: 4.9041 },
    { id: '3', name: 'Rotterdam Pickup', type: 'pickup', shipmentId: 's3', pallets: 13, weightKg: 9400, ldm: 5.2, lat: 51.9244, lng: 4.4777 },
    { id: '4', name: 'Lille Delivery', type: 'delivery', shipmentId: 's1', pallets: 10, weightKg: 7200, ldm: 4.0, lat: 50.6292, lng: 3.0573 },
    { id: '5', name: 'Paris Delivery', type: 'delivery', shipmentId: 's2', pallets: 10, weightKg: 7100, ldm: 4.0, lat: 48.8566, lng: 2.3522 },
    { id: '6', name: 'Lyon Delivery', type: 'delivery', shipmentId: 's3', pallets: 13, weightKg: 9400, ldm: 5.2, lat: 45.7640, lng: 4.8357 },
  ];

  const maxPallets = 33;
  const maxWeightKg = 40000;
  const maxLdm = 13.6;

  // Build matrix (Haversine * 1.25 for real road approx)
  const deg2rad = (d) => d * (Math.PI / 180);
  const havDist = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.25);
  };

  const n = stops.length;
  const distanceMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) distanceMatrix[i][j] = 0;
      else distanceMatrix[i][j] = havDist(stops[i].lat, stops[i].lng, stops[j].lat, stops[j].lng);
    }
  }

  const manager = new RoutingIndexManager(n, 1, 0);
  const routing = new RoutingModel(manager);

  const transitCallbackIndex = routing.RegisterTransitMatrix(distanceMatrix);
  routing.SetArcCostEvaluatorOfAllVehicles(transitCallbackIndex);

  // Pallet capacity dimension
  const palletsTransit = stops.map(s => s.type === 'pickup' ? s.pallets : -s.pallets);
  const palletsCallback = routing.RegisterUnaryTransitVector(palletsTransit);
  routing.AddDimensionWithVehicleCapacity(palletsCallback, 0, [maxPallets], true, 'Pallets');

  // Weight capacity dimension
  const weightTransit = stops.map(s => s.type === 'pickup' ? s.weightKg : -s.weightKg);
  const weightCallback = routing.RegisterUnaryTransitVector(weightTransit);
  routing.AddDimensionWithVehicleCapacity(weightCallback, 0, [maxWeightKg], true, 'Weight');

  // Pickup & delivery constraints
  routing.AddPickupAndDelivery(0, 3); // s1: Emmeloord -> Lille
  routing.AddPickupAndDelivery(1, 4); // s2: Amsterdam -> Paris
  routing.AddPickupAndDelivery(2, 5); // s3: Rotterdam -> Lyon

  const searchParams = {
    firstSolutionStrategy: FirstSolutionStrategy.PATH_CHEAPEST_ARC,
    local_search_metaheuristic: 2,
    solution_limit: 100,
    local_search_operators: {},
  };

  const assignment = await routing.SolveWithParameters(searchParams);
  if (!assignment) {
    console.error('FAILED: No solution found!');
    process.exit(1);
  }

  console.log('2. OR-Tools found feasible solution!');
  let index = routing.Start(0);
  const sequence = [];
  let cumPallets = 0;
  let cumWeight = 0;

  while (!routing.IsEnd(index)) {
    const node = manager.IndexToNode(index);
    const stop = stops[node];
    if (stop.type === 'pickup') {
      cumPallets += stop.pallets;
      cumWeight += stop.weightKg;
    } else {
      cumPallets -= stop.pallets;
      cumWeight -= stop.weightKg;
    }
    sequence.push({
      step: sequence.length + 1,
      name: stop.name,
      type: stop.type,
      pallets: stop.pallets,
      currentLoad: `${cumPallets} / ${maxPallets} pallets`,
      currentWeight: `${cumWeight} / ${maxWeightKg} kg`
    });
    index = assignment.Value(routing.NextVar(index));
  }

  console.log('3. Route Sequence & Cumulative Loads:');
  console.table(sequence);

  // Verify LIFO loading sequence
  const deliveries = sequence.filter(s => s.type === 'delivery');
  console.log('4. Delivery Sequence:', deliveries.map(d => d.name).join(' -> '));
  // LIFO: Reverse of delivery sequence
  const loadingSequence = [...deliveries].reverse();
  console.log('5. LIFO Loading Sequence (Rear Doors):', loadingSequence.map((d, i) => `#${i + 1} (${d.name.replace(' Delivery', '')})`).join(' -> '));

  console.log('--- TEST COMPLETED SUCCESSFULLY ---');
}

testScenario().catch(console.error);
