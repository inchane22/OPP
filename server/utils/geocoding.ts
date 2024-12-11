import * as NodeGeocoder from 'node-geocoder';

const options: NodeGeocoder.Options = {
  provider: 'openstreetmap',
  httpAdapter: 'https',
  timeout: 5000
};

const geocoder = NodeGeocoder.default(options);

export async function geocodeAddress(address: string, city: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!address || !city) {
    console.warn('Missing address or city for geocoding');
    return null;
  }

  try {
    console.log(`Geocoding address: ${address}, ${city}, Peru`);
    const results = await geocoder.geocode(`${address}, ${city}, Peru`);
    
    if (results?.[0]?.latitude && results[0]?.longitude) {
      const coords = {
        latitude: Number(results[0].latitude),
        longitude: Number(results[0].longitude)
      };
      console.log('Geocoding successful:', coords);
      return coords;
    }
    
    console.warn('No coordinates found for address:', address);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}
