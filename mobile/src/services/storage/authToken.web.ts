import AsyncStorage from '@react-native-async-storage/async-storage';

// Legacy bearer tokens are used only to exchange the session for an HttpOnly cookie.
export async function getAuthToken(): Promise<string | null> {
    return AsyncStorage.getItem('mugen_mobile_token');
}

export async function clearAuthToken() { await AsyncStorage.removeItem('mugen_mobile_token'); }
export async function setAuthToken(_token: string) { await clearAuthToken(); }
