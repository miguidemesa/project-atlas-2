import { GlobalBar } from "./global-bar";
import { StoreBar } from "./store-bar";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20">
      <GlobalBar />
      <StoreBar />
    </header>
  );
}
