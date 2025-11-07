import { View } from "react-native";

export default function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = Math.max(0, Math.min(1, total ? value / total : 0));
  return (
    <View style={{ height: 10, backgroundColor: "#E5E7EB", borderRadius: 9999 }}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: 10,
          borderRadius: 9999,
          backgroundColor: "#60A5FA",
        }}
      />
    </View>
  );
}
