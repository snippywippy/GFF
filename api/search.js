// Vercel serverless function: proxies Google Places API (New) Text Search.
// Keeps GOOGLE_MAPS_API_KEY server-side so it never appears in page source.

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.primaryTypeDisplayName',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.currentOpeningHours.openNow',
  'places.businessStatus'
].join(',');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: 'missing_key',
      message: 'GOOGLE_MAPS_API_KEY is not set in Vercel environment variables.'
    });
  }

  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = Math.min(Math.max(parseInt(req.query.radius, 10) || 8000, 500), 50000);
  const mode = req.query.mode === 'dedicated' ? 'dedicated' : 'friendly';
  const extra = (req.query.q || '').toString().slice(0, 60).trim();

  if (!isFinite(lat) || !isFinite(lng)) {
    return res.status(400).json({ error: 'bad_location', message: 'lat and lng are required.' });
  }

  const base = mode === 'dedicated'
    ? 'dedicated gluten free restaurant'
    : 'gluten free friendly restaurant';
  const textQuery = extra ? `${base} ${extra}` : base;

  const body = {
    textQuery,
    pageSize: 20,
    rankPreference: 'RELEVANCE',
    locationBias: {
      circle: { center: { latitude: lat, longitude: lng }, radius }
    }
  };

  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: 'google_error',
        message: (data && data.error && data.error.message) || 'Google Places request failed.',
        status: r.status
      });
    }

    const places = (data.places || [])
      .filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY')
      .map(p => ({
        id: p.id,
        name: p.displayName && p.displayName.text,
        address: p.shortFormattedAddress || p.formattedAddress || '',
        lat: p.location && p.location.latitude,
        lng: p.location && p.location.longitude,
        rating: typeof p.rating === 'number' ? p.rating : null,
        reviews: p.userRatingCount || 0,
        price: p.priceLevel || null,
        type: p.primaryTypeDisplayName && p.primaryTypeDisplayName.text,
        phone: p.nationalPhoneNumber || null,
        website: p.websiteUri || null,
        openNow: p.currentOpeningHours ? p.currentOpeningHours.openNow : null
      }));

    return res.status(200).json({ places, query: textQuery });
  } catch (err) {
    return res.status(500).json({ error: 'fetch_failed', message: String(err && err.message || err) });
  }
};
