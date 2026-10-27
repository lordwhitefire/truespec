import { formatNaira } from '@/lib/money';
import type { PublicCar } from '@/lib/serialize';
import { Photo } from '@/components/Photo';
import { carHref, carState, carTitle, mileageLabel } from './car-view';

// The reference inventory card (card(c, dk) in truespec.html).
export function ReferenceCard({
  car,
  dark = false,
  sized = { width: 700, height: 326 },
}: {
  car: PublicCar;
  dark?: boolean;
  sized?: { width: number; height: number };
}) {
  const st = carState(car);
  const onOrder = car.section === 'on order';
  const photo = car.photos[0];
  return (
    <a className="card" href={carHref(car)}>
      <div className="ph">
        <Photo src={photo} alt={carTitle(car)} loading="lazy" sized={sized} />
        {st ? (
          <div className="rb">
            <span className={st.rb || undefined}>{st.t}</span>
          </div>
        ) : null}
      </div>
      <div className="bars">
        {car.photos.map((_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="tt">
        <h3>
          {dark ? (
            <>
              <b>{car.brand}</b> {car.model} {car.year}
            </>
          ) : (
            <>
              {car.brand} {car.model} {car.year}
            </>
          )}
        </h3>
        <div className="pt">
          {car.wasPriceKobo !== null ? <s>{formatNaira(car.wasPriceKobo)}</s> : null}
          {formatNaira(car.priceKobo)}
        </div>
      </div>
      <div className="sr">
        {st ? (
          <span className={`chip ${st.chip}`}>
            <i className="dot" style={{ background: st.dot }} />
            {st.t}
          </span>
        ) : null}
        {onOrder ? (
          <>
            <span className="chip oo">
              <i className="fa-solid fa-ship" />
              {car.arrivalNote || 'Arriving soon'}
            </span>
            {car.exteriorColor ? (
              <span>
                <i className="fa-solid fa-palette" />
                {car.exteriorColor}
              </span>
            ) : null}
          </>
        ) : (
          <>
            {car.mileageKm !== null ? (
              <span>
                <i className="fa-solid fa-road" />
                {mileageLabel(car)}
              </span>
            ) : null}
            {car.exteriorColor ? (
              <span>
                <i className="fa-solid fa-palette" />
                {car.exteriorColor}
              </span>
            ) : null}
          </>
        )}
      </div>
    </a>
  );
}
