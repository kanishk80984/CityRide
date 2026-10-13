const axios = require('axios');
const MapProvider = require('./mapProvider');
const { GOOGLE_MAPS_SERVER_API_KEY } = require('../../config/maps');

// Simple TTL Cache to prevent memory leaks and excessive API calls
class TTLCache {
  constructor(maxSize = 500, ttlMs = 1000 * 60 * 60) { // 1 hour default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest (Map iterates in insertion order)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiry: Date.now() + this.ttlMs });
  }
}

const placeDetailsCache = new TTLCache(200, 1000 * 60 * 30); // 200 items, 30 min TTL
const activeDetailsRequests = new Map(); // For deduplicating concurrent requests

// Helper to decode Google's encodedPolyline into GeoJSON coordinates [longitude, latitude]
function decodePolyline(encoded) {
  if (!encoded) return [];
  let poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    const pLat = lat / 1e5;
    const pLng = lng / 1e5;
    poly.push([pLng, pLat]); // GeoJSON format: [lon, lat]
  }
  return poly;
}

class GoogleProvider extends MapProvider {
  constructor() {
    super();
    this.geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    this.routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    this.autocompleteUrl = 'https://places.googleapis.com/v1/places:autocomplete';
    this.placeDetailsUrl = 'https://places.googleapis.com/v1/places';
  }

  async autocomplete(text, lat, lon, limit = 5) {
    if (!GOOGLE_MAPS_SERVER_API_KEY) throw new Error('Google Maps API key is missing');
    
    try {
      const requestBody = {
        input: text,
      };

      if (lat && lon) {
        requestBody.locationBias = {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
            radius: 50000.0 // 50km bias
          }
        };
      }

      const response = await axios.post(this.autocompleteUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_SERVER_API_KEY,
        }
      });

      const suggestions = response.data.suggestions || [];
      const limitedSuggestions = suggestions.slice(0, limit);

      // To preserve the existing frontend contract, we MUST return latitude and longitude.
      // Since Autocomplete (New) does not return coordinates, we fetch them efficiently
      // and use a cache to avoid redundant calls for the same placeId on every keystroke.
      const results = await Promise.all(limitedSuggestions.map(async (suggestion) => {
        const placeId = suggestion.placePrediction.placeId;
        const mainText = suggestion.placePrediction.structuredFormat?.mainText?.text || suggestion.placePrediction.text;
        const secondaryText = suggestion.placePrediction.structuredFormat?.secondaryText?.text || '';
        const address = secondaryText ? `${mainText}, ${secondaryText}` : mainText;

        let location = placeDetailsCache.get(placeId);

        if (!location) {
          try {
            if (activeDetailsRequests.has(placeId)) {
              location = await activeDetailsRequests.get(placeId);
            } else {
              const fetchPromise = axios.get(`${this.placeDetailsUrl}/${placeId}`, {
                headers: {
                  'X-Goog-Api-Key': GOOGLE_MAPS_SERVER_API_KEY,
                  'X-Goog-FieldMask': 'location'
                }
              }).then(res => {
                const loc = res.data?.location;
                if (loc) placeDetailsCache.set(placeId, loc);
                return loc;
              }).finally(() => {
                activeDetailsRequests.delete(placeId);
              });
              
              activeDetailsRequests.set(placeId, fetchPromise);
              location = await fetchPromise;
            }
          } catch (detailsErr) {
            console.error(`Failed to fetch details for placeId ${placeId}:`, detailsErr.message);
          }
        }

        return {
          placeId: placeId,
          name: mainText,
          address: address,
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          city: '', // Optional fields that frontend doesn't strictly depend on for list view
          state: '',
          country: ''
        };
      }));

      // Filter out any results where we couldn't get coordinates, as frontend would crash or route would fail
      return results.filter(r => r.latitude !== 0 && r.longitude !== 0);

    } catch (error) {
      console.error('Google Autocomplete Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch autocomplete results');
    }
  }

  async reverseGeocode(lat, lon) {
    if (!GOOGLE_MAPS_SERVER_API_KEY) throw new Error('Google Maps API key is missing');

    const url = `${this.geocodeUrl}?latlng=${lat},${lon}&key=${GOOGLE_MAPS_SERVER_API_KEY}`;
    
    try {
      const response = await axios.get(url);
      
      if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
        if (response.data.status === 'ZERO_RESULTS') return null;
        throw new Error(`Geocoding API error: ${response.data.status}`);
      }
      
      const result = response.data.results[0];
      const addressComponents = result.address_components;
      
      let city = '';
      let state = '';
      let country = '';
      let postalCode = '';

      for (const component of addressComponents) {
        if (component.types.includes('locality')) city = component.long_name;
        if (component.types.includes('administrative_area_level_1')) state = component.long_name;
        if (component.types.includes('country')) country = component.long_name;
        if (component.types.includes('postal_code')) postalCode = component.long_name;
      }

      return {
        address: result.formatted_address,
        city,
        state,
        country,
        postalCode,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      };
    } catch (error) {
      console.error('Google Reverse Geocode Error:', error.response?.data || error.message);
      throw new Error('Failed to fetch reverse geocode results');
    }
  }

  async route(pickup, drop, mode = 'TWO_WHEELER') {
    if (!GOOGLE_MAPS_SERVER_API_KEY) throw new Error('Google Maps API key is missing');

    // Google Routes API (New) uses specific routing preferences.
    // Existing modes from geoapify: motorcycle, etc. We map to Google's.
    let travelMode = 'TWO_WHEELER';
    if (mode === 'drive' || mode === 'car') travelMode = 'DRIVE';
    
    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: pickup.latitude,
            longitude: pickup.longitude
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: drop.latitude,
            longitude: drop.longitude
          }
        }
      },
      travelMode: travelMode,
      routingPreference: 'TRAFFIC_AWARE'
    };

    try {
      const response = await axios.post(this.routesUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_SERVER_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
        }
      });

      if (!response.data.routes || response.data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = response.data.routes[0];
      const distanceMeters = route.distanceMeters || 0;
      
      // Parse duration which comes as e.g. "1500s"
      let durationSeconds = 0;
      if (route.duration) {
        durationSeconds = parseInt(route.duration.replace('s', ''), 10);
      }

      const encodedPolyline = route.polyline?.encodedPolyline;
      const coordinates = decodePolyline(encodedPolyline);

      return {
        distanceMeters: distanceMeters,
        distanceKm: +(distanceMeters / 1000).toFixed(2),
        durationSeconds: durationSeconds,
        durationMinutes: Math.ceil(durationSeconds / 60),
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      };
    } catch (error) {
      console.error('Google Route Error:', error.response?.data || error.message);
      throw new Error('Failed to calculate route');
    }
  }
}

module.exports = new GoogleProvider();
