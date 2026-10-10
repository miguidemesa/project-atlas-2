import { router } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { signInSchema } from "@atlas/api";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { Text } from "@/ui/Text";
import { TextField } from "@/ui/TextField";
import { fieldErrors, problem } from "./form";
import { useSession } from "./SessionProvider";

/** Sign-in, shown as a modal from Me. */
export function SignInScreen() {
  const { signIn } = useSession();
  const { color, space, type } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
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
      <Text style={[type.body, { color: color.inkDim }]}>Sign in to buy, bid and get alerts about your orders.</Text>
      <TextField
        testID="email-input"
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
        testID="password-input"
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      {errors.form ? (
        <Text accessibilityRole="alert" style={[type.small, { color: color.urgent }]}>
          {errors.form}
        </Text>
      ) : null}
      <Button testID="sign-in-submit" label="Sign in" onPress={() => void submit()} busy={busy} />
      <Button variant="ghost" label="Create an account" onPress={() => router.replace("/register")} />
    </ScrollView>
  );
}
