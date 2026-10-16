import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, LineStatus, type LineSimConfig } from "./types.js";
import { createInitialState, forceStatus, tick, toSignals } from "./line-state-machine.js";

/** Testlerde gürültü/olasılık belirsizliğini ortadan kaldırmak için rng'yi sabitleyen yardımcı. */
function withRng(rng: () => number, overrides: Partial<LineSimConfig> = {}): LineSimConfig {
  return { ...DEFAULT_CONFIG, rng, ...overrides };
}

const zeroRng = () => 0; // randomBetween(min,max) -> min; olasılık testlerinde "her zaman tetikle"
const oneRng = () => 0.999999; // randomBetween(min,max) -> ~max; olasılık testlerinde "asla tetikleme"
// midRng: randomBetween(-amp,amp) -> 0, yani gürültüyü sıfırlar; ve 0.5, olasılık eşiklerinin (ör. faultProbabilityPerSec*dtSec)
// hep üstünde kalacağından "asla tetikleme" için de güvenlidir. Trend/sınır testlerinde gürültünün üst üste birikip
// denge noktasını kaydırmasını (target + noise/rate) önlemek için oneRng yerine bunu kullanıyoruz.
const midRng = () => 0.5;

describe("createInitialState", () => {
  it("varsayılan olarak STOPPED durumunda ve ortam sıcaklığında başlar", () => {
    const state = createInitialState({}, DEFAULT_CONFIG);
    expect(state.status).toBe(LineStatus.STOPPED);
    expect(state.motorTempC).toBe(DEFAULT_CONFIG.ambientTempC);
    expect(state.motorCurrentA).toBe(0);
    expect(state.productionCount).toBe(0);
    expect(state.scrapCount).toBe(0);
    expect(state.timeInStateMs).toBe(0);
  });

  it("overrides ile başlangıç değerlerini kabul eder", () => {
    const state = createInitialState({ status: LineStatus.RUNNING, productionCount: 100 }, DEFAULT_CONFIG);
    expect(state.status).toBe(LineStatus.RUNNING);
    expect(state.productionCount).toBe(100);
  });
});

describe("tick — RUNNING davranışı", () => {
  it("üretim adedi zamanla artar, sıcaklık hedefe yaklaşır, akım yüke göre pozitif olur", () => {
    const config = withRng(midRng); // gürültü sıfır, fault'a asla geçmez ki trend izole test edilsin
    let state = createInitialState({ status: LineStatus.RUNNING }, config);

    for (let i = 0; i < 120; i++) {
      state = tick(state, 1000, config);
    }

    expect(state.productionCount).toBeGreaterThan(0);
    expect(state.motorTempC).toBeGreaterThan(config.ambientTempC);
    expect(state.motorTempC).toBeLessThanOrEqual(config.targetRunTempC + 0.01);
    expect(state.motorCurrentA).toBeGreaterThan(0);
  });

  it("üretim durduğunda bant çalışırken fire adedi üretimin küçük bir oranı kadar artar", () => {
    const config = withRng(oneRng, { scrapRatio: [0.1, 0.1], productionRatePerSec: 10 });
    let state = createInitialState({ status: LineStatus.RUNNING }, config);

    for (let i = 0; i < 10; i++) {
      state = tick(state, 1000, config);
    }

    expect(state.productionCount).toBeGreaterThan(0);
    expect(state.scrapCount).toBeGreaterThan(0);
    expect(state.scrapCount).toBeLessThan(state.productionCount);
  });

  it("asla negatif akım üretmez (gürültü taban değerin altına düşürmeye çalışsa da)", () => {
    const config = withRng(zeroRng, { baseLoadCurrentA: 0.1, currentNoiseA: 5 });
    let state = createInitialState({ status: LineStatus.RUNNING }, config);
    state = tick(state, 1000, config);
    expect(state.motorCurrentA).toBeGreaterThanOrEqual(0);
  });

  it("faultProbabilityPerSec tetiklendiğinde RUNNING -> FAULT'a geçer ve zamanlayıcı sıfırlanır", () => {
    const config = withRng(zeroRng); // rng()=0 her zaman olasılık eşiğinin altında kalır -> tetiklenir
    let state = createInitialState({ status: LineStatus.RUNNING }, config);
    state = tick(state, 1000, config);
    expect(state.status).toBe(LineStatus.FAULT);
    expect(state.timeInStateMs).toBe(0);
    expect(state.stateThresholdMs).toBeGreaterThanOrEqual(config.faultDurationMs[0]);
    expect(state.stateThresholdMs).toBeLessThanOrEqual(config.faultDurationMs[1]);
  });
});

describe("tick — STOPPED davranışı", () => {
  it("üretim adedi sabit kalır, sıcaklık yavaşça ortam sıcaklığına soğur, akım sıfıra yaklaşır", () => {
    const config = withRng(oneRng, { stoppedToRunningDelayMs: [1_000_000, 1_000_000] });
    let state = createInitialState(
      { status: LineStatus.STOPPED, motorTempC: 80, motorCurrentA: 5, productionCount: 42 },
      config,
    );

    state = tick(state, 1000, config);

    expect(state.productionCount).toBe(42);
    expect(state.motorTempC).toBeLessThan(80);
    expect(state.motorTempC).toBeGreaterThan(config.ambientTempC);
    expect(state.motorCurrentA).toBeLessThan(5);
  });

  it("eşik süresi dolunca STOPPED -> RUNNING'e otomatik geçer", () => {
    const config = withRng(oneRng, { stoppedToRunningDelayMs: [1000, 1000] });
    let state = createInitialState({ status: LineStatus.STOPPED }, config);

    state = tick(state, 500, config);
    expect(state.status).toBe(LineStatus.STOPPED);

    state = tick(state, 600, config);
    expect(state.status).toBe(LineStatus.RUNNING);
    expect(state.timeInStateMs).toBe(0);
  });
});

describe("tick — FAULT davranışı", () => {
  it("sıcaklık arıza hedefine hızla yükselir", () => {
    const config = withRng(oneRng, { faultDurationMs: [1_000_000, 1_000_000] });
    let state = createInitialState({ status: LineStatus.FAULT, motorTempC: 60 }, config);

    state = tick(state, 1000, config);

    expect(state.motorTempC).toBeGreaterThan(60);
  });

  it("eşik süresi dolunca FAULT -> STOPPED'e otomatik geçer", () => {
    const config = withRng(oneRng, { faultDurationMs: [1000, 1000] });
    let state = createInitialState({ status: LineStatus.FAULT }, config);

    state = tick(state, 1200, config);

    expect(state.status).toBe(LineStatus.STOPPED);
    expect(state.timeInStateMs).toBe(0);
  });
});

describe("forceStatus", () => {
  it("durumu değiştirir ve timeInStateMs'i sıfırlar", () => {
    const config = DEFAULT_CONFIG;
    let state = createInitialState({ status: LineStatus.STOPPED }, config);
    state = tick(state, 5000, config);
    expect(state.timeInStateMs).toBe(5000);

    state = forceStatus(state, LineStatus.RUNNING, config);
    expect(state.status).toBe(LineStatus.RUNNING);
    expect(state.timeInStateMs).toBe(0);
  });

  it("aynı duruma zorlanırsa state referansı değişmez (no-op)", () => {
    const state = createInitialState({ status: LineStatus.STOPPED }, DEFAULT_CONFIG);
    const result = forceStatus(state, LineStatus.STOPPED, DEFAULT_CONFIG);
    expect(result).toBe(state);
  });
});

describe("toSignals", () => {
  it("sadece case'in istediği 5 alanı döner, iç muhasebe alanlarını (timeInStateMs, fraction'lar) dışarıda bırakır", () => {
    const state = createInitialState({ status: LineStatus.RUNNING, productionCount: 10 }, DEFAULT_CONFIG);
    const signals = toSignals(state);
    expect(signals).toEqual({
      productionCount: 10,
      motorTempC: DEFAULT_CONFIG.ambientTempC,
      motorCurrentA: 0,
      scrapCount: 0,
      status: LineStatus.RUNNING,
    });
    expect(signals).not.toHaveProperty("timeInStateMs");
    expect(signals).not.toHaveProperty("productionFraction");
  });
});
