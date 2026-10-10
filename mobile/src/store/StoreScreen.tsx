import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { cardSubtitle, formatPeso, queryKeys, type Listing } from "@atlas/api";
import { api } from "@/api/client";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { firstShelf } from "./first-shelf";

/** M1's Store tab: the storefront API's first shelf as a plain list, proving the pipeline end to end. */
export function StoreScreen() {
  const { color, space, type } = useTheme();
  const storefront = useQuery({ queryKey: queryKeys.storefront(), queryFn: () => api.loadStorefront() });

  if (storefront.isPending) {
    return (
      <Screen title="Store">
        <ActivityIndicator accessibilityLabel="Loading the store" color={color.accent} style={styles.fill} />
      </Screen>
    );
  }
  if (storefront.isError) {
    return (
      <Screen title="Store">
        <EmptyState
          title="Couldn't load the store"
          body="Check your connection, then try again."
          action={<Button label="Try again" onPress={() => void storefront.refetch()} />}
        />
      </Screen>
    );
  }

  const shelf = firstShelf(storefront.data);
  if (!shelf) {
    return (
      <Screen title="Store">
        <EmptyState title="Nothing for sale yet" body="New listings show up here as sellers add them." />
      </Screen>
    );
  }

  return (
    <Screen title="Store">
      <Text style={[type.title2Phone, styles.sectionTitle, { color: color.ink, paddingHorizontal: space[4] }]}>{shelf.title}</Text>
      <FlatList
        testID="store-list"
        data={shelf.listings}
        keyExtractor={(listing) => listing.id}
        renderItem={({ item }) => <ListingRow listing={item} />}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[8] }}
      />
    </Screen>
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  const { color, space, type } = useTheme();
  const price = listing.format === "auction" ? (listing.currentBid ?? listing.price) : listing.price;
  return (
    <View
      accessible
      accessibilityLabel={`${listing.title}, ${formatPeso(price)}`}
      style={{ paddingVertical: space[3], gap: space[1], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line }}
    >
      <Text style={[type.bodyStrong, { color: color.ink }]}>{listing.title}</Text>
      <Text style={[type.small, { color: color.inkDim }]}>{cardSubtitle(listing)}</Text>
      <Text style={[type.price, styles.tabular, { color: color.ink }]}>{formatPeso(price)}</Text>
      <Text style={[type.caption, { color: color.inkFaint }]}>{listing.sellerName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sectionTitle: { textTransform: "uppercase" }, // section titles are the store's one uppercase heading; card names never are
  tabular: { fontVariant: ["tabular-nums"] },
});
