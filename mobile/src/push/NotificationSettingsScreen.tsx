import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Switch, View } from "react-native";
import { NOTIFICATION_CATEGORIES, queryKeys, type NotificationPreference } from "@atlas/api";
import { api } from "@/api/client";
import { problem } from "@/session/form";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Text } from "@/ui/Text";
import { requestPushPermission } from "./push";

type Permission = "granted" | "ask" | "blocked" | "unavailable";

const PERMISSION_COPY: Record<Permission, { title: string; body?: string }> = {
  granted: { title: "Push alerts are on for this phone." },
  ask: { title: "Turn on push alerts", body: "Get told when you're outbid, an order ships or an offer comes in." },
  blocked: { title: "Alerts are off for Atlas in your phone's settings.", body: "Turn them on there to get alerts." },
  unavailable: { title: "This device can't receive alerts.", body: "Push alerts need a real phone; simulators and emulators can't get them." },
};

/** Notification settings: turn push on (M1's meaningful moment to ask), and choose which kinds of alert push. */
export function NotificationSettingsScreen() {
  const queryClient = useQueryClient();
  const { color, space, type } = useTheme();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void Notifications.getPermissionsAsync().then((p) => setPermission(p.granted ? "granted" : p.canAskAgain ? "ask" : "blocked"));
  }, []);

  const prefs = useQuery({ queryKey: queryKeys.notificationPreferences(), queryFn: () => api.loadNotificationPreferences() });
  const save = useMutation({
    mutationFn: (next: NotificationPreference[]) => api.saveNotificationPreferences(next),
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.notificationPreferences(), saved),
    onError: (err) => setNotice(problem(err)),
  });

  async function turnOn() {
    const result = await requestPushPermission();
    setPermission(result === "granted" ? "granted" : result === "denied" ? "blocked" : "unavailable");
  }

  async function testAlert() {
    try {
      await api.sendTestAlert();
      setNotice("Test alert sent. It arrives in a few seconds.");
    } catch (err) {
      setNotice(problem(err));
    }
  }

  const shown = save.isPending && save.variables ? save.variables : prefs.data;

  return (
    <ScrollView style={{ backgroundColor: color.base }} contentContainerStyle={{ padding: space[4], gap: space[5] }}>
      {permission ? <PermissionPanel permission={permission} onTurnOn={() => void turnOn()} /> : null}
      {prefs.isPending ? <ActivityIndicator accessibilityLabel="Loading your settings" color={color.accent} /> : null}
      {prefs.isError ? (
        <EmptyState
          title="Couldn't load your settings"
          body={problem(prefs.error)}
          action={<Button label="Try again" onPress={() => void prefs.refetch()} />}
        />
      ) : null}
      {shown ? (
        <View style={{ gap: space[1] }}>
          {NOTIFICATION_CATEGORIES.map((category) => (
            <CategoryRow
              key={category.id}
              name={category.name}
              description={category.description}
              value={shown.find((p) => p.category === category.id)?.pushEnabled ?? true}
              disabled={save.isPending}
              onChange={(enabled) =>
                save.mutate(shown.map((p) => (p.category === category.id ? { ...p, pushEnabled: enabled } : p)))
              }
            />
          ))}
        </View>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={[type.small, { color: color.inkDim }]}>
          {notice}
        </Text>
      ) : null}
      {__DEV__ ? <Button variant="ghost" label="Send me a test alert" onPress={() => void testAlert()} /> : null}
    </ScrollView>
  );
}

function PermissionPanel({ permission, onTurnOn }: { permission: Permission; onTurnOn: () => void }) {
  const { color, radius, space, type } = useTheme();
  const copy = PERMISSION_COPY[permission];
  return (
    <View style={{ gap: space[2], padding: space[4], borderRadius: radius.lg, borderWidth: 1, borderColor: color.line, backgroundColor: color.elevated }}>
      <Text style={[type.title4, { color: color.ink }]}>{copy.title}</Text>
      {copy.body ? <Text style={[type.body, { color: color.inkDim }]}>{copy.body}</Text> : null}
      {permission === "ask" ? <Button label="Turn on alerts" onPress={onTurnOn} /> : null}
      {permission === "blocked" ? <Button variant="ghost" label="Open settings" onPress={() => void Linking.openSettings()} /> : null}
    </View>
  );
}

interface CategoryRowProps {
  name: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}

function CategoryRow({ name, description, value, disabled, onChange }: CategoryRowProps) {
  const { color, size, space, type } = useTheme();
  return (
    <View style={{ minHeight: size.controlLg, flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[2] }}>
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyStrong, { color: color.ink }]}>{name}</Text>
        <Text style={[type.small, { color: color.inkDim }]}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={name}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: color.accent, false: color.avatar }}
        thumbColor={color.ink}
      />
    </View>
  );
}
