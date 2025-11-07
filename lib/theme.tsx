import React, { createContext, useContext, useMemo, useState } from "react";
import { View } from "react-native";

export type Theme = "light" | "dark";

type CtxType = {
  theme: Theme;
  toggleTheme: () => void;
};

const Ctx = createContext<CtxType>({
  theme: "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
    }),
    [theme]
  );

  return (
    <Ctx.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: theme === "dark" ? "#0B1020" : "#FFFFFF" }}>
        {children}
      </View>
    </Ctx.Provider>
  );
}

export const useThemeCtx = () => useContext(Ctx);
