import { formatNaira } from "@/lib/money";
import { isSpecial, type PublicCar } from "@/lib/serialize";

export type CardVariant = "available" | "on order" | "landed";

export function CarCard({ car, variant }: { car: PublicCar; variant: CardVariant }) {
  const name = [car.brand, car.model].filter(Boolean).join(" ");
  const special = isSpecial(car);

  return (
    <a className="card" href={`/car/${car.ref}`}>
      <div className="photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={car.photos[0]} alt={`${name} ${car.trim ?? ""}`.trim()} loading="lazy" />
        {special ? <span className="ribbon">Special</span> : null}
        {variant === "on order" ? <span className="label">On Order</span> : null}
        {variant === "landed" ? <span className="label landed">Landed</span> : null}
      </div>
      <div className="body">
        <div className="title">{name}</div>
        <div className="meta">
          {[car.trim, car.year].filter(Boolean).join(" · ")}
        </div>
        {variant === "on order" ? (
          car.arrivalNote ? (
            <span className="chip">{car.arrivalNote}</span>
          ) : null
        ) : car.mileageKm !== null ? (
          <div className="meta">{car.mileageKm.toLocaleString("en-NG")} mi</div>
        ) : null}
        <div className="price">
          {formatNaira(car.priceKobo)}
          {special && car.wasPriceKobo !== null ? (
            <span className="was">{formatNaira(car.wasPriceKobo)}</span>
          ) : null}
        </div>
      </div>
    </a>
  );
}
