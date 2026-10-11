import { TabStack } from "@/ui/TabStack";

export default function MeLayout() {
  return <TabStack titles={{ notifications: "Notifications", "delete-account": "Delete account" }} />;
}
