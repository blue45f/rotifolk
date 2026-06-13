/** Haversine distance between two lat/lng points, in kilometres. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** "0.4km", "2.8km", "12km" */
export function formatDistanceKm(km: number): string {
  if (km < 0.05) return '바로 옆'
  if (km < 1) return `${Math.round(km * 10) / 10}km`
  if (km < 10) return `${Math.round(km * 10) / 10}km`
  return `${Math.round(km)}km`
}

/** Seoul neighborhoods sample coords for fallback / mock UI. */
export const SEOUL_AREAS: Record<string, { lat: number; lng: number }> = {
  한남동: { lat: 37.5345, lng: 127.0019 },
  연남동: { lat: 37.564, lng: 126.9244 },
  북촌: { lat: 37.5828, lng: 126.9839 },
  강남: { lat: 37.4979, lng: 127.0276 },
  성수: { lat: 37.5444, lng: 127.0557 },
  망원: { lat: 37.5557, lng: 126.9026 },
  이태원: { lat: 37.5345, lng: 126.9947 },
  홍대: { lat: 37.5563, lng: 126.922 },
}
