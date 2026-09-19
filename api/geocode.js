// Turns a typed place — city, zip, or address — into coordinates, so the app
// works without browser geolocation (useful on a laptop, or to plan a trip).

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const q = (req.query.q || '').toString().trim();
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(500).json({ error: 'Server is missing GOOGLE_MAPS_API_KEY' });

  try {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json?address='
              + encodeURIComponent(q) + '&key=' + key;
    const r = await fetch(url);
    const data = await r.json();

    if (data.status === 'ZERO_RESULTS') {
      return res.status(404).json({ error: 'No place found by that name.' });
    }
    if (data.status !== 'OK' || !data.results || !data.results.length) {
      return res.status(400).json({ error: data.error_message || data.status || 'Lookup failed.' });
    }

    const top = data.results[0];
    return res.status(200).json({
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
      label: shortLabel(top)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Geocode failed: ' + err.message });
  }
};

// Prefer "Austin, TX" over the full postal address.
function shortLabel(result) {
  const get = t => (result.address_components || [])
    .find(c => c.types.indexOf(t) !== -1);
  const city = get('locality') || get('postal_town') || get('sublocality')
            || get('administrative_area_level_2');
  const state = get('administrative_area_level_1');
  if (city && state) return city.long_name + ', ' + state.short_name;
  if (city) return city.long_name;
  return result.formatted_address;
}
