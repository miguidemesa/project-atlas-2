import { Pressable, StyleSheet, View } from "react-native";
import { MessageCircle, Plus, Search, Store, User, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

interface Tab {
  name: string;
  label: string;
  Icon: LucideIcon;
}

const TABS: readonly Tab[] = [
  { name: "store", label: "Store", Icon: Store },
  { name: "search", label: "Search", Icon: Search },
  { name: "sell", label: "Sell", Icon: Plus },
  { name: "inbox", label: "Inbox", Icon: MessageCircle },
  { name: "me", label: "Me", Icon: User },
];

const ICON_SIZE = 22;
const ICON_STROKE = 1.75; // DESIGN.md: icons on a 24px grid at a 1.75 stroke
const CURRENT_LINE = 2;

interface Props {
  current: string;
  onSelect: (name: string) => void;
  bottomInset: number;
}

/** The phone tab bar from the designs: Chrome ground, Sell as a holo-cyan pill, a 2px cyan line on the current tab. */
export function TabBar({ current, onSelect, bottomInset }: Props) {
  const { color, radius, size, space, type } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { backgroundColor: color.chrome, borderTopColor: color.line, height: size.tabbar + bottomInset, paddingBottom: bottomInset },
      ]}
    >
      {TABS.map(({ name, label, Icon }) => {
        const selected = name === current;
        const sell = name === "sell";
        return (
          <Pressable
            key={name}
            testID={`tab-${name}`}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(name)}
            style={[styles.tab, { minHeight: size.control, gap: space[1] }]}
          >
            <View style={[styles.line, { height: CURRENT_LINE, width: space[6] }, selected && !sell && { backgroundColor: color.accent }]} />
            <View
              style={[
                styles.icon,
                { borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[1] },
                sell && { backgroundColor: color.accent },
              ]}
            >
              <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} color={sell ? color.onAccent : selected ? color.ink : color.inkFaint} />
            </View>
            <Text style={[type.caption, { color: selected ? color.ink : color.inkFaint }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  line: { position: "absolute", top: 0 },
  icon: { alignItems: "center", justifyContent: "center" },
});
