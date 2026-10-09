import type { PublicCar } from "@/lib/serialize";

export function waLink(number: string, text: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function carWaLink(number: string, car: PublicCar): string {
  const name = [car.year, car.brand, car.model, car.trim].filter(Boolean).join(" ");
  return waLink(number, `Hello TrueSpec, I'm interested in the ${name} (${car.ref}).`);
}
