/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Classic implementation of a binary search with a small tweak since we are
 * using this for our bucketing algorithms.
 *
 * Rather than return `-1` if the exact value is not found, we return whichever
 * value our final `mid` is closest too. This ensures that we put our target
 * into the correct bucket.
 *
 * @param arr The array of numbers to search.
 * @param target The number that we are looking for.
 * @returns The index of the bucket our target should be placed in.
 */
export function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;
  let mid = -1;

  while (left <= right) {
    mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) {
      return mid;
    }

    if (target < arr[mid]) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  // Since we didn't find the exact match, we return whichever
  // value our `mid` is closer to. This makes sure that we put
  // the value into the correct bucket.
  if (mid - left > right - mid) {
    return mid - 1;
  } else {
    return mid;
  }
}
