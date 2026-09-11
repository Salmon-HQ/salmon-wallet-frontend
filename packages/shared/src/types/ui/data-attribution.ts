import type { Testable } from './testable';

/**
 * DataAttribution — the credit a data provider's terms make mandatory
 * wherever its prices or token list show (CoinGecko: "Data provided by
 * CoinGecko", legible, no smaller than 10pt, linked to their site). The text
 * and the link come from the backend on the network entry; the twins draw
 * them verbatim as one small link, once per screen, and draw nothing when
 * the network owes no credit.
 */
export interface DataAttributionPropsBase<TStyle> extends Testable {
  /** The network whose provider is credited; `null`/`undefined` draws nothing. */
  networkId?: string | null;
  style?: TStyle;
}
