/**
 * Episode Detection Service
 * Parses filenames to detect TV episode patterns and find next episodes
 */

import { EpisodeInfo, MediaFile } from '../api/types';

/** Patterns for detecting episode numbers in filenames */
const EPISODE_PATTERNS: RegExp[] = [
  // S01E01, S1E1, s01e01
  /[Ss](\d{1,2})[Ee](\d{1,3})/,
  // 1x01, 01x01
  /(\d{1,2})x(\d{2,3})/,
  // Season 1 Episode 1, Season.1.Episode.1
  /[Ss]eason[\s._-]*(\d{1,2})[\s._-]*[Ee]pisode[\s._-]*(\d{1,3})/i,
  // S01.E01, S1.E1 (with dot)
  /[Ss](\d{1,2})\.?[Ee](\d{1,3})/,
];

/** Pattern for standalone episode numbers (fallback) */
const STANDALONE_EPISODE_PATTERNS: RegExp[] = [
  // Episode 1, Ep 01, Ep.01
  /[Ee]p(?:isode)?[\s._-]*(\d{1,3})/,
  // Part 1, Part 01
  /[Pp]art[\s._-]*(\d{1,3})/,
  // - 01, - 001 (common in anime)
  /[\s._-]+(\d{2,3})(?:[\s._-]|$)/,
];

/**
 * Parse episode information from a filename
 * @param filename The filename to parse
 * @returns Episode info if detected, null otherwise
 */
export function parseEpisodeInfo(filename: string): EpisodeInfo | null {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Try main patterns (with season and episode)
  for (const pattern of EPISODE_PATTERNS) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      // Extract show name (everything before the pattern)
      const matchIndex = match.index ?? 0;
      const showName = cleanShowName(nameWithoutExt.substring(0, matchIndex));

      return {
        showName,
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
        matchedPattern: match[0],
      };
    }
  }

  // Try standalone episode patterns (no season)
  for (const pattern of STANDALONE_EPISODE_PATTERNS) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      const matchIndex = match.index ?? 0;
      const showName = cleanShowName(nameWithoutExt.substring(0, matchIndex));

      return {
        showName,
        season: 1, // Assume season 1 if not specified
        episode: parseInt(match[1], 10),
        matchedPattern: match[0],
      };
    }
  }

  return null;
}

/**
 * Clean up show name by removing common separators and extra spaces
 */
function cleanShowName(name: string): string {
  return name
    .replace(/[._-]+/g, ' ') // Replace dots, underscores, hyphens with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/\(\d{4}\)/g, '') // Remove year in parentheses
    .replace(/\[\d{4}\]/g, '') // Remove year in brackets
    .trim()
    .toLowerCase();
}

/**
 * Normalize show name for comparison
 */
function normalizeShowName(name: string): string {
  return cleanShowName(name).replace(/[^a-z0-9]/g, '');
}

/**
 * Find next episodes in a list based on episode pattern
 * @param currentFile The file currently being played
 * @param allFiles All files in the same folder
 * @param count Number of next episodes to find
 * @returns Array of next episode files
 */
export function findNextEpisodes(
  currentFile: MediaFile,
  allFiles: MediaFile[],
  count: number
): MediaFile[] {
  const currentInfo = parseEpisodeInfo(currentFile.name);
  if (!currentInfo) {
    return [];
  }

  const normalizedCurrentShow = normalizeShowName(currentInfo.showName);

  // Parse all files and filter to same show
  const parsedFiles = allFiles
    .filter((f) => f.type === 'file' && f.id !== currentFile.id)
    .map((file) => ({
      file,
      info: parseEpisodeInfo(file.name),
    }))
    .filter(
      ({ info }) =>
        info !== null && normalizeShowName(info.showName) === normalizedCurrentShow
    ) as Array<{ file: MediaFile; info: EpisodeInfo }>;

  // Filter to episodes after current
  const nextEpisodes = parsedFiles.filter(({ info }) => {
    // Same season, later episode
    if (info.season === currentInfo.season && info.episode > currentInfo.episode) {
      return true;
    }
    // Later season
    if (info.season > currentInfo.season) {
      return true;
    }
    return false;
  });

  // Sort by season, then episode
  nextEpisodes.sort((a, b) => {
    if (a.info.season !== b.info.season) {
      return a.info.season - b.info.season;
    }
    return a.info.episode - b.info.episode;
  });

  // Return the first N episodes
  return nextEpisodes.slice(0, count).map(({ file }) => file);
}

/**
 * Get next files alphabetically (fallback when episode detection fails)
 * @param currentFile The file currently being played
 * @param allFiles All files in the same folder
 * @param count Number of next files to find
 * @returns Array of next files
 */
export function getNextAlphabetically(
  currentFile: MediaFile,
  allFiles: MediaFile[],
  count: number
): MediaFile[] {
  // Filter to files only (not folders)
  const files = allFiles.filter((f) => f.type === 'file');

  // Sort alphabetically by name (case-insensitive)
  const sorted = [...files].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  // Find current file index
  const currentIndex = sorted.findIndex((f) => f.id === currentFile.id);
  if (currentIndex === -1) {
    return [];
  }

  // Return next N files
  return sorted.slice(currentIndex + 1, currentIndex + 1 + count);
}

/**
 * Find files to auto-download (current + next 2)
 * First tries episode detection, falls back to alphabetical
 * @param currentFile The file being played
 * @param allFiles All files in the same folder
 * @returns Object with files to download and detection method
 */
export function findFilesToAutoDownload(
  currentFile: MediaFile,
  allFiles: MediaFile[]
): { files: MediaFile[]; method: 'episode' | 'alphabetical' } {
  // Always include current file first
  const filesToDownload: MediaFile[] = [currentFile];
  let method: 'episode' | 'alphabetical' = 'episode';

  // Try episode detection first
  const episodeFiles = findNextEpisodes(currentFile, allFiles, 2);

  if (episodeFiles.length > 0) {
    filesToDownload.push(...episodeFiles);
  } else {
    // Fall back to alphabetical
    method = 'alphabetical';
    const alphabeticalFiles = getNextAlphabetically(currentFile, allFiles, 2);
    filesToDownload.push(...alphabeticalFiles);
  }

  // If episode detection found only 1, try to fill with alphabetical
  if (episodeFiles.length === 1) {
    const additional = getNextAlphabetically(currentFile, allFiles, 1);
    // Only add if not already in list
    for (const file of additional) {
      if (!filesToDownload.some((f) => f.id === file.id)) {
        filesToDownload.push(file);
      }
    }
  }

  return { files: filesToDownload, method };
}
