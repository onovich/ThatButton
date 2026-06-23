export function getStorageAdapter(browserWindow) {
  try {
    return browserWindow.localStorage || null;
  } catch (error) {
    return null;
  }
}
