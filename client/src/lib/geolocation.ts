// Geolocation utility for centering map on user's location

export interface UserLocation {
  center: [number, number]; // [lng, lat]
  zoom: number;
}

function accuracyToZoom(accuracy: number): number {
  if (accuracy < 100) return 13;
  if (accuracy <= 1000) return 12;
  return 11;
}

export function getUserLocation(timeoutMs = 10000): Promise<UserLocation | null> {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          center: [longitude, latitude],
          zoom: accuracyToZoom(accuracy),
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 60000,
      }
    );
  });
}
