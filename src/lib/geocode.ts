export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

// 国土地理院の住所検索API(無料・キー不要)
export async function geocode(address: string): Promise<GeocodeResult[]> {
  const res = await fetch(
    `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`,
  );
  if (!res.ok) throw new Error("住所検索に失敗しました");
  const json = (await res.json()) as Array<{
    geometry: { coordinates: [number, number] };
    properties: { title: string };
  }>;
  return json.slice(0, 5).map((item) => ({
    lng: item.geometry.coordinates[0],
    lat: item.geometry.coordinates[1],
    label: item.properties.title,
  }));
}
