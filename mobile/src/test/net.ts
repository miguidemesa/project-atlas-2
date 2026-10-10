import { useNetInfo, type NetInfoState } from "@react-native-community/netinfo";

/** Puts the mocked NetInfo online or offline for the components under test. */
export function setOnline(isConnected: boolean): void {
  jest.mocked(useNetInfo).mockReturnValue({
    type: isConnected ? "wifi" : "none",
    isConnected,
    isInternetReachable: isConnected,
    details: null,
  } as NetInfoState);
}
