import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.orbitstudio.nationtycoon",
  appName: "Nation Tycoon",
  webDir: "out",
  server: { androidScheme: "https", appStartPath: "/nation-tycoon/" },
  android: { backgroundColor: "#a7d8cb" },
};
export default config;
