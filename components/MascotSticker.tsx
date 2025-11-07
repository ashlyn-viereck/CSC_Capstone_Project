/**import { Image } from "react-native";
import { useThemeCtx } from "@/lib/theme";

export default function MascotSticker({
  level,
  size = 28,
}: {
  level: 1 | 2 | 3;
  size?: number;
}) {
  const { theme } = useThemeCtx();

  const src =
    theme === "dark"
      ? level === 1
        ? require("@/assets/mascots/mild-cryptid.png")
        : level === 2
        ? require("@/assets/mascots/moderate-cryptid.png")
        : require("@/assets/mascots/extreme-cryptid.png")
      : level === 1
      ? require("@/assets/mascots/mild-animal.png")
      : level === 2
      ? require("@/assets/mascots/moderate-animal.png")
      : require("@/assets/mascots/extreme-animal.png");

  return <Image source={src} style={{ width: size, height: size, borderRadius: 8 }} />;
}
**/

import { Text, View } from "react-native";
import { useThemeCtx } from "@/lib/theme";

export default function MascotSticker({
  level,
  size = 28,
}: {
  level: 1 | 2 | 3;
  size?: number;
}) {
  const { theme } = useThemeCtx();
  const isDark = theme === "dark";

  // Emoji “mascots” so you can run without PNGs
  const emoji =
    isDark
      ? (level === 1 ? "🦋" : level === 2 ? "🦕" : "🦝") // cryptids-ish
      : (level === 1 ? "🐼" : level === 2 ? "🦦" : "🦊"); // animals

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
      }}
    >
      <Text style={{ fontSize: Math.floor(size * 0.8) }}>{emoji}</Text>
    </View>
  );
}
