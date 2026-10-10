// Profanity filter — masks offensive words with the first letter + asterisks
// (e.g. "damn" → "d***"). Applied before messages are stored so the database
// stays clean and display is always safe. Word-boundary aware so "hello" is
// never touched even if "hell" is on the list.

const BAD_WORDS = new Set([
  'damn', 'goddamn', 'godamn', 'hell', 'shit', 'bullshit', 'horseshit',
  'fuck', 'fucker', 'fucking', 'motherfucker', 'clusterfuck', 'fuckface',
  'ass', 'asshole', 'jackass', 'dumbass', 'smartass', 'badass',
  'arse', 'arsehole', 'bitch', 'bastard', 'crap', 'piss', 'pissed',
  'dick', 'dickhead', 'cock', 'pussy', 'wanker', 'twat', 'cunt', 'prick',
  'slut', 'whore', 'bollocks', 'bugger', 'shithead', 'dipshit', 'shitfuck',
  'shitstorm', 'asshat', 'douche', 'douchebag', 'jerkoff', 'wank', 'twat',
]);

export function filterProfanity(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[a-z][a-z']*/gi, (word) => {
    if (BAD_WORDS.has(word.toLowerCase())) {
      return word[0] + '*'.repeat(Math.max(1, word.length - 1));
    }
    return word;
  });
}