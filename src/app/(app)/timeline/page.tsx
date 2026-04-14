"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Lightbox } from "@/components/gallery/Lightbox";
import type { PhotoPublic } from "@/shared/api-types";

type Group = { label: string; photos: PhotoPublic[] };
type TimelinePreset = {
  label: string;
  year: string;
  mediaType: string;
  q: string;
};

const PRESET_STORAGE_KEY = "family-gallery-timeline-presets-v1";

function monthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function getInitialTimelineParam(name: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

export default function TimelinePage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoPublic[]>([]);
  const [selected, setSelected] = useState<PhotoPublic | null>(null);
  const [year, setYear] = useState(() => getInitialTimelineParam("year"));
  const [mediaType, setMediaType] = useState(() => getInitialTimelineParam("mediaType"));
  const [q, setQ] = useState(() => getInitialTimelineParam("q"));
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<TimelinePreset[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as TimelinePreset[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (mediaType) params.set("mediaType", mediaType);
    if (year) params.set("year", year);
    const qs = params.toString();
    router.replace(qs ? `/timeline?${qs}` : "/timeline");
  }, [q, mediaType, year, router]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("galleryType", "family");
    p.set("sort", "oldest");
    if (q.trim()) p.set("q", q.trim());
    if (mediaType) p.set("mediaType", mediaType);
    if (year) {
      p.set("dateFrom", `${year}-01-01`);
      p.set("dateTo", `${year}-12-31`);
    }
    return p.toString();
  }, [q, mediaType, year]);

  useEffect(() => {
    fetch(`/api/photos?${query}`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []))
      .catch(() => setPhotos([]));
  }, [query]);

  const groups = useMemo(() => {
    const map = new Map<string, PhotoPublic[]>();
    for (const p of photos) {
      const label = monthLabel(p.createdAt);
      const arr = map.get(label) ?? [];
      arr.push(p);
      map.set(label, arr);
    }
    return Array.from(map.entries()).map(([label, rows]) => ({ label, photos: rows })) as Group[];
  }, [photos]);

  const years = useMemo(() => {
    return [...new Set(photos.map((p) => String(new Date(p.createdAt).getFullYear())))]
      .sort((a, b) => Number(b) - Number(a));
  }, [photos]);

  const smartSuggestions = useMemo(() => {
    if (photos.length === 0) return [] as { label: string; apply: () => void }[];

    const mediaCounts = new Map<PhotoPublic["mediaType"], number>();
    const yearCounts = new Map<string, number>();
    let latestYear = "";

    for (const p of photos) {
      mediaCounts.set(p.mediaType, (mediaCounts.get(p.mediaType) ?? 0) + 1);
      const y = String(new Date(p.createdAt).getFullYear());
      yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
      if (!latestYear || Number(y) > Number(latestYear)) latestYear = y;
    }

    const topMedia = [...mediaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const topYear = [...yearCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    const suggestions: { label: string; apply: () => void }[] = [];
    if (latestYear) {
      suggestions.push({
        label: `Latest year: ${latestYear}`,
        apply: () => setYear(latestYear),
      });
    }
    if (topYear && topYear !== latestYear) {
      suggestions.push({
        label: `Most uploads in ${topYear}`,
        apply: () => setYear(topYear),
      });
    }
    if (topMedia) {
      suggestions.push({
        label: `Popular type: ${topMedia}`,
        apply: () => setMediaType(topMedia),
      });
    }
    suggestions.push({
      label: "Clear filters",
      apply: () => {
        setQ("");
        setMediaType("");
        setYear("");
      },
    });
    return suggestions.slice(0, 4);
  }, [photos]);

  const savePreset = () => {
    const label = presetName.trim();
    if (!label) return;
    const next = [{ label, year, mediaType, q }, ...presets.filter((p) => p.label !== label)].slice(0, 8);
    setPresets(next);
    setPresetName("");
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
  };

  const applyPreset = (preset: TimelinePreset) => {
    setYear(preset.year);
    setMediaType(preset.mediaType);
    setQ(preset.q);
  };

  const removePreset = (label: string) => {
    const next = presets.filter((p) => p.label !== label);
    setPresets(next);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Browse</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Family timeline</h1>
        <p className="mt-1 text-[var(--muted)]">
          View family uploads grouped by month and year.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-black/5 bg-[var(--card)] p-4 dark:border-white/10">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search caption or filename..."
          className="min-w-[220px] flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        />
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className="min-w-[140px] rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        >
          <option value="">All media</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="file">Files</option>
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="min-w-[120px] rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(window.location.href);
          }}
          className="rounded-lg border border-black/10 px-3 py-2 text-xs font-medium dark:border-white/15"
        >
          Copy link
        </button>
      </div>
      <div className="mb-6 rounded-xl border border-black/10 p-3 dark:border-white/15">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Saved presets</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name (e.g. 2026 videos)"
            className="min-w-[220px] flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          />
          <button
            type="button"
            onClick={savePreset}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
          >
            Save preset
          </button>
        </div>
        {presets.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((p) => (
              <div key={p.label} className="flex items-center gap-1 rounded-full border border-black/10 px-2 py-1 dark:border-white/15">
                <button type="button" onClick={() => applyPreset(p)} className="text-xs">
                  {p.label}
                </button>
                <button
                  type="button"
                  onClick={() => removePreset(p.label)}
                  className="px-1 text-xs text-[var(--muted)]"
                  aria-label={`Delete ${p.label}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {smartSuggestions.length > 0 ? (
        <div className="mb-6 rounded-xl border border-black/10 p-3 dark:border-white/15">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Smart suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {smartSuggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={s.apply}
                className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1 text-xs"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {years.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setYear("")}
            className={`rounded-full border px-3 py-1 text-xs ${
              year === ""
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-black/10 dark:border-white/15"
            }`}
          >
            All years
          </button>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`rounded-full border px-3 py-1 text-xs ${
                year === y
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-black/10 dark:border-white/15"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No media found for this timeline filter.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-3 text-lg font-semibold">{g.label}</h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {g.photos.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className="group relative aspect-square w-full overflow-hidden rounded-xl border border-black/5 bg-black/5 dark:border-white/10"
                    >
                      {p.mediaType === "video" ? (
                        <video src={p.publicPath} className="h-full w-full object-cover" muted playsInline />
                      ) : p.mediaType === "file" ? (
                        <div className="flex h-full items-center justify-center text-3xl">📄</div>
                      ) : (
                        <Image
                          src={p.publicPath}
                          alt=""
                          fill
                          className="object-cover transition group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 25vw"
                          unoptimized={p.publicPath.startsWith("/uploads") || p.publicPath.startsWith("data:")}
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Lightbox photo={selected} photos={photos} onNavigate={setSelected} onClose={() => setSelected(null)} />
    </div>
  );
}
