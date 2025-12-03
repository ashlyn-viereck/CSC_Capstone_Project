import { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { init } from './src/data/db';
import { useTasks } from './src/state/useTasks';
import { useAuth } from './src/state/useAuth';
import { useGacha } from './src/state/useGacha';
import { checkOverdueAndApplyPetMood } from './src/data/mood';
import { ensureNotifPermission, configureAndroidChannel } from './src/data/notifications';
import { useSettings } from './src/state/useSettings';

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
      await resetGacha();                // clear previous user's in-memory data
      await init();                      // if you later make DB per-user, keep this here
      await configureAndroidChannel();
      await ensureNotifPermission();
      await hydrateGacha();              // load gacha save for current user
      await refresh();                   // reload tasks list
      await checkOverdueAndApplyPetMood(user?.email); // <-- apply penalties
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  return <AppNavigator />;
}
