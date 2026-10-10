import { cardSubtitle, formatPeso, queryKeys, tierFor, type Listing } from "@atlas/api";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { api } from "@/api/client";
import { CardPhoto } from "@/cards/CardPhoto";
import { LONG_PRESS_MS, LiftPeek, shownPrice, type Lifted } from "@/cards/LiftPeek";
import { measureOrigin } from "@/cards/measure";
import { listingPhoto } from "@/cards/photo-uri";
import { shareListing } from "@/cards/share";
import { useTheme } from "@/theme/ThemeProvider";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { PressableScale } from "@/ui/PressableScale";
import { Screen } from "@/ui/Screen";
import { Text } from "@/ui/Text";
import { firstShelf } from "./first-shelf";

const ROW_PHOTO_WIDTH = 72;

/** M1's Store tab: the storefront API's first shelf as a list of cards in their sleeves; a long press lifts one. */
export function StoreScreen() {
  const { color, space, type } = useTheme();
  const storefront = useQuery({ queryKey: queryKeys.storefront(), queryFn: () => api.loadStorefront() });
  const [lifted, setLifted] = useState<Lifted | null>(null);

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
        extraData={lifted}
        keyExtractor={(listing) => listing.id}
        renderItem={({ item }) => <ListingRow listing={item} isLifted={lifted?.listing.id === item.id} onLift={setLifted} />}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: space[8] }}
      />
      <LiftPeek lifted={lifted} onClose={() => setLifted(null)} />
    </Screen>
  );
}

function ListingRow({ listing, isLifted, onLift }: { listing: Listing; isLifted: boolean; onLift: (lifted: Lifted) => void }) {
  const { color, space, type } = useTheme();
  const sleeve = useRef<View>(null);
  const price = shownPrice(listing);
  return (
    <PressableScale
      testID={`listing-row-${listing.id}`}
      accessible
      accessibilityLabel={`${listing.title}, ${formatPeso(price)}`}
      accessibilityActions={[{ name: "share", label: "Share" }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "share") void shareListing(listing);
      }}
      delayLongPress={LONG_PRESS_MS}
      onLongPress={() => measureOrigin(sleeve.current, (origin) => onLift({ listing, origin }))}
      style={{ flexDirection: "row", gap: space[3], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line }}
    >
      {/* The sleeve looks empty while its card is lifted out. */}
      <View ref={sleeve} collapsable={false} style={{ opacity: isLifted ? 0 : 1 }}>
        <CardPhoto uri={listingPhoto(listing.imageUrl)} tier={tierFor(listing)} width={ROW_PHOTO_WIDTH} label={listing.title} />
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text style={[type.bodyStrong, { color: color.ink }]}>{listing.title}</Text>
        <Text style={[type.small, { color: color.inkDim }]}>{cardSubtitle(listing)}</Text>
        <Text style={[type.price, styles.tabular, { color: color.ink }]}>{formatPeso(price)}</Text>
        <Text style={[type.caption, { color: color.inkFaint }]}>{listing.sellerName}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sectionTitle: { textTransform: "uppercase" }, // section titles are the store's one uppercase heading; card names never are
  tabular: { fontVariant: ["tabular-nums"] },
});
