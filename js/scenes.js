// scenes.js — the phrases, words and default family.
// Each phrase is split into `lead` (said first) and `last` (the payoff word).
// In "Finish It" the scene pauses after `lead` so Frankie can fill in `last`.
// `action` names an animation in stage.js. `icon` is an emoji for the picker.

export const ACTIONS = [
  { id: 'go', label: 'Car zooms off' },
  { id: 'stop', label: 'Car stops' },
  { id: 'up', label: 'Jump up' },
  { id: 'uhoh', label: 'Ball falls' },
  { id: 'beep', label: 'Horn beeps' },
  { id: 'open', label: 'Box opens' },
  { id: 'more', label: 'More cars appear' },
  { id: 'help', label: 'Helper comes' },
  { id: 'alldone', label: 'Toys put away' },
  { id: 'bye', label: 'Car drives away, wave' },
  { id: 'myturn', label: 'Ball comes to me' },
  { id: 'want', label: 'Reach for it' },
  { id: 'hi', label: 'Wave hello' },
  { id: 'me', label: "That's me! (wave)" },
  { id: 'cheer', label: 'Cheer' },
];

export const DEFAULT_PHRASES = [
  { id: 'readysetgo', lead: 'Ready, set,', last: 'go!', action: 'go', icon: '🏁', speaker: 'dad' },
  { id: 'uhoh', lead: '', last: 'Uh-oh!', action: 'uhoh', icon: '😮', speaker: 'mom' },
  { id: 'morplease', lead: 'More', last: 'please!', action: 'more', icon: '➕', speaker: 'mom' },
  { id: 'openit', lead: 'Open', last: 'it!', action: 'open', icon: '📦', speaker: 'dad' },
  { id: 'helpme', lead: 'Help', last: 'me!', action: 'help', icon: '🙋', speaker: 'mom' },
  { id: 'alldone', lead: 'All', last: 'done!', action: 'alldone', icon: '🧺', speaker: 'dad' },
  { id: 'beepbeep', lead: 'Beep', last: 'beep!', action: 'beep', icon: '📯', speaker: 'dad' },
  { id: 'letsgo', lead: "Let's", last: 'go!', action: 'go', icon: '🚗', speaker: 'mom' },
  { id: 'iwantcar', lead: 'I want', last: 'car!', action: 'want', icon: '🤲', speaker: 'dad' },
  { id: 'byebye', lead: 'Bye-bye', last: 'car!', action: 'bye', icon: '👋', speaker: 'mom' },
  { id: 'up', lead: '', last: 'Up!', action: 'up', icon: '⬆️', speaker: 'dad' },
  { id: 'myturn', lead: 'My', last: 'turn!', action: 'myturn', icon: '🙌', speaker: 'mom' },
  { id: 'stop', lead: 'Ready…', last: 'stop!', action: 'stop', icon: '🛑', speaker: 'dad' },
  { id: 'hifrankie', lead: 'Hi,', last: '{name}!', action: 'hi', icon: '😊', speaker: 'mom' },
];

export const DEFAULT_WORDS = [
  { id: 'go', text: 'go', icon: '🟢', action: 'go' },
  { id: 'stop', text: 'stop', icon: '🛑', action: 'stop' },
  { id: 'more', text: 'more', icon: '➕', action: 'more' },
  { id: 'up', text: 'up', icon: '⬆️', action: 'up' },
  { id: 'open', text: 'open', icon: '📦', action: 'open' },
  { id: 'help', text: 'help', icon: '🙋', action: 'help' },
  { id: 'alldone', text: 'all done', icon: '👋', action: 'alldone' },
  { id: 'car', text: 'car', icon: '🚗', action: 'beep' },
  { id: 'ball', text: 'ball', icon: '⚽', action: 'myturn' },
  { id: 'milk', text: 'milk', icon: '🥛', action: 'want' },
  { id: 'uhoh', text: 'uh-oh', icon: '😮', action: 'uhoh' },
  { id: 'beep', text: 'beep', icon: '📯', action: 'beep' },
  { id: 'mom', text: 'Mom', icon: '👩', action: 'me', speaker: 'mom' },
  { id: 'dad', text: 'Dad', icon: '👨', action: 'me', speaker: 'dad' },
  { id: 'yes', text: 'yes', icon: '👍', action: 'cheer' },
  { id: 'no', text: 'no', icon: '✋', action: 'stop' },
];

export const SKIN_TONES = ['#FDE0C8', '#F6CBA5', '#E6AE84', '#C98C5E', '#9C6640', '#6B4429'];
export const HAIR_COLORS = ['#2B1B12', '#5A3620', '#8B5A2B', '#C8913E', '#E8C66A', '#A23B1E', '#8A8A8A'];
export const SHIRT_COLORS = ['#4F8FE6', '#E8634F', '#4CB07A', '#F2B33D', '#9A6CE0', '#2EB5B5', '#EF7FB0', '#555D6B'];
export const CAR_COLORS = ['#E8443A', '#3A7BE8', '#F2B33D', '#43B36B', '#8E5BE0', '#1FA9A9', '#F07C2A', '#E0E0E0'];
export const HAIR_STYLES = [
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'bun', label: 'Bun' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'curly', label: 'Curly' },
  { id: 'buzz', label: 'Buzz' },
  { id: 'bald', label: 'Bald' },
];
export const BEARDS = [
  { id: 'none', label: 'None' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'full', label: 'Full' },
];

export const DEFAULT_FAMILY = {
  mom: { name: 'Mom', skin: SKIN_TONES[1], hair: 'long', hairColor: HAIR_COLORS[1], glasses: false, beard: 'none', shirt: SHIRT_COLORS[6], car: CAR_COLORS[4], child: false },
  dad: { name: 'Dad', skin: SKIN_TONES[1], hair: 'short', hairColor: HAIR_COLORS[0], glasses: false, beard: 'stubble', shirt: SHIRT_COLORS[0], car: CAR_COLORS[1], child: false },
  kid: { name: 'Frankie', skin: SKIN_TONES[1], hair: 'short', hairColor: HAIR_COLORS[2], glasses: false, beard: 'none', shirt: SHIRT_COLORS[3], car: CAR_COLORS[0], child: true },
};

export const DEFAULT_SETTINGS = {
  childName: 'Frankie',
  waitSeconds: 4,
  sessionMinutes: 0, // 0 = off
  sounds: true,
  speechRate: 0.8,
};

// Expand {name} placeholder.
export function fill(text, settings) {
  return (text || '').replace(/\{name\}/g, settings.childName || 'Frankie');
}

export function phraseText(p, settings) {
  return [fill(p.lead, settings), fill(p.last, settings)].filter(Boolean).join(' ');
}
