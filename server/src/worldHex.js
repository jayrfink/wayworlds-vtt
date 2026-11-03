// Axial hex <-> overland miles conversion (pointy-top hexes).
// `hexMiles` is the center-to-center distance between adjacent hexes.
const SQRT3_2 = Math.sqrt(3) / 2;

export function hexToMiles(q, r, hexMiles = 6) {
  return {
    x_miles: hexMiles * (q + r / 2),
    y_miles: hexMiles * SQRT3_2 * r,
  };
}

export function milesToHex(xMiles, yMiles, hexMiles = 6) {
  const fr = yMiles / (hexMiles * SQRT3_2);
  const fq = xMiles / hexMiles - fr / 2;
  // Cube rounding
  const fx = fq;
  const fz = fr;
  const fy = -fx - fz;
  let rx = Math.round(fx);
  let ry = Math.round(fy);
  let rz = Math.round(fz);
  const dx = Math.abs(rx - fx);
  const dy = Math.abs(ry - fy);
  const dz = Math.abs(rz - fz);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx + 0, r: rz + 0 };
}

export function hexDistance(a, b) {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}
