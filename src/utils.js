/**
 * Random float in [min, max).
 *
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 */
export function rand(min , max) {
  return min + Math.random() * (max - min);
}

/**
 * Random integer in [min, max], both inclusive.
 *
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 */
export function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Coin flip: returns true with probability p.
 *
 * @param {Number} [p=0.5]
 * @returns {boolean}
 */
export function chance(p = 0.5) {
  return Math.random() < p;
}
