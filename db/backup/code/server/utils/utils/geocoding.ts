import NodeGeocoder from 'node-geocoder';

// Define strict types for our geocoding results
interface GeocodingResult {
  latitude: number;
  longitude: number;
}

// Create geocoder instance
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  language: 'es', // Set language to Spanish for better Peru results
  formatter: null
});

export async function geocodeAddress(address: string, city: string): Promise<GeocodingResult | null> {
  if (!address || !city) {
    console.warn('Missing address or city for geocoding');
    return null;
  }

  try {
    const searchAddress = `${address}, ${city}, Peru`;
    console.log(`Geocoding address: ${searchAddress}`);
    
    const results = await geocoder.geocode(searchAddress);
    
    if (!Array.isArray(results) || results.length === 0) {
      console.warn('No results found for address:', searchAddress);
      return null;
    }

    const firstResult = results[0];
    if (typeof firstResult?.latitude === 'number' && typeof firstResult?.longitude === 'number') {
      const coords: GeocodingResult = {
        latitude: firstResult.latitude,
        longitude: firstResult.longitude
      };
      console.log('Geocoding successful:', coords);
      return coords;
    }
    
    console.warn('Invalid coordinates in result for address:', searchAddress);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}
