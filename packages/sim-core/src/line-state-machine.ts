import { DEFAULT_CONFIG, LineStatus, type LineSimConfig, type LineSimState, type LineSignals } from "./types.js";

function randomBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randomNoise(rng: () => number, amplitude: number): number {
  return randomBetween(rng, -amplitude, amplitude);
}

/** Üssel yumuşatma: `value`, `target`'a `ratePerSec * dtSec` oranında yaklaşır (büyük dt'de taşmayı önlemek için orana 1 clamp'i uygulanır). */
function approach(value: number, target: number, ratePerSec: number, dtSec: number): number {
  const factor = Math.min(1, ratePerSec * dtSec);
  return value + (target - value) * factor;
}

export function createInitialState(
  overrides: Partial<LineSignals> = {},
  config: LineSimConfig = DEFAULT_CONFIG,
): LineSimState {
  const status = overrides.status ?? LineStatus.STOPPED;
  return {
    status,
    productionCount: overrides.productionCount ?? 0,
    motorTempC: overrides.motorTempC ?? config.ambientTempC,
    motorCurrentA: overrides.motorCurrentA ?? 0,
    scrapCount: overrides.scrapCount ?? 0,
    timeInStateMs: 0,
    stateThresholdMs: rollStateThreshold(status, config),
    productionFraction: 0,
    scrapFraction: 0,
  };
}

function rollStateThreshold(status: LineSimState["status"], config: LineSimConfig): number {
  if (status === LineStatus.STOPPED) {
    return randomBetween(config.rng, ...config.stoppedToRunningDelayMs);
  }
  if (status === LineStatus.FAULT) {
    return randomBetween(config.rng, ...config.faultDurationMs);
  }
  return 0;
}

/** Durumu dışarıdan zorla değiştirir (örn. opsiyonel demo kontrol endpoint'i veya testler için). timeInStateMs sıfırlanır. */
export function forceStatus(
  state: LineSimState,
  status: LineSimState["status"],
  config: LineSimConfig = DEFAULT_CONFIG,
): LineSimState {
  if (status === state.status) return state;
  return {
    ...state,
    status,
    timeInStateMs: 0,
    stateThresholdMs: rollStateThreshold(status, config),
  };
}

/**
 * Simülasyonu `dtMs` kadar ileri alır. Saf fonksiyon: aynı girdiyle her zaman aynı çıktıyı üretir
 * (rng dahil — testlerde deterministik bir rng enjekte edilebilir).
 */
export function tick(state: LineSimState, dtMs: number, config: LineSimConfig = DEFAULT_CONFIG): LineSimState {
  const dtSec = dtMs / 1000;
  const next: LineSimState = { ...state, timeInStateMs: state.timeInStateMs + dtMs };

  switch (state.status) {
    case LineStatus.RUNNING: {
      applyRunningSignals(next, dtSec, config);
      if (config.rng() < config.faultProbabilityPerSec * dtSec) {
        return forceStatus(next, LineStatus.FAULT, config);
      }
      return next;
    }
    case LineStatus.STOPPED: {
      applyStoppedSignals(next, dtSec, config);
      if (next.timeInStateMs >= next.stateThresholdMs) {
        return forceStatus(next, LineStatus.RUNNING, config);
      }
      return next;
    }
    case LineStatus.FAULT: {
      applyFaultSignals(next, dtSec, config);
      if (next.timeInStateMs >= next.stateThresholdMs) {
        return forceStatus(next, LineStatus.STOPPED, config);
      }
      return next;
    }
  }
}

function applyRunningSignals(state: LineSimState, dtSec: number, config: LineSimConfig): void {
  state.motorTempC = approach(state.motorTempC, config.targetRunTempC, config.heatRatePerSec, dtSec) +
    randomNoise(config.rng, config.tempNoiseC);
  state.motorCurrentA = Math.max(
    0,
    config.baseLoadCurrentA + randomNoise(config.rng, config.currentNoiseA),
  );

  const noiseFactor = randomBetween(config.rng, ...config.productionRateNoiseFactor);
  state.productionFraction += config.productionRatePerSec * noiseFactor * dtSec;
  const producedNow = Math.floor(state.productionFraction);
  if (producedNow > 0) {
    state.productionFraction -= producedNow;
    state.productionCount += producedNow;

    const scrapRatio = randomBetween(config.rng, ...config.scrapRatio);
    state.scrapFraction += producedNow * scrapRatio;
    const scrappedNow = Math.floor(state.scrapFraction);
    if (scrappedNow > 0) {
      state.scrapFraction -= scrappedNow;
      state.scrapCount += scrappedNow;
    }
  }
}

function applyStoppedSignals(state: LineSimState, dtSec: number, config: LineSimConfig): void {
  state.motorTempC = approach(state.motorTempC, config.ambientTempC, config.coolRatePerSec, dtSec);
  state.motorCurrentA = approach(state.motorCurrentA, 0, config.currentDecayRatePerSec, dtSec);
}

function applyFaultSignals(state: LineSimState, dtSec: number, config: LineSimConfig): void {
  state.motorTempC = approach(state.motorTempC, config.faultTempC, config.faultHeatRatePerSec, dtSec) +
    randomNoise(config.rng, config.tempNoiseC);
  state.motorCurrentA = Math.max(
    0,
    approach(state.motorCurrentA, config.baseLoadCurrentA, 0.5, dtSec) +
      randomNoise(config.rng, config.faultCurrentNoiseA),
  );
  // Üretim ve fire, arızada pratikte durur.
}

/** İç muhasebe alanlarını (timeInStateMs, fraction'lar) çıkarıp sadece case'in istediği 5 sinyali döner. */
export function toSignals(state: LineSimState): LineSignals {
  return {
    productionCount: state.productionCount,
    motorTempC: state.motorTempC,
    motorCurrentA: state.motorCurrentA,
    scrapCount: state.scrapCount,
    status: state.status,
  };
}
