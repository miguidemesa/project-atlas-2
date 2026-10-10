import { Tabs } from "expo-router";
import { TabBar } from "@/ui/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation, insets }) => (
        <TabBar
          current={state.routes[state.index].name}
          bottomInset={insets.bottom}
          onSelect={(name) => navigation.navigate(name)}
        />
      )}
    >
      <Tabs.Screen name="store" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="sell" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
