import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";

import { HomeScreen } from "./screens/HomeScreen";
import { appColors } from "./theme/colors";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: appColors.paper }}>
      <StatusBar style="dark" />
      <HomeScreen />
    </SafeAreaView>
  );
}
