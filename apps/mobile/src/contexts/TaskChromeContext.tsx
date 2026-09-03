/**
 * The task-chrome context lives in `@salmon/shared` (one implementation for
 * both platforms); this module keeps the app's import path.
 */
export {
  TaskChromeProvider,
  useTaskChrome,
  useTaskChromeClaim,
  type TaskChromeContextValue,
} from '@salmon/shared';
