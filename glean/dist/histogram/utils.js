export function binarySearch(arr, target) {
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
        }
        else {
            left = mid + 1;
        }
    }
    if (mid - left > right - mid) {
        return mid - 1;
    }
    else {
        return mid;
    }
}
