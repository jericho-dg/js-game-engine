import type { CloudApiGalleryGame } from '@js-game-engine/shared';
import { buildLocalPlayUrl } from '../services/galleryService';

interface GameGalleryProps {
  games: CloudApiGalleryGame[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function GameGallery({ games, loading, error, onRefresh }: GameGalleryProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[#858585]">
          Public games
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded px-3 py-1.5 text-xs text-[#858585] transition-colors hover:bg-[#3c3c3c] hover:text-[#cccccc] disabled:opacity-40"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[#858585]">Loading gallery…</p>
      ) : error ? (
        <p className="rounded border border-[#5a1d1d] bg-[#3a1f1f] px-3 py-2 text-xs text-[#f48771]">
          {error}
        </p>
      ) : games.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#3c3c3c] bg-[#252526] px-6 py-10 text-center">
          <h3 className="text-base text-[#cccccc]">No public games yet</h3>
          <p className="mt-2 text-sm text-[#858585]">
            Publish a game from the editor and choose to list it in the gallery.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {games.map((game) => (
            <GameCard key={game.publishId} game={game} />
          ))}
        </div>
      )}
    </section>
  );
}

function GameCard({ game }: { game: CloudApiGalleryGame }) {
  const playUrl = game.playUrl || buildLocalPlayUrl(game.publishId);

  return (
    <article className="flex flex-col rounded-lg border border-[#3c3c3c] bg-[#252526]">
      <div className="flex items-center gap-3 border-b border-[#3c3c3c] px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1a1a2e] text-xs font-semibold text-[#4fc3f7]">
          {game.title.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-[#cccccc]">{game.title}</h3>
          <p className="text-xs text-[#858585]">
            {game.authorDisplayName ? `By ${game.authorDisplayName}` : 'By anonymous'}
            <span className="ml-2">· Published {formatUpdatedAt(game.updatedAt)}</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2 px-4 py-3">
        <a
          href={playUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-[#007acc] px-3 py-1.5 text-xs text-white transition-colors hover:bg-[#1a8ad4]"
        >
          Play
        </a>
      </div>
    </article>
  );
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
