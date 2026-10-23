import type { ReactNode } from "react";
import type { WaitingToBeCleared } from "@/lib/cleanup";
import { formatBytes } from "@/lib/notices";
import { longDay } from "@/lib/office-time";

/**
 * The report-only "Waiting to be cleared" card (TASK-006 G / Q10).
 *
 * It reads what `listWaitingToBeCleared()` found and shows every group. It has no delete controls:
 * the owner clears a car through Inventory and an enquiry through the enquiry delete; this card is
 * the telling, not a queue.
 *
 * Empty and unknown are different facts. An empty group says "None"; an unreadable asset store says
 * the group is unknown and prints the reason. A zero from a failed read would be a lie.
 */
function Group({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children?: ReactNode;
}) {
  return (
    <section className="cleanup-group">
      <div className="cleanup-head">
        <h3>{title}</h3>
        <span className="cleanup-count">{count}</span>
      </div>
      {count === 0 ? <p className="cleanup-empty">{empty}</p> : <div className="cleanup-list">{children}</div>}
    </section>
  );
}

export function CleanupCard({ data }: { data: WaitingToBeCleared }) {
  const unreadable = data.assetStore.readable ? null : data.assetStore.note;

  return (
    <section className="card" aria-labelledby="cleanup-title">
      <div className="ch">
        <i className="fa-solid fa-broom" aria-hidden="true" />
        <h2 id="cleanup-title">Waiting to be cleared</h2>
      </div>
      <p className="cd">
        A live report of what is old, broken or left behind. Nothing here is a button: a car is
        cleared from Inventory, an enquiry from its own delete.
      </p>

      {unreadable ? (
        <div className="notice warn" role="status">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <div>
            <b>The asset store could not be read</b>
            <span>{unreadable}. The asset groups below are unknown, not empty.</span>
          </div>
        </div>
      ) : null}

      <div className="cleanup">
        <Group
          title="Deleted cars"
          count={data.deletedCars.length}
          empty="No deleted cars are waiting."
        >
          {data.deletedCars.map((car) => (
            <div className="cleanup-row" key={car.ref}>
              <b>{car.ref}</b>
              <span>
                {[car.name || "Unnamed car"].join(" ")} · deleted {car.ageDays} day
                {car.ageDays === 1 ? "" : "s"} ago · {car.photos} photo
                {car.photos === 1 ? "" : "s"}, {car.costLines} cost line
                {car.costLines === 1 ? "" : "s"} · {car.sold ? "had a sale" : "no sale"}
              </span>
            </div>
          ))}
        </Group>

        <Group
          title="Enquiries at their year"
          count={data.enquiriesAtTheirYear.length}
          empty="No enquiry has reached its year."
        >
          {data.enquiriesAtTheirYear.map((enquiry) => (
            <div className="cleanup-row" key={enquiry.id}>
              <b>{enquiry.ref}</b>
              <span>
                {enquiry.name || "No name"} · {enquiry.number || "no number"} · asked for{" "}
                {enquiry.askedFor || "—"} · recorded {longDay(enquiry.recordedAt)} ({enquiry.ageDays}{" "}
                days)
              </span>
            </div>
          ))}
        </Group>

        <Group
          title="Rows holding an address"
          count={data.rowsHoldingAnAddress.length}
          empty="Every photo and imported sheet holds an asset reference."
        >
          {data.rowsHoldingAnAddress.map((row) => (
            <div className="cleanup-row" key={`${row.rowKind}:${row.rowId}`}>
              <b>{row.rowKind === "car_photo" ? `Photo${row.ref ? ` on ${row.ref}` : ""}` : "Imported sheet"}</b>
              <span>
                <code className="cleanup-code">{row.address}</code>
                {row.origin ? ` · ${row.origin}` : ""}
              </span>
            </div>
          ))}
        </Group>

        <Group
          title="Rows pointing at a missing asset"
          count={data.rowsPointingAtMissingAssets.length}
          empty={
            data.assetStore.readable
              ? "Every asset reference resolves."
              : "Unknown until the asset store can be read."
          }
        >
          {data.rowsPointingAtMissingAssets.map((row) => (
            <div className="cleanup-row" key={`${row.rowKind}:${row.rowId}`}>
              <b>{row.rowKind === "car_photo" ? `Photo${row.ref ? ` on ${row.ref}` : ""}` : "Imported sheet"}</b>
              <span>
                names <code className="cleanup-code">{row.assetId}</code>, which the store does not hold.
              </span>
            </div>
          ))}
        </Group>

        <Group
          title="Machine litter"
          count={
            data.assetStore.readable
              ? data.machineLitter.unreferenced.length + (data.machineLitter.staleAuthAttempts > 0 ? 1 : 0)
              : data.machineLitter.staleAuthAttempts + 1
          }
          empty={
            data.assetStore.readable
              ? "No unreferenced assets and no stale sign-in attempts."
              : "Unknown until the asset store can be read."
          }
        >
          {!data.assetStore.readable ? (
            <div className="cleanup-row">
              <b>Unknown</b>
              <span>Unreferenced assets could not be read while the asset store is unavailable.</span>
            </div>
          ) : null}
          {data.machineLitter.unreferenced.map((asset) => (
            <div className="cleanup-row" key={asset.assetId}>
              <b>{asset.filename || asset.assetId}</b>
              <span>
                unreferenced {asset.kind.replace("sanity.", "")} · {formatBytes(asset.bytes)}
              </span>
            </div>
          ))}
          {data.machineLitter.staleAuthAttempts > 0 ? (
            <div className="cleanup-row">
              <b>{data.machineLitter.staleAuthAttempts}</b>
              <span>sign-in attempt{data.machineLitter.staleAuthAttempts === 1 ? "" : "s"} older than 90 days.</span>
            </div>
          ) : null}
        </Group>
      </div>
    </section>
  );
}
