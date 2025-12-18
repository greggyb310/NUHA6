import { ParsedIntent, ProximityBias } from "@/types/intent";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const DURATION_PATTERNS: Array<{ re: RegExp; toMinutes: (m: RegExpMatchArray) => number }> = [
  { re: /\b(\d+)\s*(hour|hours|hr|hrs)\b/i, toMinutes: (m) => parseInt(m[1], 10) * 60 },
  { re: /\b(\d+)\s*(minute|minutes|min|mins)\b/i, toMinutes: (m) => parseInt(m[1], 10) },
  { re: /\b(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)\b/i, toMinutes: (m) => Math.round(parseFloat(m[1]) * 60) },
];

const PROXIMITY_PATTERNS: Array<{ re: RegExp; bias: ProximityBias }> = [
  { re: /\bnear here\b/i, bias: "near_here" },
  { re: /\bnearby\b/i, bias: "nearby" },
  { re: /\bclose by\b/i, bias: "nearby" },
];

const WITHIN_DISTANCE_RE = /\bwithin\s*(\d+(?:\.\d+)?)\s*(km|kilometers|kilometres|mi|miles)\b/i;

const ACTIVITY_KEYWORDS: Record<string, string[]> = {
  Hiking: ["hike", "hiking", "trail", "trek"],
  Walking: ["walk", "walking", "stroll"],
  Meditation: ["meditate", "meditation", "breathing", "mindfulness"],
  Biking: ["bike", "biking", "cycle", "cycling"],
  Running: ["run", "running", "jog"],
};

const DIFFICULTY_KEYWORDS: Record<string, string[]> = {
  easy: ["easy", "gentle", "simple", "relaxing", "calm"],
  medium: ["moderate", "medium", "regular"],
  hard: ["challenging", "hard", "difficult", "intense", "strenuous"],
};

const THERAPEUTIC_GOAL_KEYWORDS: Record<string, string[]> = {
  "reduce stress": ["stress", "stressed", "tense", "tension"],
  "improve mood": ["anxious", "anxiety", "sad", "mood", "depression"],
  "boost energy": ["tired", "fatigue", "energy", "energize"],
  "improve sleep": ["sleep", "insomnia", "rest"],
  "increase focus": ["focus", "concentration", "distracted"],
  "relax": ["relax", "relaxation", "unwind", "decompress"],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseIntent(rawText: string): ParsedIntent {
  const text = rawText.trim();
  const matches: Record<string, string> = {};
  let confidence = 0;

  let durationMinutes: number | undefined;
  for (const p of DURATION_PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      durationMinutes = p.toMinutes(m);
      matches.duration = m[0];
      confidence += 0.5;
      break;
    }
  }

  let proximityBias: ProximityBias = "none";
  let proximityDistanceKm: number | undefined;

  const within = text.match(WITHIN_DISTANCE_RE);
  if (within) {
    const value = parseFloat(within[1]);
    const unit = within[2].toLowerCase();
    proximityDistanceKm = unit.startsWith("mi") ? value * 1.60934 : value;
    proximityBias = "within_distance";
    matches.proximity = within[0];
    confidence += 0.25;
  } else {
    for (const p of PROXIMITY_PATTERNS) {
      if (p.re.test(text)) {
        proximityBias = p.bias;
        matches.proximity = text.match(p.re)?.[0] ?? "nearby";
        confidence += 0.25;
        break;
      }
    }
  }

  const activities: string[] = [];
  for (const [activity, words] of Object.entries(ACTIVITY_KEYWORDS)) {
    if (words.some((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(text))) {
      activities.push(activity);
    }
  }
  if (activities.length) {
    matches.activities = activities.join(", ");
    confidence += 0.2;
  }

  let difficulty: "easy" | "medium" | "hard" | undefined;
  for (const [level, words] of Object.entries(DIFFICULTY_KEYWORDS)) {
    if (words.some((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(text))) {
      difficulty = level as "easy" | "medium" | "hard";
      matches.difficulty = level;
      confidence += 0.1;
      break;
    }
  }

  const therapeuticGoals: string[] = [];
  for (const [goal, words] of Object.entries(THERAPEUTIC_GOAL_KEYWORDS)) {
    if (words.some((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, "i").test(text))) {
      therapeuticGoals.push(goal);
    }
  }
  if (therapeuticGoals.length) {
    matches.therapeuticGoals = therapeuticGoals.join(", ");
    confidence += 0.15;
  }

  confidence = clamp01(confidence);

  return {
    rawText: text,
    durationMinutes,
    proximityBias,
    proximityDistanceKm,
    activities: activities.length ? activities : undefined,
    difficulty,
    therapeuticGoals: therapeuticGoals.length ? therapeuticGoals : undefined,
    confidence,
    matches,
  };
}
