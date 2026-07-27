import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'gym_device_id';

/**
 * Stable per-install device identifier used for device binding.
 * Persisted in SecureStore so it survives app restarts; a reinstall generates
 * a new id, which is intentional — reception must re-approve the new device.
 */
export async function getDeviceId(): Promise<string> {
  const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (stored) return stored;

  let id: string | null = null;
  if (Platform.OS === 'android') {
    id = Application.getAndroidId();
  } else if (Platform.OS === 'ios') {
    id = await Application.getIosIdForVendorAsync();
  }
  if (!id) id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}
