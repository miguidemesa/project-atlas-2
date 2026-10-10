import { useRef, useState } from "react";
import { View } from "react-native";
import { useIsOnline } from "@/net/online";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "./Button";
import { Text } from "./Text";

interface Props {
  label: string;
  /** What can't happen offline, e.g. "Reconnect to place your bid." */
  offlineReason: string;
  /** Handles its own errors; a failure is shown, never retried for the person. */
  onPress: () => Promise<void>;
  disabled?: boolean;
  variant?: "primary" | "danger";
  testID?: string;
}

/**
 * The button for anything that moves money or makes a commitment (Buy now, Place bid, Make offer, Pay,
 * Delete account). Offline it's disabled with a short reason and the action is never queued. While the
 * request runs it can't be pressed again.
 */
export function CommitmentButton({ label, offlineReason, onPress, disabled = false, variant = "primary", testID }: Props) {
  const online = useIsOnline();
  const { color, space, type } = useTheme();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);

  async function press() {
    if (running.current) return; // a second tap before the first re-render
    running.current = true;
    setBusy(true);
    try {
      await onPress();
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space[2] }}>
      <Button testID={testID} label={label} variant={variant} onPress={() => void press()} disabled={disabled || !online} busy={busy} />
      {online ? null : <Text style={[type.small, { color: color.warn, textAlign: "center" }]}>{offlineReason}</Text>}
    </View>
  );
}
