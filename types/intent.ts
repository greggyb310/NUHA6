export type ProximityBias = "none" | "near_here" | "nearby" | "within_distance";

export type ParsedIntent = {
  rawText: string;

  durationMinutes?: number;

  proximityBias?: ProximityBias;
  proximityDistanceKm?: number;

  activities?: string[];
  difficulty?: "easy" | "medium" | "hard";
  therapeuticGoals?: string[];

  confidence: number;
  matches: Record<string, string>;
};
