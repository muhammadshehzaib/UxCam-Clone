export type RNEventType =
  | 'touch'
  | 'scroll'
  | 'input'
  | 'screen_view'
  | 'navigate'
  | 'custom'
  | 'crash'
  | 'network';

export interface RNEvent {
  type:        RNEventType;
  timestamp:   number;    // Unix ms
  elapsedMs:   number;    // ms since session start
  x?:          number;    // normalized 0–1 (touch events)
  y?:          number;
  screenName?: string;
  value?:      string;
  metadata?:   Record<string, unknown>;
}

export interface RNDeviceInfo {
  type:           'mobile' | 'tablet';
  os:             'ios' | 'android';
  osVersion:      string;
  model:          string;
  appVersion:     string;
  screenWidth:    number;
  screenHeight:   number;
  // browser not applicable for native
  browser:        '';
  browserVersion: '';
}

export interface RNSDKConfig {
  apiKey:          string;
  endpoint:        string;
  flushInterval?:  number;   // ms, default 5000
  maxBatchSize?:   number;   // default 50
  sampleRate?:     number;   // 0–1, default 1.0
  appVersion?:     string;
}
