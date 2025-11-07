import { Stack } from "expo-router";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { ThemeProvider } from "@/lib/theme";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // iOS 15+ extras that the type expects in SDK 54
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});



export default function RootLayout() {
useEffect(() => {
(async () => {
const { status } = await Notifications.requestPermissionsAsync();
if (status !== "granted") console.warn("Notifications permission not granted");
})();
}, []);


return (
<ThemeProvider>
<Stack>
<Stack.Screen name="index" options={{ title: "Cryptid Planner" }} />
<Stack.Screen name="task/[id]" options={{ title: "Task" }} />
<Stack.Screen name="settings" options={{ title: "Settings" }} />
<Stack.Screen name="gacha" options={{ title: "Gacha" }} />
</Stack>
</ThemeProvider>
);
}