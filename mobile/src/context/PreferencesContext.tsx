import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Preference = 'system' | 'light' | 'dark';
const Context = createContext({ preference: 'system' as Preference, scheme: 'light' as 'light' | 'dark', setPreference: (_value: Preference) => {} });
export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preference, setValue] = useState<Preference>('system');
  const [hydrated, setHydrated] = useState(false); const system = useSystemScheme();
  useEffect(() => {
    AsyncStorage.getItem('mugen_appearance').then(value => { if (value === 'system' || value === 'light' || value === 'dark') setValue(value); }).catch(() => {}).finally(() => setHydrated(true));
  }, []);
  const setPreference = (value: Preference) => { setValue(value); void AsyncStorage.setItem('mugen_appearance', value).catch(() => {}); };
  const scheme = !hydrated ? 'light' : preference === 'system' ? system === 'dark' ? 'dark' : 'light' : preference;
  return <Context.Provider value={{ preference, scheme, setPreference }}>{children}</Context.Provider>;
}
export const usePreferences = () => useContext(Context);
export const useAppColorScheme = () => useContext(Context).scheme;
