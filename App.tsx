import { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { useTasks } from './src/state/useTasks';
import { useAuth } from './src/state/useAuth';
import { useGacha } from './src/state/useGacha';
import { checkOverdueAndApplyPetMood } from './src/data/mood';
import { ensureNotifPermission, configureAndroidChannel } from './src/data/notifications';
import { useSettings } from './src/state/useSettings';
import 'react-native-url-polyfill/auto';


export default function App() {
  const { refresh } = useTasks();
  const { user, hydrate: hydrateAuth } = useAuth();
  const { hydrate: hydrateGacha, reset: resetGacha } = useGacha();
  const { hydrate: hydrateSettings } = useSettings();

  // Boot: auth only
  useEffect(() => {
    hydrateAuth();
    hydrateSettings();
  }, []);

  // Whenever the active user changes: reset in-memory state, then hydrate that user's data
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      await resetGacha();                // clear previous user's in-memory data                   
      await configureAndroidChannel();
      await ensureNotifPermission();
      await hydrateGacha();              // load gacha save for current user
      await refresh(user.id);                   // reload tasks list
      await checkOverdueAndApplyPetMood(user.id); // <-- apply penalties
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  return <AppNavigator />;
}
