/** Tunable vehicle presets — gameplay only, no assets. */
export const VEHICLES = [
  {
    id: "balanced",
    name: "Balanced",
    accel: 520,
    brake: 680,
    maxSpeed: 420,
    turnGrip: 2.35,
    drag: 0.988,
  },
  {
    id: "grip",
    name: "Grip",
    accel: 480,
    brake: 720,
    maxSpeed: 390,
    turnGrip: 2.85,
    drag: 0.989,
  },
  {
    id: "speed",
    name: "Speed",
    accel: 560,
    brake: 620,
    maxSpeed: 460,
    turnGrip: 2.05,
    drag: 0.986,
  },
];

export function getVehicle(id) {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}
