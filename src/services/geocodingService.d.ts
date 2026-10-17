export interface Coordinates {
  latitude: number;
  longitude: number;
  city?: string;
  matched?: string;
}

export declare const CITY_COORDINATES_MAP: Record<string, Coordinates>;
export declare const ALL_PRESET_LOCATIONS: Record<string, Coordinates>;

export declare function resolveAddressCoordinates(addressText: string): Promise<Coordinates>;
