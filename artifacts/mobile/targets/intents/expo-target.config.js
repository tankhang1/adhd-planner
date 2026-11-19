/** Siri & Shortcuts: an App Intents extension (no UI). */
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'app-intent',
  name: 'DayflowIntents',
  displayName: 'Dayflow Shortcuts',
  deploymentTarget: '17.0',
  frameworks: ['AppIntents'],
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },
});
