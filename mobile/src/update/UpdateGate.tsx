import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import type { ReactNode } from "react";
import { Linking, Platform } from "react-native";
import { queryKeys } from "@atlas/api";
import { api } from "@/api/client";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";
import { isBelowMinimum } from "./version";

/**
 * Shows "Update Atlas" instead of the app when this build is older than the API's minimumAppVersion.
 * While loading, offline without a saved answer, or when the config can't be read, the app opens as usual.
 */
export function UpdateGate({ children }: { children: ReactNode }) {
  const config = useQuery({ queryKey: queryKeys.appConfig(), queryFn: () => api.loadAppConfig() });
  if (!isBelowMinimum(Constants.expoConfig?.version, config.data?.minimumAppVersion)) return children;

  const storeUrl = Platform.OS === "ios" ? Constants.expoConfig?.ios?.appStoreUrl : Constants.expoConfig?.android?.playStoreUrl;
  return (
    <Screen>
      <EmptyState
        title="Update Atlas"
        body={
          storeUrl
            ? "This version of Atlas is out of date. Update to keep buying, selling and getting alerts."
            : "This version of Atlas is out of date. Update it from the App Store or Google Play."
        }
        action={storeUrl ? <Button label="Update" onPress={() => void Linking.openURL(storeUrl)} /> : undefined}
      />
    </Screen>
  );
}
