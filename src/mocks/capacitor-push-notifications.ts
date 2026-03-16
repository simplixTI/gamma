// Stub for @capacitor/push-notifications on web/dev environments.
// The real plugin is resolved natively by Capacitor on iOS/Android at runtime.
export const PushNotifications = {
  requestPermissions: async () => ({ receive: 'denied' as const }),
  register: async () => {},
  addListener: async (_event: string, _handler: unknown) => ({ remove: async () => {} }),
};
