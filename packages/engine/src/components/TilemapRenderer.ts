import { Component } from '../core/Component';

export class TilemapRenderer extends Component {
  /** Hydrated from tilesetAssetId at runtime. */
  image: CanvasImageSource | null = null;
  tilesetAssetId: string | null = null;
  tileWidth = 32;
  tileHeight = 32;
  mapWidth = 16;
  mapHeight = 9;
  /** Flat tile indices; -1 = empty. */
  tiles: number[] = [];
  sortingOrder = -10;

  ensureTileBuffer(): void {
    const size = this.mapWidth * this.mapHeight;
    if (this.tiles.length < size) {
      this.tiles.push(...Array(size - this.tiles.length).fill(-1));
    } else if (this.tiles.length > size) {
      this.tiles.length = size;
    }
  }

  getTile(column: number, row: number): number {
    if (column < 0 || row < 0 || column >= this.mapWidth || row >= this.mapHeight) {
      return -1;
    }
    return this.tiles[row * this.mapWidth + column] ?? -1;
  }

  setTile(column: number, row: number, tileIndex: number): void {
    if (column < 0 || row < 0 || column >= this.mapWidth || row >= this.mapHeight) {
      return;
    }
    this.ensureTileBuffer();
    this.tiles[row * this.mapWidth + column] = tileIndex;
  }

  getTilesetColumns(): number {
    if (!this.image) return 1;
    const width = 'width' in this.image ? Number(this.image.width) : this.tileWidth;
    return Math.max(1, Math.floor(width / this.tileWidth));
  }

  localToCell(localX: number, localY: number): { column: number; row: number } | null {
    const column = Math.floor(localX / this.tileWidth);
    const row = Math.floor(localY / this.tileHeight);
    if (column < 0 || row < 0 || column >= this.mapWidth || row >= this.mapHeight) {
      return null;
    }
    return { column, row };
  }

  getMapLocalBounds(): { width: number; height: number } {
    return {
      width: this.mapWidth * this.tileWidth,
      height: this.mapHeight * this.tileHeight,
    };
  }
}
