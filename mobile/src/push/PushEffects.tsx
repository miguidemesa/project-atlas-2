import { useSession } from "@/session/SessionProvider";
import { useNotificationTaps, usePushRegistration } from "./push";

/** Keeps this phone registered while someone is signed in, and opens tapped alerts. Renders nothing. */
export function PushEffects() {
  const { user } = useSession();
  usePushRegistration(user !== null);
  useNotificationTaps();
  return null;
}
