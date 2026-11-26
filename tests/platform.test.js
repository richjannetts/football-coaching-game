import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform } from '../src/lib/platform.js';

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  ipadSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

test('platform: iPhone Safari', () => assert.equal(detectPlatform(UA.iosSafari), 'ios-safari'));
test('platform: iPhone Chrome uses the Share steps', () => assert.equal(detectPlatform(UA.iosChrome), 'ios-other'));
test('platform: an iPad that says it is a Mac', () => assert.equal(detectPlatform(UA.ipadSafari, 5), 'ios-safari'));
test('platform: a Mac stays a computer', () => assert.equal(detectPlatform(UA.ipadSafari, 0), 'other'));
test('platform: Android Chrome', () => assert.equal(detectPlatform(UA.androidChrome), 'android-chrome'));
test('platform: Samsung Internet is not Chrome', () => assert.equal(detectPlatform(UA.samsung), 'android-samsung'));
test('platform: Android Firefox', () => assert.equal(detectPlatform(UA.androidFirefox), 'android-other'));
test('platform: a computer', () => assert.equal(detectPlatform(UA.desktopChrome), 'other'));
