import { router } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { problem } from "@/session/form";
import { useSession } from "@/session/SessionProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { CommitmentButton } from "@/ui/CommitmentButton";
import { Text } from "@/ui/Text";
import { TextField } from "@/ui/TextField";

const CONFIRMATION = "DELETE";

/** In-app account deletion (Apple requires it), with a typed confirmation. */
export function DeleteAccountScreen() {
  const { deleteAccount } = useSession();
  const { color, space, type } = useTheme();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);
    try {
      await deleteAccount();
      router.replace("/me");
    } catch (err) {
      setError(problem(err));
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: color.base }}
      contentContainerStyle={{ padding: space[4], gap: space[4] }}
    >
      <Text style={[type.body, { color: color.ink }]}>
        Deleting your account removes your name, email, phone number and settings, signs you out, and can't be undone.
      </Text>
      <Text style={[type.body, { color: color.inkDim }]}>
        Completed orders and reviews stay on record under "Deleted user", because the other person needs them.
      </Text>
      <Text style={[type.body, { color: color.inkDim }]}>
        You can't delete your account while an order, a dispute, a winning bid or a wallet balance is still open. We'll tell you what to finish first.
      </Text>
      <TextField
        testID="delete-confirm-input"
        label="Type DELETE to confirm"
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[type.small, { color: color.urgent }]}>
          {error}
        </Text>
      ) : null}
      <CommitmentButton
        testID="delete-account-submit"
        label="Delete my account"
        variant="danger"
        offlineReason="Reconnect to delete your account."
        disabled={typed.trim() !== CONFIRMATION}
        onPress={remove}
      />
    </ScrollView>
  );
}
