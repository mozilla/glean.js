/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Classic implementation of a binary search with a small tweak for our
 * linear bucketing algorithm. Rather than return -1 if don't find our
 * target, we will return our current mid - 1. By returning our current mid - 1,
 * we have the bucket in which our value should end up in.
 *
 * @param arr The array of numbers to search.
 * @param target The number that we are looking for.
 * @returns The index of number in the array or -1 if not found.
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

  return mid;
}
