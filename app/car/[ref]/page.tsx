import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { carWaLink } from "@/components/whatsapp";
import { formatNaira } from "@/lib/money";
import { isSpecial } from "@/lib/serialize";
import { getPublicCar, getSetting } from "@/lib/public-cars";

export const dynamic = "force-dynamic";

export default async function CarPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const car = await getPublicCar(ref);
  if (!car) notFound();

  const number = (await getSetting("whatsapp_number")) ?? "";
  const name = [car.brand, car.model].filter(Boolean).join(" ");
  const special = isSpecial(car);
  const title = [car.year, name, car.trim].filter(Boolean).join(" ");

  return (
    <div className="wrap">
      <div className="vdp">
        <div>
          <Gallery photos={car.photos} alt={title} />
        </div>

        <div>
          <h1 style={{ fontSize: 32 }}>{name}</h1>
          <div className="meta" style={{ color: "var(--muted)", marginTop: 6 }}>
            {car.trim} · {car.year} · {car.ref}
          </div>

          <div className="big-price" style={{ marginTop: 18 }}>
            {formatNaira(car.priceKobo)}
            {special && car.wasPriceKobo !== null ? (
              <span className="was">{formatNaira(car.wasPriceKobo)}</span>
            ) : null}
          </div>

          {car.section === "on order" && car.arrivalNote ? (
            <div className="notice">{car.arrivalNote}</div>
          ) : null}

          <a
            className="btn btn-whatsapp"
            style={{ width: "100%", marginBottom: 20 }}
            href={carWaLink(number, car)}
          >
            Chat on WhatsApp
          </a>

          <ul className="specs">
            <li>
              <span className="k">Year</span>
              {car.year ?? "—"}
            </li>
            <li>
              <span className="k">Mileage</span>
              {car.mileageKm !== null ? `${car.mileageKm.toLocaleString("en-NG")} mi` : "—"}
            </li>
            <li>
              <span className="k">Exterior</span>
              {car.exteriorColor ?? "—"}
            </li>
            <li>
              <span className="k">Interior</span>
              {car.interiorColor ?? "—"}
            </li>
          </ul>

          <h3 style={{ marginTop: 8 }}>Features</h3>
          <ul className="feature-list">
            {car.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
