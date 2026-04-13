/** Tunable vehicle presets — gameplay only, no assets. */
export const VEHICLES = [
  {
    id: "balanced",
    name: "Balanced",
    accel: 500,
    brake: 670,
    maxSpeed: 400,
    turnGrip: 2.28,
    drag: 0.989,
  },
  {
    id: "grip",
    name: "Grip",
    accel: 470,
    brake: 710,
    maxSpeed: 378,
    turnGrip: 2.78,
    drag: 0.99,
  },
  {
    id: "speed",
    name: "Speed",
    accel: 545,
    brake: 610,
    maxSpeed: 438,
    turnGrip: 1.98,
    drag: 0.987,
  },
];

export function getVehicle(id) {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}
