import os

p = "src/components/browse/browse-client.tsx"
s = open(p).read()

# imports
s = s.replace('import { fetchFeed, type BrowseFilters } from "@/lib/api";',
'''import { fetchFeed, parseSearchQuery, type BrowseFilters } from "@/lib/api";
import { Sparkles } from "lucide-react";''')

# state + effect after existing state block
anchor = '''  const [sheetOpen, setSheetOpen] = useState(false);'''
addition = anchor + '''

  const [aiApplied, setAiApplied] = useState(false);
  const [aiChips, setAiChips] = useState<string[]>([]);'''
assert anchor in s
s = s.replace(anchor, addition)

# apply parsed filters once
apply_effect = '''
  // NL search: interpret free-text q into structured filters once per mount
  useEffect(() => {
    const q = initial.q?.trim();
    if (!q || aiApplied) return;
    let cancelled = false;
    parseSearchQuery(q).then((parsed) => {
      if (cancelled || !parsed) return;
      const chips: string[] = [];
      if (parsed.category && !category) {
        setCategory(parsed.category as BrowseFilters["category"]);
        chips.push(CATEGORY_LABELS[parsed.category] ?? parsed.category);
      }
      if (parsed.format && !format) setFormat(parsed.format);
      if (parsed.graded && !graded) { setGraded(true); chips.push("Graded"); }
      if (parsed.maxPrice && !maxPrice) {
        setMaxPrice(String(parsed.maxPrice));
        chips.push(`under \u20b1${parsed.maxPrice.toLocaleString("en-PH")}`);
      }
      setAiApplied(true);
      if (chips.length) setAiChips(chips);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiApplied, initial.q]);
'''
marker = "\n  const filters: BrowseFilters = {"
assert marker in s
s = s.replace(marker, apply_effect + marker)

# CATEGORY_LABELS constant for chip labels
if "CATEGORY_LABELS" not in s:
    s = s.replace("const SORTS = [",
'''const CATEGORY_LABELS: Record<string, string> = {
  nba: "NBA",
  pokemon: "Pokémon",
  one_piece: "One Piece",
  disney: "Disney & Lorcana",
};

const SORTS = [''')

# render AI chips under results line
res_anchor = '''          <p className="text-sm text-ink-dim" aria-live="polite">'''
chip_render = '''          {aiChips.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gold" title="Parsed from your search using AI">
              <Sparkles size={12} />
              {aiChips.map((c) => (
                <span key={c} className="rounded border border-gold/40 px-1.5 py-0.5">{c}</span>
              ))}
            </div>
          )}
''' + res_anchor
assert res_anchor in s
s = s.replace(res_anchor, chip_render)

open(p, "w").write(s)
print("browse-client patched")
