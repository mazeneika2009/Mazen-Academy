export function parseDurationToSeconds(duration) {
  if (!duration || typeof duration !== 'string') return 0;
  const parts = duration.split(':').map(Number);
  if (parts.some(isNaN)) return 1800;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function getSeedDifficulty(seed) {
  const durationSecs = parseDurationToSeconds(seed.duration);
  const titleLower = ((seed.titleEn || '') + ' ' + (seed.titleAr || '') + ' ' + (seed.titleTr || '')).toLowerCase();
  const tagsJoined = (seed.tags || []).map(t => t.toLowerCase()).join(' ');

  if (
    tagsJoined.includes('system design') || tagsJoined.includes('architect') ||
    tagsJoined.includes('cloud') || tagsJoined.includes('concurrency') ||
    tagsJoined.includes('advanced') || titleLower.includes('advanced') ||
    titleLower.includes('متقدم') || titleLower.includes('ileri') ||
    durationSecs >= 2400
  ) return 'Advanced';

  if (
    tagsJoined.includes('vite') || tagsJoined.includes('setup') ||
    tagsJoined.includes('introduction') || titleLower.includes('introduction') ||
    titleLower.includes('setup') || titleLower.includes('مقدمة') ||
    titleLower.includes('giriş') || durationSecs <= 1000
  ) return 'Beginner';

  return 'Intermediate';
}

export function getDifficultyStyle(difficulty) {
  switch (difficulty) {
    case 'Beginner': return 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20';
    case 'Intermediate': return 'bg-amber-950/40 text-amber-400 border border-amber-500/20';
    case 'Advanced': return 'bg-red-950/40 text-red-400 border border-red-500/20';
    default: return 'bg-gray-950/40 text-gray-400 border border-gray-500/20';
  }
}

export function getDifficultyTextColor(difficulty) {
  switch (difficulty) {
    case 'Beginner': return 'bg-emerald-950/30 text-emerald-400';
    case 'Intermediate': return 'bg-amber-950/30 text-amber-400';
    case 'Advanced': return 'bg-red-950/30 text-red-400';
    default: return 'bg-gray-950/30 text-gray-400';
  }
}
