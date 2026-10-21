import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const key = 'mugen_mobile_token';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function getAuthToken(): Promise<string | null> {
    const saved = await SecureStore.getItemAsync(key, options);
    const legacy = await AsyncStorage.getItem(key);
    if (saved) {
        if (legacy) await AsyncStorage.removeItem(key);
        return saved;
    }
    if (!legacy) return null;
    // Delete the legacy copy only after secure persistence succeeds.
    await SecureStore.setItemAsync(key, legacy, options);
    await AsyncStorage.removeItem(key);
    return legacy;
}

export async function setAuthToken(token: string) {
    await SecureStore.setItemAsync(key, token, options);
    await AsyncStorage.removeItem(key);
}

export async function clearAuthToken() {
    await SecureStore.deleteItemAsync(key, options);
    await AsyncStorage.removeItem(key);
}
