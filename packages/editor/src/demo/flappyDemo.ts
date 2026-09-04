import type { ProjectData, ScriptRecord } from '@js-game-engine/shared';
import { PROJECT_VERSION } from '@js-game-engine/shared';
import {
  AudioSource,
  BoxCollider2D,
  Camera2D,
  Color,
  Rigidbody2D,
  Scene,
  ScriptComponent,
  SpriteRenderer,
  TextRenderer,
  serializeScene,
  type GameObject,
} from '@js-game-engine/engine';
import type { FlappySoundAssetIds } from './flappySounds';

export const FLAPPY_MENU_SCRIPT_ID = 'script-flappy-menu';
export const FLAPPY_GAME_MANAGER_SCRIPT_ID = 'script-flappy-game-manager';
export const FLAPPY_BIRD_SCRIPT_ID = 'script-flappy-bird';
export const FLAPPY_GAME_OVER_SCRIPT_ID = 'script-flappy-game-over';

const PIPE_WIDTH = 52;
const PIPE_HEIGHT = 320;
const PIPE_GAP = 150;
const PIPE_COUNT = 4;
const PIPE_SPACING = 220;
const SKY_COLOR = '#70c5ce';

export function createFlappyBirdScripts(): ScriptRecord[] {
  return [
    {
      id: FLAPPY_MENU_SCRIPT_ID,
      name: 'MenuController.ts',
      source: FLAPPY_MENU_SOURCE,
    },
    {
      id: FLAPPY_GAME_MANAGER_SCRIPT_ID,
      name: 'FlappyGameManager.ts',
      source: FLAPPY_GAME_MANAGER_SOURCE,
    },
    {
      id: FLAPPY_BIRD_SCRIPT_ID,
      name: 'FlappyBird.ts',
      source: FLAPPY_BIRD_SOURCE,
    },
    {
      id: FLAPPY_GAME_OVER_SCRIPT_ID,
      name: 'GameOverController.ts',
      source: FLAPPY_GAME_OVER_SOURCE,
    },
  ];
}

export function createFlappyProjectData(
  name = 'Flappy Bird',
  soundIds: FlappySoundAssetIds,
): ProjectData {
  const menuScene = buildMenuScene();
  const gameScene = buildGameScene(soundIds);
  const gameOverScene = buildGameOverScene();

  const menuId = crypto.randomUUID();
  const gameId = crypto.randomUUID();
  const gameOverId = crypto.randomUUID();

  const menuData = serializeScene(menuScene);
  return {
    version: PROJECT_VERSION,
    name,
    activeSceneId: menuId,
    scenes: [
      { id: menuId, name: 'Menu', data: menuData },
      { id: gameId, name: 'Game', data: serializeScene(gameScene) },
      { id: gameOverId, name: 'GameOver', data: serializeScene(gameOverScene) },
    ],
    scene: menuData,
    scripts: createFlappyBirdScripts(),
    prefabs: [],
  };
}

function buildMenuScene(): Scene {
  const scene = createBaseScene('Menu');

  const menuRoot = scene.createGameObject('MenuRoot');
  addText(menuRoot, 'MenuTitle', 'Flappy Bird', 52, 90, '#ffffff');
  addText(menuRoot, 'MenuPrompt', 'Press SPACE to Start', 22, 0, '#ffffff');

  const controller = scene.createGameObject('MenuController');
  const script = controller.addComponent(new ScriptComponent());
  script.scriptAssetId = FLAPPY_MENU_SCRIPT_ID;

  return scene;
}

function buildGameScene(soundIds: FlappySoundAssetIds): Scene {
  const scene = createBaseScene('Game');

  const gameManager = scene.createGameObject('GameManager');
  const scoreAudio = gameManager.addComponent(new AudioSource());
  scoreAudio.audioAssetId = soundIds.score;
  scoreAudio.playOnAwake = false;
  scoreAudio.volume = 0.55;
  const hitAudio = gameManager.addComponent(new AudioSource());
  hitAudio.audioAssetId = soundIds.hit;
  hitAudio.playOnAwake = false;
  hitAudio.volume = 0.75;
  const managerScript = gameManager.addComponent(new ScriptComponent());
  managerScript.scriptAssetId = FLAPPY_GAME_MANAGER_SCRIPT_ID;

  const bird = scene.createGameObject('Bird');
  bird.transform.localPosition.set(-100, 0);
  const birdSprite = bird.addComponent(new SpriteRenderer());
  birdSprite.color = Color.fromHex('#fbf1a9');
  birdSprite.width = 34;
  birdSprite.height = 24;
  birdSprite.sortingOrder = 10;
  const birdBeak = scene.createGameObject('Beak', bird);
  birdBeak.transform.localPosition.set(14, -2);
  const beakSprite = birdBeak.addComponent(new SpriteRenderer());
  beakSprite.color = Color.fromHex('#e86101');
  beakSprite.width = 10;
  beakSprite.height = 10;
  beakSprite.sortingOrder = 11;
  const birdCollider = bird.addComponent(new BoxCollider2D());
  birdCollider.width = 28;
  birdCollider.height = 20;
  const birdBody = bird.addComponent(new Rigidbody2D());
  birdBody.gravityScale = 1.2;
  const flapAudio = bird.addComponent(new AudioSource());
  flapAudio.audioAssetId = soundIds.flap;
  flapAudio.playOnAwake = false;
  flapAudio.volume = 0.7;
  const birdScript = bird.addComponent(new ScriptComponent());
  birdScript.scriptAssetId = FLAPPY_BIRD_SCRIPT_ID;

  const ground = scene.createGameObject('Ground');
  ground.transform.localPosition.set(0, -260);
  const groundSprite = ground.addComponent(new SpriteRenderer());
  groundSprite.color = Color.fromHex('#ded895');
  groundSprite.width = 640;
  groundSprite.height = 40;
  groundSprite.sortingOrder = -5;
  const groundTop = scene.createGameObject('GroundStrip', ground);
  groundTop.transform.localPosition.set(0, 20);
  const groundTopSprite = groundTop.addComponent(new SpriteRenderer());
  groundTopSprite.color = Color.fromHex('#73bf2e');
  groundTopSprite.width = 640;
  groundTopSprite.height = 20;
  groundTopSprite.sortingOrder = -4;
  const groundCollider = ground.addComponent(new BoxCollider2D());
  groundCollider.width = 640;
  groundCollider.height = 40;

  const ceiling = scene.createGameObject('Ceiling');
  ceiling.transform.localPosition.set(0, 290);
  const ceilingCollider = ceiling.addComponent(new BoxCollider2D());
  ceilingCollider.width = 640;
  ceilingCollider.height = 20;

  for (let i = 0; i < PIPE_COUNT; i += 1) {
    createPipePair(scene, `PipePair_${i}`, 180 + i * PIPE_SPACING, randomGapCenter(i));
  }

  addSceneText(scene, 'ScoreText', '0', 40, 220, '#ffffff');

  return scene;
}

function buildGameOverScene(): Scene {
  const scene = createBaseScene('GameOver');

  const root = scene.createGameObject('GameOverRoot');
  addText(root, 'GameOverTitle', 'Game Over', 44, 60, '#ffeb3b');
  addText(root, 'GameOverPrompt', 'Press SPACE to Retry', 22, 0, '#ffffff');
  addText(root, 'MenuHint', 'Press M for Menu', 16, -50, '#cccccc');

  const controller = scene.createGameObject('GameOverController');
  const script = controller.addComponent(new ScriptComponent());
  script.scriptAssetId = FLAPPY_GAME_OVER_SCRIPT_ID;

  return scene;
}

function createBaseScene(name: string): Scene {
  const scene = new Scene(name);

  const background = scene.createGameObject('SkyBackground');
  const sky = background.addComponent(new SpriteRenderer());
  sky.color = Color.fromHex(SKY_COLOR);
  sky.width = 2400;
  sky.height = 1600;
  sky.sortingOrder = -100;

  const camera = scene.createGameObject('Main Camera');
  const cameraComponent = camera.addComponent(new Camera2D());
  cameraComponent.backgroundColor = Color.fromHex(SKY_COLOR);
  cameraComponent.zoom = 1;

  return scene;
}

function randomGapCenter(index: number): number {
  const offsets = [40, -20, 80, 10];
  return offsets[index % offsets.length] ?? 0;
}

function addSceneText(
  scene: Scene,
  name: string,
  text: string,
  fontSize: number,
  offsetY: number,
  color: string,
): void {
  const obj = scene.createGameObject(name);
  const label = obj.addComponent(new TextRenderer());
  label.text = text;
  label.fontSize = fontSize;
  label.offsetY = offsetY;
  label.color = Color.fromHex(color);
  label.alignment = 'center';
  label.sortingOrder = 200;
}

function addText(
  parent: GameObject,
  name: string,
  text: string,
  fontSize: number,
  offsetY: number,
  color: string,
): void {
  const obj = parent.scene!.createGameObject(name, parent);
  const label = obj.addComponent(new TextRenderer());
  label.text = text;
  label.fontSize = fontSize;
  label.offsetY = offsetY;
  label.color = Color.fromHex(color);
  label.alignment = 'center';
  label.sortingOrder = 200;
}

function createPipePair(
  scene: Scene,
  name: string,
  x: number,
  gapCenterY: number,
): GameObject {
  const pair = scene.createGameObject(name);
  pair.transform.localPosition.set(x, 0);

  const top = scene.createGameObject('TopPipe', pair);
  top.transform.localPosition.set(0, gapCenterY + PIPE_GAP / 2 + PIPE_HEIGHT / 2);
  addPipeSprite(top, true);
  const topCollider = top.addComponent(new BoxCollider2D());
  topCollider.width = PIPE_WIDTH;
  topCollider.height = PIPE_HEIGHT;

  const bottom = scene.createGameObject('BottomPipe', pair);
  bottom.transform.localPosition.set(0, gapCenterY - PIPE_GAP / 2 - PIPE_HEIGHT / 2);
  addPipeSprite(bottom, false);
  const bottomCollider = bottom.addComponent(new BoxCollider2D());
  bottomCollider.width = PIPE_WIDTH;
  bottomCollider.height = PIPE_HEIGHT;

  return pair;
}

function addPipeSprite(obj: GameObject, isTop: boolean): void {
  const sprite = obj.addComponent(new SpriteRenderer());
  sprite.color = Color.fromHex('#73bf2e');
  sprite.width = PIPE_WIDTH;
  sprite.height = PIPE_HEIGHT;
  sprite.sortingOrder = 0;
  const cap = obj.scene!.createGameObject('Cap', obj);
  cap.transform.localPosition.set(0, isTop ? -PIPE_HEIGHT / 2 + 6 : PIPE_HEIGHT / 2 - 6);
  const capSprite = cap.addComponent(new SpriteRenderer());
  capSprite.color = Color.fromHex('#5a9624');
  capSprite.width = PIPE_WIDTH + 8;
  capSprite.height = 24;
  capSprite.sortingOrder = 1;
}

const FLAPPY_MENU_SOURCE = `export default class MenuController extends Behaviour {
  onUpdate() {
    if (Input.getKey(' ') || Input.getKey('Enter')) {
      this.loadScene('Game');
    }
  }
}
`;

const FLAPPY_GAME_OVER_SOURCE = `export default class GameOverController extends Behaviour {
  onUpdate() {
    if (Input.getKey(' ') || Input.getKey('Enter')) {
      this.loadScene('Game');
    }
    if (Input.getKey('m') || Input.getKey('M')) {
      this.loadScene('Menu');
    }
  }
}
`;

const FLAPPY_BIRD_SOURCE = `export default class FlappyBird extends Behaviour {
  body = null;
  flapAudio = null;
  flapPressed = false;
  ended = false;

  onStart() {
    this.body = this.getRigidbody2D();
    this.flapAudio = this.getAudioSource();
  }

  onFixedUpdate() {
    if (!this.body || this.ended) return;

    this.body.velocity.x = 0;

    const flap = Input.getKey(' ') || Input.getKey('ArrowUp');
    if (flap && !this.flapPressed) {
      this.body.velocity.y = 380;
      if (this.flapAudio) this.flapAudio.playOneShot();
    }
    this.flapPressed = flap;

    const tilt = Math.max(-0.5, Math.min(0.8, this.body.velocity.y / 420));
    this.transform.localRotation = -tilt;
  }

  onCollisionEnter(_collision) {
    if (this.ended) return;
    this.ended = true;

    const manager = this.findGameObject('GameManager');
    if (manager) {
      const sources = manager.getComponents(AudioSource);
      const hit = sources[1];
      if (hit) hit.playOneShot();
    }

    this.loadScene('GameOver');
  }
}
`;

const FLAPPY_GAME_MANAGER_SOURCE = `export default class FlappyGameManager extends Behaviour {
  score = 0;
  pipeSpeed = 190;
  pipeSpacing = 220;
  scoredPipes = {};
  scoreAudio = null;

  onStart() {
    const sources = this.gameObject.getComponents(AudioSource);
    this.scoreAudio = sources[0] ?? null;
    this.score = 0;
    this.scoredPipes = {};
    this.updateScoreText();
    this.resetPipes();
  }

  onUpdate(_dt) {
    this.movePipes(Time.deltaTime);
    this.checkScoring();
  }

  resetPipes() {
    const gapOffsets = [40, -20, 80, 10];
    let index = 0;

    for (const child of this.gameObject.scene.rootObjects) {
      if (!child.name.startsWith('PipePair_')) continue;
      child.transform.localPosition.x = 180 + index * this.pipeSpacing;
      this.layoutPipePair(child, gapOffsets[index % gapOffsets.length]);
      index += 1;
    }
  }

  layoutPipePair(pair, gapCenterY) {
    const top = pair.children.find((c) => c.name === 'TopPipe');
    const bottom = pair.children.find((c) => c.name === 'BottomPipe');
    const gap = 150;
    const height = 320;
    if (top) top.transform.localPosition.y = gapCenterY + gap / 2 + height / 2;
    if (bottom) bottom.transform.localPosition.y = gapCenterY - gap / 2 - height / 2;
  }

  movePipes(dt) {
    let rightmost = -999;
    const pairs = [];

    for (const child of this.gameObject.scene.rootObjects) {
      if (!child.name.startsWith('PipePair_')) continue;
      child.transform.localPosition.x -= this.pipeSpeed * dt;
      pairs.push(child);
      rightmost = Math.max(rightmost, child.transform.localPosition.x);
    }

    for (const pair of pairs) {
      if (pair.transform.localPosition.x < -360) {
        pair.transform.localPosition.x = rightmost + this.pipeSpacing;
        rightmost = pair.transform.localPosition.x;
        const gapY = (Math.random() - 0.5) * 160;
        this.layoutPipePair(pair, gapY);
        delete this.scoredPipes[pair.name];
      }
    }
  }

  checkScoring() {
    const bird = this.findGameObject('Bird');
    if (!bird) return;

    const birdX = bird.transform.localPosition.x;

    for (const child of this.gameObject.scene.rootObjects) {
      if (!child.name.startsWith('PipePair_')) continue;
      if (this.scoredPipes[child.name]) continue;
      if (birdX > child.transform.localPosition.x + 26) {
        this.scoredPipes[child.name] = true;
        this.score += 1;
        this.updateScoreText();
        if (this.scoreAudio) this.scoreAudio.playOneShot();
      }
    }
  }

  updateScoreText() {
    const scoreObj = this.findGameObject('ScoreText');
    const text = scoreObj?.getComponent(TextRenderer);
    if (text) text.text = String(this.score);
  }
}
`;
