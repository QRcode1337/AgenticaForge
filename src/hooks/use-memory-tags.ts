/**
 * useMemoryTags — tag system for memory entries with localStorage persistence
 *
 * Storage key: 'agentforge-memory-tags'
 * Format:      Record<memoryId, string[]>
 *
 * Provides:
 *  - getTagsForEntry(id)  → string[]
 *  - addTag(id, tag)
 *  - removeTag(id, tag)
 *  - setTags(id, tags)
 *  - allTags               → deduplicated list of every tag in use
 *  - filterByTag(tag)      → list of memory IDs matching tag
 *  - filterByTags(tags, mode) → 'and' | 'or' filtering
 *  - clearTags(id)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'agentforge-memory-tags';

export type TagMap = Record<string, string[]>;

function loadTags(): TagMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveTags(tags: TagMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // quota exceeded — noop
  }
}

export function useMemoryTags() {
  const [tagMap, setTagMap] = useState<TagMap>(loadTags);

  // Persist on change
  useEffect(() => {
    saveTags(tagMap);
  }, [tagMap]);

  /** Get tags for a specific memory entry */
  const getTagsForEntry = useCallback(
    (id: string): string[] => tagMap[id] ?? [],
    [tagMap],
  );

  /** Add a single tag to an entry (no-op if already present) */
  const addTag = useCallback((id: string, tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (!normalized) return;
    setTagMap((prev) => {
      const existing = prev[id] ?? [];
      if (existing.includes(normalized)) return prev;
      return { ...prev, [id]: [...existing, normalized] };
    });
  }, []);

  /** Remove a single tag from an entry */
  const removeTag = useCallback((id: string, tag: string) => {
    const normalized = tag.trim().toLowerCase();
    setTagMap((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const updated = existing.filter((t) => t !== normalized);
      if (updated.length === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: updated };
    });
  }, []);

  /** Replace all tags for an entry */
  const setTags = useCallback((id: string, tags: string[]) => {
    const normalized = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    setTagMap((prev) => {
      if (normalized.length === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: normalized };
    });
  }, []);

  /** Clear all tags for an entry */
  const clearTags = useCallback((id: string) => {
    setTagMap((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /** Deduplicated list of every tag currently in use */
  const allTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(tagMap).forEach((tags) => tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [tagMap]);

  /** Get all memory IDs that have a specific tag */
  const filterByTag = useCallback(
    (tag: string): string[] => {
      const normalized = tag.trim().toLowerCase();
      return Object.entries(tagMap)
        .filter(([, tags]) => tags.includes(normalized))
        .map(([id]) => id);
    },
    [tagMap],
  );

  /** Filter memory IDs by multiple tags ('and' = all tags, 'or' = any tag) */
  const filterByTags = useCallback(
    (tags: string[], mode: 'and' | 'or' = 'or'): string[] => {
      const normalized = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (normalized.length === 0) return Object.keys(tagMap);

      return Object.entries(tagMap)
        .filter(([, entryTags]) => {
          if (mode === 'and') return normalized.every((t) => entryTags.includes(t));
          return normalized.some((t) => entryTags.includes(t));
        })
        .map(([id]) => id);
    },
    [tagMap],
  );

  /** Bulk import tags (merges with existing) */
  const importTags = useCallback((incoming: TagMap) => {
    setTagMap((prev) => {
      const merged = { ...prev };
      Object.entries(incoming).forEach(([id, tags]) => {
        const existing = merged[id] ?? [];
        const combined = [...new Set([...existing, ...tags.map((t) => t.trim().toLowerCase())])];
        merged[id] = combined.filter(Boolean);
      });
      return merged;
    });
  }, []);

  /** Export current tag map (for backup/sync) */
  const exportTags = useCallback((): TagMap => ({ ...tagMap }), [tagMap]);

  return {
    tagMap,
    getTagsForEntry,
    addTag,
    removeTag,
    setTags,
    clearTags,
    allTags,
    filterByTag,
    filterByTags,
    importTags,
    exportTags,
  };
}
