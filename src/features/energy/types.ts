export type EnergySource = "DEMO" | "MEASURED" | "ESTIMATED";
export type EnergyQuality =
  | "DEMO"
  | "MEASURED"
  | "ESTIMATED"
  | "STALE"
  | "NO_DATA";
export type EnergyUnit = "kW" | "kWh";

export interface EnergyMeasurementDto {
  readonly fid: number;
  readonly meterPoint: string;
  readonly observedAt: string;
  readonly ingestedAt: string;
  readonly source: EnergySource;
  readonly quality: EnergyQuality;
  readonly unit: EnergyUnit;
  readonly value: number | null;
  readonly calculationVersion: string;
}

export interface EnergySeriesDto {
  readonly fid: number;
  readonly meterPoint: string;
  readonly unit: EnergyUnit;
  readonly points: readonly EnergyMeasurementDto[];
  readonly latestObservedAt: string | null;
  readonly quality: EnergyQuality;
}

export interface EnergyCorrectionDto {
  readonly id: string;
  readonly measurementId: string;
  readonly observedAt: string;
  readonly previousValue: number | null;
  readonly previousSource: EnergySource;
  readonly previousQuality: EnergyQuality;
  readonly previousCalculationVersion: string;
  readonly correctedAt: string;
  readonly reason: string | null;
}
