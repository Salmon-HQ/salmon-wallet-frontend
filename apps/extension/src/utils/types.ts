export interface SalmonMessageData {
  id: string;
  method: string;
  params?: unknown;
  error?: string;
  result?: unknown;
  jsonrpc?: '2.0';
}

export interface SalmonEventDetail {
  detail: SalmonMessageData;
}

export interface SalmonBackgroundMessage {
  channel:
    | 'salmon_contentscript_background_channel'
    | 'salmon_extension_background_channel'
    | 'salmon_extension_stash_channel';
  data: SalmonMessageData | unknown;
}
