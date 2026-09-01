import React from 'react';
import { Text, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { renderRouter, screen, fireEvent, waitFor } from 'expo-router/testing-library';

jest.mock('react-native-reanimated', () => ({}));

function makeTree(seg: string) {
  const Layout = () => <Stack screenOptions={{ headerShown: false }} />;
  const Index = () => {
    const router = useRouter();
    return (
      <Pressable
        testID="go"
        onPress={() => router.push({ pathname: `/settings/[${seg}]` as any, params: { [seg]: 'accounts' } })}
      >
        <Text>go</Text>
      </Pressable>
    );
  };
  const Panel = () => {
    const p = useLocalSearchParams<Record<string, string>>();
    const path = usePathname();
    return <Text testID="out">{`path=${path} params=${JSON.stringify(p)}`}</Text>;
  };
  return {
    'settings/_layout': Layout,
    'settings/index': Index,
    [`settings/[${seg}]`]: Panel,
  };
}

describe.each(['screen', 'panel'])('dynamic segment [%s]', (seg) => {
  it('carries the param into the pushed route', async () => {
    renderRouter(makeTree(seg), { initialUrl: '/settings' });
    fireEvent.press(screen.getByTestId('go'));
    await waitFor(() => expect(screen.getByTestId('out')).toBeTruthy());
    // eslint-disable-next-line no-console
    console.log(`[repro ${seg}]`, screen.getByTestId('out').props.children);
    expect(screen.getByTestId('out').props.children).toContain(`"${seg}":"accounts"`);
  });
});
