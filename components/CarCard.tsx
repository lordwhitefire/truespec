import { formatNaira } from '@/lib/money';
import { sectionLabel, type Section } from '@/lib/sections';
import { isSpecial, type PublicCar } from '@/lib/serialize';
import { Photo } from '@/components/Photo';

// The card variant is the section itself — no second section type (R-SEC-1).
export type CardVariant = Section;

export function CarCard({ car, variant }: { car: PublicCar; variant: CardVariant }) {
  const name = [car.brand, car.model].filter(Boolean).join(' ');
  const special = isSpecial(car);

  return (
    <a className="card" href={`/car/${car.ref}`}>
      <div className="photo">
        <Photo
          src={car.photos[0]}
          alt={`${name} ${car.trim ?? ''}`.trim()}
          loading="lazy"
          sized={{ width: 640, height: 480 }}
        />
        {special ? <span className="ribbon">Special</span> : null}
        {variant === 'on order' ? <span className="label">{sectionLabel('on order')}</span> : null}
        {variant === 'landed' ? (
          <span className="label landed">{sectionLabel('landed')}</span>
        ) : null}
      </div>
      <div className="body">
        <div className="title">{name}</div>
        <div className="meta">{[car.trim, car.year].filter(Boolean).join(' · ')}</div>
        {variant === 'on order' ? (
          car.arrivalNote ? (
            <span className="chip">{car.arrivalNote}</span>
          ) : null
        ) : car.mileageKm !== null ? (
          <div className="meta">{car.mileageKm.toLocaleString('en-NG')} mi</div>
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
