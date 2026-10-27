function hash(x: number, y: number, z: number) {
  let n =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(z, 2147483647);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function smooth(v: number) {
  return v * v * (3 - 2 * v);
}
function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function noise(x: number, y: number, z: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z),
    u = smooth(x - ix),
    v = smooth(y - iy),
    w = smooth(z - iz);
  return mix(
    mix(
      mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), u),
      mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), u),
      v,
    ),
    mix(
      mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), u),
      mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), u),
      v,
    ),
    w,
  );
}
function fbm(x: number, y: number, z: number, octaves = 4) {
  let sum = 0,
    amplitude = 0.55,
    normalizer = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x, y, z) * amplitude;
    normalizer += amplitude;
    x = x * 2.03 + 13.4;
    y = y * 2.03 - 7.1;
    z = z * 2.03 + 3.8;
    amplitude *= 0.5;
  }
  return sum / normalizer;
}
/** Seamless, spherical terrain/cloud/detail channels; generated once, sampled on the GPU. */
export function createTerrainData(width = 768, height = 384) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const lat = (y / (height - 1) - 0.5) * Math.PI;
    const cos = Math.cos(lat),
      ny = Math.sin(lat);
    for (let x = 0; x < width; x++) {
      const lon = (x / (width - 1)) * Math.PI * 2,
        nx = Math.cos(lon) * cos,
        nz = Math.sin(lon) * cos,
        i = (y * width + x) * 4;
      data[i] = Math.round(fbm(nx * 2.1 + 5, ny * 2.1, nz * 2.1) * 255);
      data[i + 1] = Math.round(fbm(nx * 4 - 12, ny * 4 + 7, nz * 4, 3) * 255);
      data[i + 2] = Math.round(fbm(nx * 34, ny * 34, nz * 34, 2) * 255);
      data[i + 3] = 255;
    }
  }
  return data;
}
