import { EmptyState } from "@/ui/EmptyState";
import { Screen } from "@/ui/Screen";

/** A tab whose feature arrives in a later phase. It says so plainly and never shows stand-in content. */
export function ComingSoon({ title, heading, body }: { title: string; heading: string; body: string }) {
  return (
    <Screen title={title}>
      <EmptyState title={heading} body={body} />
    </Screen>
  );
}

export function SearchScreen() {
  return <ComingSoon title="Search" heading="Search is on its way" body="Searching by card, set or player comes with the full store." />;
}

export function SellScreen() {
  return <ComingSoon title="Sell" heading="Selling from the app is on its way" body="Until then, list your cards on the Atlas website." />;
}

export function InboxScreen() {
  return <ComingSoon title="Inbox" heading="Messages are on their way" body="Until then, your messages and offers are on the Atlas website." />;
}
