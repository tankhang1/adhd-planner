// Dayflow only plays focus sounds while the timer screen is open, so it never needs
// expo-audio's background media-playback foreground service. Removing the service and
// its permissions keeps Play's "foreground service" declaration and Data safety honest.
const { withAndroidManifest } = require('expo/config-plugins');

const REMOVE_PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.WRITE_CALENDAR',
];
const REMOVE_SERVICES = ['expo.modules.audio.service.AudioControlsService'];

module.exports = function withoutUnusedAndroidServices(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools';

    manifest['uses-permission'] = (manifest['uses-permission'] ?? []).filter(
      (p) => !REMOVE_PERMISSIONS.includes(p.$['android:name']),
    );
    for (const name of REMOVE_PERMISSIONS) {
      manifest['uses-permission'].push({ $: { 'android:name': name, 'tools:node': 'remove' } });
    }

    const app = manifest.application?.[0];
    if (app) {
      app.service = (app.service ?? []).filter((s) => !REMOVE_SERVICES.includes(s.$['android:name']));
      for (const name of REMOVE_SERVICES) {
        app.service.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
      }
    }
    return cfg;
  });
};
