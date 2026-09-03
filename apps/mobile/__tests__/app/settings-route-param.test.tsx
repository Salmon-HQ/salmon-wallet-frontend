/**
 * The settings sub-screen route is `settings/[panel]`, never `settings/[screen]`.
 *
 * `screen` is the param React Navigation uses to address a nested navigator's
 * child, and expo-router deletes it while building the push action
 * (`global-state/routing.js`, `getPayloadFromStateRoute`). A `[screen]` segment
 * mounts with empty params, so every Settings row bounced back to the list.
 * This pins both halves: the trap and the working name.
 */
import React from 'react';
import { Pressable, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

jest.mock('react-native-reanimated', () => ({}));

function makeTree(segment: string) {
  const Layout = () => <Stack screenOptions={{ headerShown: false }} />;
  const Index = () => {
    const router = useRouter();
    return (
      <Pressable
        testID="go"
        onPress={() =>
          router.push({
            pathname: `/settings/[${segment}]` as never,
            params: { [segment]: 'accounts' },
          })
        }
      >
        <Text>go</Text>
      </Pressable>
    );
  };
  const Panel = () => {
    const params = useLocalSearchParams<Record<string, string>>();
    return <Text testID="out">{JSON.stringify(params)}</Text>;
  };
  return {
    'settings/_layout': Layout,
    'settings/index': Index,
    [`settings/[${segment}]`]: Panel,
  };
}

async function pushAndReadParams(segment: string) {
  renderRouter(makeTree(segment), { initialUrl: '/settings' });
  fireEvent.press(screen.getByTestId('go'));
  await waitFor(() => expect(screen.getByTestId('out')).toBeTruthy());
  return screen.getByTestId('out').props.children as string;
}

describe('settings/[panel] route param', () => {
  it('a [panel] segment receives the pushed value', async () => {
    expect(await pushAndReadParams('panel')).toContain('"panel":"accounts"');
  });

  it('a [screen] segment loses it — the reserved-key trap', async () => {
    expect(await pushAndReadParams('screen')).toBe('{}');
  });
});
