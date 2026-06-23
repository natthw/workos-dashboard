// Daily-rotating "legacy" figures — a calm, motivational banner (not gamification).
// Real public-domain portraits (Wikimedia) + themed scene backdrops (Unsplash).

const WP = (n: string) =>
  "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(n) + "?width=600";
const UN = (id: string, w = 1200) =>
  "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=" + w + "&q=72";

export interface Figure {
  name: string;
  years: string;
  emoji: string;
  portrait: string;
  scene: string;
  sceneImg: string;
  quote: string;
  legacy: string;
}

export const FIGURES: Figure[] = [
  {
    name: "Marie Curie", years: "1867–1934", emoji: "⚗️",
    portrait: WP("Marie_Curie_c1920.jpg"),
    scene: "a glowing laboratory bench", sceneImg: UN("1532094349884-543bc11b234d"),
    quote: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more.",
    legacy: "Pioneered radioactivity and became the first person ever to win two Nobel Prizes.",
  },
  {
    name: "Leonardo da Vinci", years: "1452–1519", emoji: "🎨",
    portrait: WP("Leonardo_self.jpg"),
    scene: "an inventor's cluttered workshop", sceneImg: UN("1503694978374-8a2fa686963a"),
    quote: "It had long since come to my attention that people of accomplishment rarely sat back and let things happen to them.",
    legacy: "Painter, engineer and anatomist whose notebooks anticipated inventions by centuries.",
  },
  {
    name: "Vincent van Gogh", years: "1853–1890", emoji: "🌻",
    portrait: WP("Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_(454045).jpg"),
    scene: "a sunlit painter's studio", sceneImg: UN("1513364776144-60967b0f800f"),
    quote: "Great things are not done by impulse, but by a series of small things brought together.",
    legacy: "Made nearly 900 paintings in a single decade and reshaped the course of modern art.",
  },
  {
    name: "Marcus Aurelius", years: "121–180", emoji: "🏛️",
    portrait: WP("Marcus_Aurelius_Glyptothek_Munich.jpg"),
    scene: "the Roman forum at dusk", sceneImg: UN("1552832230-c0197dd311b5"),
    quote: "The impediment to action advances action. What stands in the way becomes the way.",
    legacy: "A Roman emperor whose private journal became the Stoic classic, Meditations.",
  },
  {
    name: "Ada Lovelace", years: "1815–1852", emoji: "⚙️",
    portrait: WP("Ada_Lovelace_portrait.jpg"),
    scene: "an early brass computing engine", sceneImg: UN("1518770660439-4636190af475"),
    quote: "That brain of mine is something more than merely mortal, as time will show.",
    legacy: "Wrote what is regarded as the first algorithm intended for a machine.",
  },
  {
    name: "Frederick Douglass", years: "1818–1895", emoji: "📢",
    portrait: WP("Frederick_Douglass_(circa_1879).jpg"),
    scene: "a crowded lecture hall mid-speech", sceneImg: UN("1517457373958-b7bdd4587205"),
    quote: "If there is no struggle, there is no progress.",
    legacy: "Escaped slavery to become one of history's most powerful voices for human freedom.",
  },
];

/** Deterministic daily index (UTC day count) so server and client agree on first render. */
export function dailyFigureIndex(epochMs: number): number {
  return Math.floor(epochMs / 86400000) % FIGURES.length;
}
