# TokenInformationSheet

Bottom sheet modal component that displays comprehensive token information when a user taps on a token.

## Features

- Slide-up animation from bottom with smooth transitions
- Rounded top corners (26px) with border and shadow
- Drag handle indicator for visual feedback
- "Token Information" title header (24px, extrabold)
- Scrollable content area with 15px gaps between sections
- Loading skeleton states for TokenListItem
- Backdrop with tap-to-dismiss (80% opacity)
- Android back button handling

## Design Specifications (from Figma)

### Container

- Background: `#161c2d`
- Border top: `0.75px solid #404962`
- Border top radius: `26px`
- Shadow: `0px -3px 15px rgba(0,0,0,0.8)`
- Max height: `90%` of screen

### Drag Handle

- Width: `70px`
- Height: `6px`
- Color: `#b9b9b9` at `40%` opacity
- Border radius: `75px`

### Title

- Text: "Token Information"
- Font size: `24px`
- Font weight: ExtraBold
- Color: White
- Alignment: Center

### Content

- Horizontal padding: `18px`
- Gap between sections: `15px`
- Bottom padding: `30px`

## Components Included

The sheet displays the following components in order:

1. **TokenListItem** - Shows token logo, name, price, and balance (with skeleton loading state)
2. **PriceChart** - Interactive price chart with period selector
3. **TokenMarketData** - Market statistics (market cap, volume, etc.) with "Info" title
4. **TokenAbout** - Token description and about section

## Props

```typescript
interface TokenInformationSheetProps {
  visible: boolean; // Sheet visibility
  onClose: () => void; // Close callback
  token: Token; // Token data
  chartData: PriceDataPoint[]; // Chart price data
  chartPeriod: PriceChartPeriod; // Selected chart period
  onChartPeriodChange: (period: PriceChartPeriod) => void; // Chart period change handler
  coinInfo: CoinInfo | null; // Coin information (description, etc.)
  marketData: MarketData | undefined; // Market statistics
  loading?: boolean; // Loading state
  style?: ViewStyle; // Optional custom styles
}
```

## Usage Example

```tsx
import { TokenInformationSheet } from '../components';

function MyComponent() {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [chartData, setChartData] = useState<PriceDataPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<PriceChartPeriod>('1D');

  const handleTokenPress = (token: Token) => {
    setSelectedToken(token);
    setSheetVisible(true);
    // Fetch chart data and coin info...
  };

  return (
    <>
      {/* Your token list */}
      <TokenList tokens={tokens} onTokenPress={handleTokenPress} />

      {/* Token information sheet */}
      {selectedToken && (
        <TokenInformationSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          token={selectedToken}
          chartData={chartData}
          chartPeriod={chartPeriod}
          onChartPeriodChange={setChartPeriod}
          coinInfo={coinInfo}
          marketData={marketData}
          loading={isLoading}
        />
      )}
    </>
  );
}
```

## Animation Details

- **Open**: Slides up from bottom over 300ms with cubic easing
- **Close**: Slides down to bottom over 300ms with cubic easing
- **Backdrop**: Fades in/out synchronized with sheet animation

## Accessibility

- Responds to Android hardware back button
- Backdrop dismisses sheet on tap
- All child components have their own accessibility features

## Notes

- The component does NOT include ActionButtonRow (Send, Receive, Swap) - user decides separately
- All child components (PriceChart, TokenMarketData, TokenAbout) have their own loading skeletons
- TokenListItem has a custom skeleton implementation for loading state
- Uses Modal component for proper z-index stacking
- Supports responsive scaling via `ms()`, `vs()`, and `s()` utilities
