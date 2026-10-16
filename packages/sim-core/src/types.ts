export const LineStatus = {
  STOPPED: 0,
  RUNNING: 1,
  FAULT: 2,
} as const;

export type LineStatusValue = (typeof LineStatus)[keyof typeof LineStatus];

/** Protokolden bağımsız, case'in istediği 5 sinyal. Modbus/MQTT adaptörleri bunu kendi formatına serialize eder. */
export interface LineSignals {
  productionCount: number;
  motorTempC: number;
  motorCurrentA: number;
  scrapCount: number;
  status: LineStatusValue;
}

/** Simülatörün iç durumu — public sinyallerin yanı sıra sub-tick muhasebesi (kesirli üretim/fire, durum süresi) tutar. */
export interface LineSimState extends LineSignals {
  timeInStateMs: number;
  /** STOPPED→RUNNING gecikmesi veya FAULT→STOPPED onarım süresi için, duruma girişte rastgele seçilen eşik. RUNNING'de kullanılmaz. */
  stateThresholdMs: number;
  productionFraction: number;
  scrapFraction: number;
}

export interface LineSimConfig {
  ambientTempC: number;
  targetRunTempC: number;
  faultTempC: number;
  heatRatePerSec: number;
  coolRatePerSec: number;
  faultHeatRatePerSec: number;
  tempNoiseC: number;
  baseLoadCurrentA: number;
  currentNoiseA: number;
  faultCurrentNoiseA: number;
  currentDecayRatePerSec: number;
  productionRatePerSec: number;
  productionRateNoiseFactor: [min: number, max: number];
  scrapRatio: [min: number, max: number];
  stoppedToRunningDelayMs: [min: number, max: number];
  faultDurationMs: [min: number, max: number];
  faultProbabilityPerSec: number;
  /** Testlerde deterministik sonuç için enjekte edilebilir. Varsayılan: Math.random. */
  rng: () => number;
}

export const DEFAULT_CONFIG: LineSimConfig = {
  ambientTempC: 25,
  targetRunTempC: 60,
  faultTempC: 120,
  heatRatePerSec: 0.05,
  coolRatePerSec: 0.02,
  faultHeatRatePerSec: 0.15,
  tempNoiseC: 0.3,
  baseLoadCurrentA: 5,
  currentNoiseA: 0.3,
  faultCurrentNoiseA: 3,
  currentDecayRatePerSec: 0.3,
  productionRatePerSec: 0.4,
  productionRateNoiseFactor: [0.7, 1.3],
  scrapRatio: [0.01, 0.05],
  stoppedToRunningDelayMs: [20_000, 40_000],
  faultDurationMs: [10_000, 15_000],
  faultProbabilityPerSec: 0.0015,
  rng: Math.random,
};
