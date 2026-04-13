/** Tunable vehicle presets — gameplay only, no assets. */
export const VEHICLES = [
  {
    id: "balanced",
    name: "Balanced",
    accel: 485,
    brake: 655,
    maxSpeed: 382,
    turnGrip: 2.2,
    drag: 0.991,
  },
  {
    id: "grip",
    name: "Grip",
    accel: 455,
    brake: 695,
    maxSpeed: 362,
    turnGrip: 2.68,
    drag: 0.992,
  },
  {
    id: "speed",
    name: "Speed",
    accel: 525,
    brake: 595,
    maxSpeed: 418,
    turnGrip: 1.92,
    drag: 0.989,
  },
];

export function getVehicle(id) {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}
