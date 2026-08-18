const fruitLesson = [
  word("apple", "Apple", "A", "#e6544f", "Apple, apple, red and round!", "a red apple"),
  word("banana", "Banana", "B", "#efc84b", "Banana, banana, long and yellow!", "a yellow banana"),
  word("orange", "Orange", "O", "#ef8d3d", "Orange, orange, bright and sweet!", "an orange"),
  word("grape", "Grape", "G", "#7a5bab", "Grape, grape, a juicy bunch!", "a bunch of purple grapes"),
];

const animalLesson = [
  word("cat", "Cat", "C", "#ef8d68", "Cat, cat, soft little paws!", "a friendly cat"),
  word("dog", "Dog", "D", "#c88b4d", "Dog, dog, wag your tail!", "a happy dog"),
  word("bird", "Bird", "B", "#52a5cf", "Bird, bird, fly up high!", "a blue bird"),
  word("fish", "Fish", "F", "#48a995", "Fish, fish, swish and swim!", "a little fish"),
];

const skyLesson = [
  word("sun", "Sun", "S", "#f1ba3b", "Sun, sun, warm and bright!", "a bright sun"),
  word("moon", "Moon", "M", "#8b92c8", "Moon, moon, glow at night!", "a crescent moon"),
  word("star", "Star", "S", "#edc94f", "Star, star, twinkle high!", "a shining star"),
  word("cloud", "Cloud", "C", "#8cb9c9", "Cloud, cloud, float along!", "a fluffy cloud"),
];

const colorLesson = [
  word("red", "Red", "R", "#e6544f", "Red, red, tap the color red!", "a bright red color"),
  word("blue", "Blue", "B", "#4c9ed9", "Blue, blue, like the sky so true!", "a clear blue color"),
  word("green", "Green", "G", "#62a96a", "Green, green, growing all around!", "a fresh green color"),
  word("yellow", "Yellow", "Y", "#efc84b", "Yellow, yellow, sunny and bright!", "a sunny yellow color"),
];

const bodyLesson = [
  word("head", "Head", "H", "#e78c70", "Head, head, nod along!", "a smiling head"),
  word("hand", "Hand", "H", "#d9a06e", "Hand, hand, wave hello!", "a waving hand"),
  word("foot", "Foot", "F", "#7f9ed0", "Foot, foot, stomp the beat!", "a dancing foot"),
  word("eye", "Eye", "E", "#63b5aa", "Eye, eye, look and see!", "a bright eye"),
];

const toyLesson = [
  word("ball", "Ball", "B", "#e6655a", "Ball, ball, bounce with me!", "a bouncy ball"),
  word("car", "Car", "C", "#4d9bd1", "Car, car, zoom along!", "a little blue car"),
  word("kite", "Kite", "K", "#e3a74d", "Kite, kite, fly up high!", "a colorful kite"),
  word("doll", "Doll", "D", "#b678b5", "Doll, doll, dance and play!", "a friendly doll"),
];

export const DEFAULT_GAME_MODE = "learn";
export const DEFAULT_SPEED_MODE = "slow";

export const SONGS = Object.freeze([
  song({
    id: "fruit-beat",
    title: "Fruit Beat",
    topic: "Fruit picnic",
    cover: "assets/fruit-cover.png",
    stageBackground: "assets/fruit-scene.png",
    stageSurface: "#26382d",
    accent: "#ffca45",
    stageAccent: "#ffca45",
    resultTitle: "Fruit superstar!",
    completionPhrase: "Fruit Beat complete! Apple, banana, orange, grape!",
    lesson: fruitLesson,
    bpms: { slow: 88, normal: 116, fast: 140 },
    arrangement: {
      melody: [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46],
      roots: [130.81, 174.61, 110, 196],
      melodyWave: "triangle",
      chordWave: "triangle",
      drumPattern: "pop",
    },
  }),
  song({
    id: "animal-parade",
    title: "Animal Parade",
    topic: "Animal friends",
    cover: "assets/animal-cover.png",
    stageBackground: "assets/animal-scene.png",
    stageSurface: "#243831",
    accent: "#57c69a",
    stageAccent: "#74dbad",
    resultTitle: "Parade leader!",
    completionPhrase: "Animal Parade complete! Cat, dog, bird, fish!",
    lesson: animalLesson,
    bpms: { slow: 84, normal: 112, fast: 136 },
    arrangement: {
      melody: [392, 440, 493.88, 523.25, 493.88, 440, 392, 329.63],
      roots: [98, 130.81, 146.83, 110],
      melodyWave: "square",
      chordWave: "triangle",
      drumPattern: "march",
    },
  }),
  song({
    id: "sky-sparkle",
    title: "Sky Sparkle",
    topic: "Sky words",
    cover: "assets/sky-cover.png",
    stageBackground: "assets/sky-scene.png",
    stageSurface: "#26384b",
    accent: "#68b9df",
    stageAccent: "#86d7f2",
    resultTitle: "Sky explorer!",
    completionPhrase: "Sky Sparkle complete! Sun, moon, star, cloud!",
    lesson: skyLesson,
    bpms: { slow: 86, normal: 114, fast: 138 },
    arrangement: {
      melody: [659.25, 783.99, 987.77, 783.99, 698.46, 880, 1046.5, 880],
      roots: [110, 146.83, 164.81, 123.47],
      melodyWave: "sine",
      chordWave: "sine",
      drumPattern: "air",
    },
  }),
  song({
    id: "color-train",
    title: "Color Train",
    topic: "Color station",
    cover: "assets/color-cover.png",
    stageBackground: "assets/color-scene.png",
    stageSurface: "#3c3031",
    accent: "#f0c24e",
    stageAccent: "#ffd86a",
    resultTitle: "Color conductor!",
    completionPhrase: "Color Train complete! Red, blue, green, yellow!",
    lesson: colorLesson,
    bpms: { slow: 90, normal: 118, fast: 142 },
    arrangement: {
      melody: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23],
      roots: [130.81, 164.81, 196, 146.83],
      melodyWave: "sawtooth",
      chordWave: "triangle",
      drumPattern: "train",
    },
  }),
  song({
    id: "body-boogie",
    title: "Body Boogie",
    topic: "Move and learn",
    cover: "assets/body-cover.png",
    stageBackground: "assets/body-scene.png",
    stageSurface: "#343346",
    accent: "#f29a65",
    stageAccent: "#ffb27d",
    resultTitle: "Boogie buddy!",
    completionPhrase: "Body Boogie complete! Head, hand, foot, eye!",
    lesson: bodyLesson,
    bpms: { slow: 92, normal: 120, fast: 144 },
    arrangement: {
      melody: [349.23, 392, 440, 392, 329.63, 392, 493.88, 440],
      roots: [87.31, 110, 130.81, 98],
      melodyWave: "square",
      chordWave: "sawtooth",
      drumPattern: "funk",
    },
  }),
  song({
    id: "toy-box-bounce",
    title: "Toy Box Bounce",
    topic: "Playroom toys",
    cover: "assets/toy-cover.png",
    stageBackground: "assets/toy-scene.png",
    stageSurface: "#303b46",
    accent: "#e88961",
    stageAccent: "#ffad77",
    resultTitle: "Toy box champion!",
    completionPhrase: "Toy Box Bounce complete! Ball, car, kite, doll!",
    lesson: toyLesson,
    bpms: { slow: 89, normal: 117, fast: 141 },
    arrangement: {
      melody: [440, 523.25, 659.25, 523.25, 493.88, 587.33, 698.46, 587.33],
      roots: [110, 146.83, 164.81, 123.47],
      melodyWave: "triangle",
      chordWave: "square",
      drumPattern: "bounce",
    },
  }),
]);

export function getSong(id) {
  return SONGS.find((candidate) => candidate.id === id) || SONGS[0];
}

function word(id, displayWord, letter, color, lyric, description) {
  return Object.freeze({ id, word: id, displayWord, letter, color, lyric, description });
}

function song(config) {
  const charts = Object.freeze({
    learn: Object.freeze({
      noteCount: 32,
      noteGapBeats: 3.25,
      lanes: 4,
      pairedItems: true,
      hintLanes: true,
      judgement: "lenient",
      missFeedback: "gentle",
    }),
    play: Object.freeze({
      noteCount: 48,
      noteGapBeats: 2.5,
      lanes: 4,
      pairedItems: false,
      hintLanes: false,
      judgement: "standard",
      missFeedback: "scored",
    }),
    challenge: Object.freeze({
      noteCount: 64,
      noteGapBeats: 1.9,
      lanes: 4,
      pairedItems: false,
      hintLanes: false,
      judgement: "challenge",
      missFeedback: "scored",
    }),
  });

  return Object.freeze({
    artist: "Melody Meadow",
    difficulty: "Easy",
    ...config,
    chart: charts.play,
    charts,
    audio: Object.freeze({
      source: `assets/audio/${config.id}.m4a`,
      baseBpm: config.bpms.normal,
      durationBeats: 152,
      format: "audio/mp4",
    }),
    bpms: Object.freeze(config.bpms),
    arrangement: Object.freeze(config.arrangement),
    lesson: Object.freeze(config.lesson),
  });
}
