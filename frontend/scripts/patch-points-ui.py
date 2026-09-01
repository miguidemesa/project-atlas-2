import os

os.chdir("/Users/migui/Documents/project-atlas 2/frontend")

STAR = "\u2b50"

# ---- bid-box: points toggle ----
p = "src/components/listing/bid-box.tsx"
s = open(p).read()
if "fetchMyRewards" not in s:
    s = s.replace(
        'import { createOrder, makeOffer, payOrder as payOrderApi, placeBid } from "@/lib/api";',
        'import { createOrder, makeOffer, maxRedeemable, payOrder as payOrderApi, placeBid, fetchMyRewards } from "@/lib/api";',
    )
old = "  const [usePts, setUsePts] = useState(false);"
if old not in s:
    anchor = "  const { user, authFetch } = useAuth();\n  const router = useRouter();"
    addition = (
        "  const [usePts, setUsePts] = useState(false);\n"
        "  const [ptsBalance, setPtsBalance] = useState(0);\n"
        + anchor
        + "\n\n  useEffect(() => {\n"
        + "    if (!user || format !== \"fixed\") return;\n"
        + "    let live = true;\n"
        + "    fetchMyRewards(authFetch).then((r) => { if (live) setPtsBalance(r.balance); });\n"
        + "    return () => { live = false; };\n"
        + "  }, [user, format, authFetch]);"
    )
    assert anchor in s
    s = s.replace(anchor, addition)
s = s.replace(
    "const paid = await payOrderApi(created.order.id, undefined, authFetch);",
    "const paid = await payOrderApi(created.order.id, undefined, usePts, authFetch);",
)
toggle_anchor = '{buyError && <p role="alert" className="mt-2 text-xs text-urgent">{buyError}</p>}'
toggle_ui = (
    toggle_anchor
    + "\n          {ptsBalance >= 100 && (\n"
    + "            <label className=\"mt-2 flex cursor-pointer items-center gap-2 text-xs text-ink-dim\">\n"
    + "              <input type=\"checkbox\" checked={usePts} onChange={(e) => setUsePts(e.target.checked)} className=\"h-3.5 w-3.5 accent-[#b08d3e]\" />\n"
    + "              Use \u2b50 points \u2014 save {formatPeso(maxRedeemable(ptsBalance, price))}\n"
    + "            </label>\n"
    + "          )}"
)
assert toggle_anchor in s
s = s.replace(toggle_anchor, toggle_ui, 1)
open(p, "w").write(s)
print("bid-box patched")

# ---- orders page PayNow gains points toggle ----
p3 = "src/app/orders/page.tsx"
s3 = open(p3).read()
if STAR + " points" not in s3:
    s3 = s3.replace("import { payOrder as payOrderApi,", "import { fetchMyRewards, payOrder as payOrderApi,")
    s3 = s3.replace(
        "const r = await payOrderApi(orderId, hasAddress ? undefined : address, authFetch);",
        "const r = await payOrderApi(orderId, hasAddress ? undefined : address, usePoints, authFetch);",
    )
    fn_anchor = "async function go() {\n    setBusy(true);\n    setError(\"\");"
    fn_addition = (
        "const [usePoints, setUsePoints] = useState(false);\n"
        "  const rw = useQuery({ queryKey: [\"rewards\"], queryFn: () => fetchMyRewards(authFetch) });\n\n  "
        + fn_anchor
    )
    assert fn_anchor in s3
    s3 = s3.replace(fn_anchor, fn_addition)
    ui_anchor = "{!hasAddress && ("
    ui_addition = (
        "{rw.data && rw.data.balance >= 100 && (\n"
        "        <label className=\"flex cursor-pointer items-center gap-2 text-xs text-ink-dim\">\n"
        "          <input type=\"checkbox\" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className=\"h-3.5 w-3.5 accent-[#b08d3e]\" />\n"
        "          Use " + STAR + " {rw.data.balance} pts\n"
        "        </label>\n"
        "      )}\n\n      {!hasAddress && ("
    )
    assert ui_anchor in s3
    s3 = s3.replace(ui_anchor, ui_addition, 1)
open(p3, "w").write(s3)
print("orders patched")
