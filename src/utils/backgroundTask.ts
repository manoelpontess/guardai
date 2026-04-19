import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';

export const BACKGROUND_FETCH_TASK = 'guardai-background-monitor';

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    // In production: check if any camera is still streaming
    // and send a keepalive ping to the server
    console.log('[GuardAI] Background fetch running...');

    // Example: notify if a camera went offline
    // This would normally check a server endpoint
    const cameraStatus = await checkCameraStatus();

    if (cameraStatus.wentOffline) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📡 Câmera Offline',
          body: `${cameraStatus.cameraName} ficou offline`,
          data: { type: 'connection' },
        },
        trigger: null,
      });
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.error('[GuardAI] Background fetch error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Placeholder — replace with real API call
async function checkCameraStatus() {
  return { wentOffline: false, cameraName: '' };
}

export async function registerBackgroundFetch() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60, // seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('[GuardAI] Background fetch registered');
  } catch (err) {
    console.warn('[GuardAI] Background fetch registration failed:', err);
  }
}

export async function unregisterBackgroundFetch() {
  await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}
