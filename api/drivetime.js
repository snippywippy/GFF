// Real driving times from the user's location to a batch of destinations, via
// Google's Routes API (computeRouteMatrix) — the current replacement for the
// legacy Distance Matrix API. Same approach as the Dinner Decider app.
// Client falls back to a rough estimate if this errors — see fetchDriveTimes.

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const { originLat, originLng, destinations } = req.query;
  if (!originLat || !originLng || !destinations) {
    return res.status(400).json({ error: 'Missing originLat/originLng/destinations' });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server is missing GOOGLE_MAPS_API_KEY' });
  }

  const destList = String(destinations).split(';').filter(Boolean);
  const results = new Array(destList.length).fill(null);
  const originPoint = {
    waypoint: { location: { latLng: {
      latitude: parseFloat(originLat), longitude: parseFloat(originLng)
    } } }
  };

  try {
    // Route matrix caps out around 25 destinations per request with 1 origin; batch it.
    for (let i = 0; i < destList.length; i += 25) {
      const batch = destList.slice(i, i + 25);
      const body = {
        origins: [originPoint],
        destinations: batch.map(d => {
          const [lat, lng] = d.split(',').map(Number);
          return { waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } };
        }),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE'
      };

      const r = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition,status'
        },
        body: JSON.stringify(body)
      });

      const data = await r.json();
      if (!r.ok) {
        const msg = (data && data.error && data.error.message) || `HTTP ${r.status}`;
        return res.status(400).json({ error: msg });
      }

      (Array.isArray(data) ? data : []).forEach(el => {
        const di = el.destinationIndex || 0;
        if (el.condition === 'ROUTE_EXISTS' && el.duration) {
          const seconds = parseInt(String(el.duration).replace('s', ''), 10);
          if (!isNaN(seconds)) {
            results[i + di] = {
              minutes: Math.max(1, Math.round(seconds / 60)),
              miles: typeof el.distanceMeters === 'number'
                ? Math.round((el.distanceMeters / 1609.34) * 10) / 10
                : null
            };
          }
        }
      });
    }
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: 'Route matrix failed: ' + err.message });
  }
};
