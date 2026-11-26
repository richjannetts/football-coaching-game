// Works out which phone and browser the game is open in, so the install
// screen can show the right steps. Pure function, so the tests can check it.
//
// Returns one of:
//   'ios-safari'      iPhone or iPad, Safari
//   'ios-other'       iPhone or iPad, Chrome, Edge or Firefox (Share, then Add to Home Screen)
//   'android-chrome'  Android, Chrome
//   'android-samsung' Android, Samsung Internet
//   'android-other'   Android, another browser
//   'other'           a computer or anything else
export function detectPlatform(ua = '', maxTouchPoints = 0) {
  const iPadAsMac = /Macintosh/.test(ua) && maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadAsMac) {
    return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios-safari';
  }
  if (/Android/.test(ua)) {
    if (/SamsungBrowser/.test(ua)) return 'android-samsung';
    if (/Chrome\//.test(ua) && !/Edg|OPR|Firefox|YaBrowser|DuckDuckGo/.test(ua)) return 'android-chrome';
    return 'android-other';
  }
  return 'other';
}

export const isIOS = (p) => p.startsWith('ios');
export const isAndroid = (p) => p.startsWith('android');
