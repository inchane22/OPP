import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Business } from '@db/schema';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  business: Business;
  className?: string;
}

export function MapView({ business, className = "" }: MapViewProps) {
  // Center map on Peru's approximate center
  const defaultCenter: [number, number] = [-12.0464, -77.0428]; // Lima coordinates as default
  const position: [number, number] = [
    Number(business.latitude) || defaultCenter[0],
    Number(business.longitude) || defaultCenter[1]
  ];

  return (
    <MapContainer
      center={position}
      zoom={15}
      className={`w-full h-[200px] ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>
          <div className="p-2">
            <h3 className="font-semibold">{business.name}</h3>
            <p className="text-sm text-gray-600">{business.address}</p>
            <p className="text-sm text-gray-600">{business.city}</p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
