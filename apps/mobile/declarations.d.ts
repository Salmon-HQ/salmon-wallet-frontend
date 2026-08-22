/**
 * Asset module type declarations for React Native/Expo
 * These allow TypeScript to recognize asset imports
 */

// Expo's global type augmentations (which is where React Native components get
// their `className` prop from). The Expo CLI writes the same reference into
// `expo-env.d.ts`, but that file is generated and gitignored, so it only exists
// on machines that have run `expo start`. Referencing the types here too keeps
// `tsc --noEmit` resolving the same way on a clean checkout as it does locally.
/// <reference types="expo/types" />

declare module '*.png' {
  const content: number;
  export default content;
}

declare module '*.svg' {
  const content: number;
  export default content;
}

declare module '*.ttf' {
  const content: number;
  export default content;
}

declare module '*.otf' {
  const content: number;
  export default content;
}

declare module '*.jpeg' {
  const content: number;
  export default content;
}

declare module '*.jpg' {
  const content: number;
  export default content;
}

declare module '*.gif' {
  const content: number;
  export default content;
}
