import { getPublicCars, getSetting } from "@/lib/public-cars";
import { sectionOfToken, type Section } from "@/lib/sections";
import {
  InventoryBrowser,
  type InventoryInitial,
} from "@/components/site/InventoryBrowser";

export const metadata = { title: "Inventory — TrueSpec" };
export const dynamic = "force-dynamic";

type Sort = "new" | "low" | "high" | "year";
const SORTS: Sort[] = ["new", "low", "high", "year"];

function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v])
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(v: string | string[] | undefined): number | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const [cars, number] = await Promise.all([getPublicCars(), getSetting("whatsapp_number")]);

  const sortParam = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const viewParam = Array.isArray(sp.view) ? sp.view[0] : sp.view;

  const initial: InventoryInitial = {
    status: [
      ...new Set(
        list(sp.status)
          .map((t) => sectionOfToken(t))
          .filter((s): s is Section => s !== null),
      ),
    ],
    make: [...new Set(list(sp.make))],
    year: [...new Set(list(sp.year).map((y) => parseInt(y, 10)).filter((y) => !Number.isNaN(y)))],
    color: [...new Set(list(sp.color))],
    min: num(sp.min),
    max: num(sp.max),
    sort: SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "new",
    view: viewParam === "list" ? "list" : "grid",
    page: Math.max(1, Math.floor(num(sp.page) ?? 1)),
  };

  return <InventoryBrowser cars={cars} number={number ?? ""} initial={initial} />;
}
