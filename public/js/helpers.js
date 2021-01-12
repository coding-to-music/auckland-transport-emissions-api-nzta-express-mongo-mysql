export async function getFrom(url) {
  const response = await fetch(url, {
    method: 'GET', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json',
      "Ocp-Apim-Subscription-Key": "b9f2e4f0b5e140b79a698c0bb9298a7f"
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    //body: JSON.stringify(data) // body data type must match "Content-Type" header
  });
  return response.json();
}

/**
 * Format date string as "YYYYMMDD"
 * @param {Date} date 
 */
export function fixDate(date) {
  let monthString = date.getMonth() < 9 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
  let dayString = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
  return date.getFullYear() + "" + monthString + "" + dayString;
}