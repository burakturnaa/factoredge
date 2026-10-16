export function telemetryTopic(deviceId: string): string {
  return `factoryedge/${deviceId}/telemetry`;
}

export function statusTopic(deviceId: string): string {
  return `factoryedge/${deviceId}/status`;
}
