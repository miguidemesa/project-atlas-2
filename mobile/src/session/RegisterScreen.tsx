import { router } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { registerSchema } from "@atlas/api";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { TextField } from "@/ui/TextField";
import { fieldErrors, problem } from "./form";
import { useSession } from "./SessionProvider";

/** A new account, shown as a modal from Me. */
export function RegisterScreen() {
  const { register } = useSession();
  const { color, space, type } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await register(parsed.data.email, parsed.data.name, parsed.data.password);
      router.back();
    } catch (err) {
      setErrors({ form: problem(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: color.base }}
      contentContainerStyle={{ padding: space[4], gap: space[4] }}
    >
      <TextField label="Name" value={name} onChangeText={setName} error={errors.name} autoComplete="name" textContentType="name" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      {errors.form ? (
        <Text accessibilityRole="alert" style={[type.small, { color: color.urgent }]}>
          {errors.form}
        </Text>
      ) : null}
      <Button label="Create account" onPress={() => void submit()} busy={busy} />
    </ScrollView>
  );
}
