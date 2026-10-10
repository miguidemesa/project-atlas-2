import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

/** True unless NetInfo knows the phone is offline. Unknown at launch counts as online, so nothing flashes "offline". */
export function useIsOnline(): boolean {
  return useNetInfo().isConnected !== false;
}

/** Lets TanStack Query pause reads while offline and refetch on reconnect. Mutations ignore it (see createQueryClient). */
export function connectOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)));
}
