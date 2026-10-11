import { router } from "expo-router";
import { View } from "react-native";
import { useSession } from "@/session/SessionProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { LinkRow } from "@/ui/LinkRow";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";

/** The Me tab in M1: who is signed in, and sign-in or sign-out. P6 builds the full Me page. */
export function MeScreen() {
  const { user, ready, signOut } = useSession();
  const { color, space, type } = useTheme();

  if (!ready) return <Screen title="Me" />;
  if (!user) {
    return (
      <Screen title="Me">
        <EmptyState
          title="Sign in to Atlas"
          body="Track your orders, get alerts and manage your account."
          action={
            <View style={{ alignSelf: "stretch", gap: space[3] }}>
              <Button testID="me-sign-in" label="Sign in" onPress={() => router.push("/sign-in")} />
              <Button testID="me-create-account" variant="ghost" label="Create an account" onPress={() => router.push("/register")} />
            </View>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen title="Me">
      <View style={{ padding: space[4], gap: space[1] }}>
        <Text style={[type.title3, { color: color.ink }]}>{user.name}</Text>
        <Text style={[type.small, { color: color.inkDim }]}>{user.email}</Text>
      </View>
      <LinkRow label="Notifications" onPress={() => router.push("/me/notifications")} />
      <View style={{ padding: space[4] }}>
        <Button testID="me-sign-out" variant="ghost" label="Sign out" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
