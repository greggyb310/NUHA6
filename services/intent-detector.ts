export function detectExcursionIntent(message: string): boolean {
  const messageLower = message.toLowerCase();
  const excursionKeywords = [
    'hike',
    'walk',
    'excursion',
    'trail',
    'nature spot',
    'outdoor',
    'explore',
    'get outside',
    'go outside',
    'nature walk',
    'nature experience',
  ];

  return excursionKeywords.some((keyword) => messageLower.includes(keyword));
}

export function detectDurationIntent(message: string): number | null {
  const messageLower = message.toLowerCase();

  const hourPatterns = [
    /(\d+)\s*hour/i,
    /(\d+)\s*hr/i,
  ];

  const minutePatterns = [
    /(\d+)\s*minute/i,
    /(\d+)\s*min/i,
  ];

  for (const pattern of hourPatterns) {
    const match = message.match(pattern);
    if (match) {
      const hours = parseInt(match[1], 10);
      return hours * 60;
    }
  }

  for (const pattern of minutePatterns) {
    const match = message.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  if (messageLower.includes('quick')) return 15;
  if (messageLower.includes('short')) return 20;
  if (messageLower.includes('long')) return 90;

  return null;
}

export function detectLocationIntent(message: string): {
  wantsSuggestions: boolean;
  specificLocation: string | null;
} {
  const messageLower = message.toLowerCase();

  const suggestionPhrases = [
    'surprise me',
    'you choose',
    'give me options',
    'show me options',
    'suggest',
    'recommend',
    'anywhere',
    "don't care",
    'whatever',
  ];

  const wantsSuggestions = suggestionPhrases.some((phrase) =>
    messageLower.includes(phrase)
  );

  if (wantsSuggestions) {
    return { wantsSuggestions: true, specificLocation: null };
  }

  const specificIndicators = [
    'i know a place',
    'specific place',
    'trail called',
    'park called',
    'at ',
    'near ',
  ];

  const hasSpecificLocation = specificIndicators.some((indicator) =>
    messageLower.includes(indicator)
  );

  if (hasSpecificLocation) {
    return { wantsSuggestions: false, specificLocation: message };
  }

  return { wantsSuggestions: false, specificLocation: null };
}

export function detectConfirmationIntent(message: string): boolean {
  const messageLower = message.toLowerCase().trim();

  const affirmativeResponses = [
    'yes',
    'yeah',
    'sure',
    'ok',
    'okay',
    'please',
    'go ahead',
    'show me',
    'let me see',
    'sounds good',
    'perfect',
    'great',
    'yep',
    'yup',
    'absolutely',
    'definitely',
    'of course',
  ];

  return affirmativeResponses.some(
    (response) => messageLower === response || messageLower.startsWith(response + ' ')
  );
}
