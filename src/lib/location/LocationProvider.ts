export interface LocationProvider {
  initialize(): Promise<void>;
  getCurrentLocation(): Promise<void>;
  onLocationChange(callback: (artworkId: string) => void): void;
  cleanup(): void;
}