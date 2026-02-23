"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

export const FAVORITES_KEY = "gochat-emoji-favorites";
const RECENTS_KEY = "gochat-emoji-recents";
const NUM_FAVORITES = 8;
const NUM_RECENTS = 8;
export const DEFAULT_FAVORITES = ["👍", "❤️", "😂", "🎉", "🔥", "👏", "😍", "🚀"];

export function loadFavorites(): string[] {
  if (typeof window === "undefined") return DEFAULT_FAVORITES;
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === NUM_FAVORITES) return parsed;
    }
  } catch {}
  return DEFAULT_FAVORITES;
}

function saveFavorites(favs: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {}
}

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveRecent(emoji: string, currentFavorites: string[]): string[] {
  const recents = loadRecents();
  // Remove if already in recents, then prepend
  const filtered = recents.filter((e) => e !== emoji);
  filtered.unshift(emoji);
  // Keep only emojis that aren't in favorites, cap at a larger pool so we always have enough to display
  const trimmed = filtered.filter((e) => !currentFavorites.includes(e)).slice(0, 30);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(trimmed));
  } catch {}
  return trimmed;
}

const EMOJI_CATEGORIES = [
  {
    name: "Smileys & People",
    icon: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
      "😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
      "🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫",
      "🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒",
      "🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒",
      "🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳",
      "🥸","😎","🤓","🧐","😕","🫤","😟","🙁","😮","😯",
      "😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢",
      "😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤",
      "😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹",
      "👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼",
      "😽","🙀","😿","😾",
    ],
  },
  {
    name: "Gestures & People",
    icon: "👋",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌",
      "🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉",
      "👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛",
      "🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪","🦾",
      "🖖","👶","👦","👧","🧑","👱","👨","🧔","👩","🧓",
      "👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇",
      "🤦","🤷","💆","💇","🚶","🧍","🧎","🏃","💃","🕺",
      "👯","🧖","🧗","🏇","🏂","🏌️","🏄","🚣","🏊","⛹️",
      "🏋️","🚴","🚵","🤸","🤼","🤽","🤾","🤺","🧘","🛀",
    ],
  },
  {
    name: "Animals & Nature",
    icon: "🐶",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨",
      "🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒",
      "🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇",
      "🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞",
      "🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🦂","🐢","🐍",
      "🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠",
      "🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍",
      "🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃",
      "🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕",
      "🐩","🦮","🐕‍🦺","🐈","🐈‍⬛","🪶","🐓","🦃","🦤","🦚",
      "🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦",
      "🦥","🐁","🐀","🐿️","🦔","🌵","🎄","🌲","🌳","🌴",
      "🪵","🌱","🌿","☘️","🍀","🎍","🪴","🎋","🍃","🍂",
      "🍁","🌾","🪻","🌺","🌸","🌼","🌻","🌹","🥀","🪷",
      "💐","🌷","🌱","🪹","🪺",
    ],
  },
  {
    name: "Food & Drink",
    icon: "🍕",
    emojis: [
      "🍇","🍈","🍉","🍊","🍋","🍌","🍍","🥭","🍎","🍏",
      "🍐","🍑","🍒","🍓","🫐","🥝","🍅","🫒","🥥","🥑",
      "🍆","🥔","🥕","🌽","🌶️","🫑","🥒","🥬","🥦","🧄",
      "🧅","🍄","🥜","🫘","🌰","🍞","🥐","🥖","🫓","🥨",
      "🥯","🥞","🧇","🧀","🍖","🍗","🥩","🥓","🍔","🍟",
      "🍕","🌭","🥪","🌮","🌯","🫔","🥙","🧆","🥚","🍳",
      "🥘","🍲","🫕","🥣","🥗","🍿","🧈","🧂","🥫","🍱",
      "🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤",
      "🍥","🥮","🍡","🥟","🥠","🥡","🦀","🦞","🦐","🦑",
      "🦪","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧",
      "🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🫖","🍵",
      "🍶","🍾","🍷","🍸","🍹","🍺","🍻","🥂","🥃","🫗",
      "🥤","🧋","🧃","🧉","🧊",
    ],
  },
  {
    name: "Activities",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱",
      "🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳",
      "🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷",
      "⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️","🤸","🤺","⛹️",
      "🏊","🚴","🚵","🏇","🧘","🎪","🎗️","🎟️","🎫","🎖️",
      "🏆","🏅","🥇","🥈","🥉","🎃","🎄","🎆","🎇","🧨",
      "✨","🎈","🎉","🎊","🎋","🎍","🎎","🎏","🎐","🎑",
      "🧧","🎀","🎁","🎯","🎮","🕹️","🎰","🎲","🧩","🧸",
      "🪅","🪩","🪆","♠️","♥️","♦️","♣️","♟️","🃏","🀄",
      "🎴","🎭","🖼️","🎨","🧵","🪡","🧶","🪢",
    ],
  },
  {
    name: "Travel & Places",
    icon: "🚗",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐",
      "🛻","🚚","🚛","🚜","🏍️","🛵","🛺","🚲","🛴","🚏",
      "🛣️","🛤️","🛞","⛽","🚨","🚥","🚦","🛑","🚧","⚓",
      "🛟","⛵","🚤","🛳️","⛴️","🛥️","🚢","✈️","🛩️","🛫",
      "🛬","🪂","💺","🚁","🚟","🚠","🚡","🛰️","🚀","🛸",
      "🌍","🌎","🌏","🌐","🗺️","🧭","🏔️","⛰️","🌋","🗻",
      "🏕️","🏖️","🏜️","🏝️","🏞️","🏟️","🏛️","🏗️","🧱","🪨",
      "🪵","🛖","🏘️","🏚️","🏠","🏡","🏢","🏣","🏤","🏥",
      "🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒",
      "🗼","🗽","⛪","🕌","🛕","🕍","⛩️","🕋","⛲","⛺",
      "🌁","🌃","🏙️","🌄","🌅","🌆","🌇","🌉","🗾","🎑",
      "🏞️","🎠","🛝","🎡","🎢","💈","🎪","🚂","🚃","🚄",
      "🚅","🚆","🚇","🚈","🚉","🚊","🚝","🚞","🚋","🚃",
    ],
  },
  {
    name: "Objects",
    icon: "💡",
    emojis: [
      "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","💽",
      "💾","💿","📀","🧮","🎥","🎞️","📽️","🎬","📺","📷",
      "📸","📹","📼","🔍","🔎","🕯️","💡","🔦","🏮","🪔",
      "📔","📕","📖","📗","📘","📙","📚","📓","📒","📃",
      "📜","📄","📰","🗞️","📑","🔖","🏷️","💰","🪙","💴",
      "💵","💶","💷","💸","💳","🧾","💹","✉️","📧","📨",
      "📩","📤","📥","📦","📫","📪","📬","📭","📮","🗳️",
      "✏️","✒️","🖋️","🖊️","🖌️","🖍️","📝","💼","📁","📂",
      "🗂️","📅","📆","🗒️","🗓️","📇","📈","📉","📊","📋",
      "📌","📍","📎","🖇️","📏","📐","✂️","🗃️","🗄️","🗑️",
      "🔒","🔓","🔏","🔐","🔑","🗝️","🔨","🪓","⛏️","⚒️",
      "🛠️","🗡️","⚔️","🔫","🪃","🛡️","🪚","🔧","🪛","🔩",
      "⚙️","🗜️","⚖️","🦯","🔗","⛓️","🪝","🧰","🧲","🪜",
      "⚗️","🧪","🧫","🧬","🔬","🔭","📡","💉","🩸","💊",
      "🩹","🩼","🩺","🩻","🚪","🛗","🪞","🪟","🛏️","🛋️",
      "🪑","🚽","🪠","🚿","🛁","🪤","🪒","🧴","🧷","🧹",
      "🧺","🧻","🪣","🧼","🫧","🪥","🧽","🧯","🛒","🚬",
      "⚰️","🪦","⚱️","🏺","🔮","📿","🧿","🪬","💈","⚗️",
      "🪄","🎮","🕹️","🎰","🎲",
    ],
  },
  {
    name: "Symbols",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
      "❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝",
      "💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️",
      "☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎",
      "♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️",
      "📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮",
      "🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎",
      "🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯",
      "💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗",
      "❓","❕","❔","‼️","⁉️","🔅","🔆","〽️","⚠️","🚸",
      "🔱","⚜️","🔰","♻️","✅","🈯","💹","❇️","✳️","❎",
      "🌐","💠","Ⓜ️","🌀","💤","🏧","🚾","♿","🅿️","🛗",
      "🈳","🈂️","🛂","🛃","🛄","🛅","🚹","🚺","🚻","🚼",
      "🚮","🎦","📶","🈁","🔣","ℹ️","🔤","🔡","🔠","🆙",
      "🆒","🆕","🆓","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣",
      "7️⃣","8️⃣","9️⃣","🔟","🔢","#️⃣","*️⃣","⏏️","▶️","⏸️",
      "⏯️","⏹️","⏺️","⏭️","⏮️","⏩","⏪","⏫","⏬","◀️",
      "🔼","🔽","➡️","⬅️","⬆️","⬇️","↗️","↘️","↙️","↖️",
      "↕️","↔️","↩️","↪️","⤴️","⤵️","🔀","🔁","🔂","🔄",
      "🔃","🎵","🎶","➕","➖","➗","✖️","🟰","♾️","💲",
      "💱","™️","©️","®️","👁️‍🗨️","🔚","🔙","🔛","🔝","🔜",
      "〰️","➰","➿","✔️","☑️","🔘","🔴","🟠","🟡","🟢",
      "🔵","🟣","⚫","⚪","🟤","🔺","🔻","🔸","🔹","🔶",
      "🔷","🔳","🔲","▪️","▫️","◾","◽","◼️","◻️","🟥",
      "🟧","🟨","🟩","🟦","🟪","⬛","⬜","🟫","🔈","🔇",
      "🔉","🔊","🔔","🔕","📣","📢","💬","💭","🗯️","♠️",
      "♣️","♥️","♦️","🃏","🎴","🀄","🕐","🕑","🕒","🕓",
      "🕔","🕕","🕖","🕗","🕘","🕙","🕚","🕛",
    ],
  },
  {
    name: "Flags",
    icon: "🏁",
    emojis: [
      "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🇺🇸","🇬🇧",
      "🇨🇦","🇦🇺","🇫🇷","🇩🇪","🇮🇹","🇪🇸","🇯🇵","🇰🇷","🇨🇳","🇮🇳",
      "🇧🇷","🇲🇽","🇷🇺","🇿🇦","🇳🇬","🇪🇬","🇰🇪","🇸🇦","🇦🇪","🇮🇱",
      "🇹🇷","🇸🇪","🇳🇴","🇩🇰","🇫🇮","🇳🇱","🇧🇪","🇨🇭","🇦🇹","🇵🇱",
      "🇵🇹","🇬🇷","🇮🇪","🇨🇿","🇭🇺","🇷🇴","🇺🇦","🇹🇭","🇻🇳","🇵🇭",
      "🇮🇩","🇲🇾","🇸🇬","🇳🇿","🇦🇷","🇨🇴","🇨🇱","🇵🇪","🇻🇪","🇨🇺",
      "🇯🇲","🇵🇷","🇩🇴","🇭🇹","🇵🇦","🇨🇷",
    ],
  },
];

// Simple keyword map for search (covers the most commonly searched terms)
export const EMOJI_KEYWORDS: Record<string, string[]> = {
  "😀": ["smile","happy","grin"],"😂": ["laugh","cry","funny","lol"],"🥹": ["pleading","touched"],
  "😍": ["love","heart eyes"],"🤩": ["star","wow","amazing"],"😎": ["cool","sunglasses"],
  "🤔": ["think","hmm"],"😅": ["sweat","nervous"],"😭": ["crying","sad"],
  "😱": ["scream","shock","scared"],"🤣": ["rofl","rolling"],"😇": ["angel","innocent"],
  "🥰": ["love","hearts"],"😘": ["kiss","love"],"😏": ["smirk"],
  "🤮": ["vomit","sick"],"🥵": ["hot"],"🥶": ["cold","frozen"],"🤯": ["mind blown","explode"],
  "🥳": ["party","celebrate"],"😤": ["angry","frustrated"],"😡": ["angry","mad","rage"],
  "👍": ["thumbs up","yes","good","like"],"👎": ["thumbs down","no","bad","dislike"],
  "👏": ["clap","applause","bravo"],"🙌": ["hands","celebrate","hooray"],
  "🤝": ["handshake","deal","agree"],"🙏": ["pray","please","thanks","hope"],
  "💪": ["strong","muscle","flex"],"👋": ["wave","hello","hi","bye"],
  "✌️": ["peace","victory"],"🤞": ["fingers crossed","luck","hope"],
  "❤️": ["heart","love","red"],"💔": ["broken heart","sad"],
  "🔥": ["fire","hot","lit"],"⭐": ["star"],"💡": ["idea","lightbulb"],
  "🚀": ["rocket","launch","ship"],"✅": ["check","done","yes"],
  "❌": ["cross","no","wrong","delete"],"💯": ["hundred","perfect","score"],
  "🎉": ["party","celebrate","tada"],"🎊": ["confetti"],
  "📌": ["pin","pushpin"],"⚡": ["lightning","fast","electric"],
  "💀": ["skull","dead"],"💩": ["poop"],"🤖": ["robot","bot"],
  "👻": ["ghost","boo"],"👽": ["alien","ufo"],"🐶": ["dog","puppy"],
  "🐱": ["cat","kitty"],"🐻": ["bear"],"🦊": ["fox"],
  "🍕": ["pizza"],"🍔": ["burger","hamburger"],"🌮": ["taco"],
  "☕": ["coffee"],"🍺": ["beer"],"🍷": ["wine"],
  "🏆": ["trophy","winner","champion"],"🥇": ["gold","first","winner"],
  "🎮": ["game","gaming","controller"],"🎵": ["music","note"],
  "📱": ["phone","mobile"],"💻": ["computer","laptop"],
  "🔒": ["lock","secure","private"],"🔑": ["key"],
  "⏰": ["alarm","time","clock"],"📧": ["email","mail"],
  "💰": ["money","rich"],"💵": ["dollar","money","cash"],
  "🌍": ["earth","globe","world"],"🌈": ["rainbow"],
  "☀️": ["sun","sunny"],"🌙": ["moon","night"],"⛅": ["cloud","weather"],
  "🌊": ["wave","ocean","water"],"🌸": ["cherry blossom","flower"],
  "🌹": ["rose","flower"],"🍀": ["clover","luck","lucky"],
  "🎂": ["birthday","cake"],"🍰": ["cake","dessert"],
  "🚗": ["car"],"✈️": ["plane","airplane","travel"],
  "🏠": ["house","home"],"🏢": ["office","building"],
  "⚽": ["soccer","football"],"🏀": ["basketball"],"🏈": ["football"],
  "🎯": ["target","bullseye","goal"],"🧩": ["puzzle","piece"],
  "💬": ["speech","comment","chat","message"],"💭": ["thought","thinking"],
  "🔔": ["bell","notification","alert"],"🔕": ["mute","silent"],
  "⚠️": ["warning","caution"],"🚫": ["prohibited","banned","no"],
};

export default function EmojiPicker({ onSelect, onClose, style }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [recents, setRecents] = useState<string[]>(loadRecents);
  const [editMode, setEditMode] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editMode) {
          setEditMode(false);
          setEditingSlot(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", keyHandler);
    if (!editMode) searchRef.current?.focus();
    return () => document.removeEventListener("keydown", keyHandler);
  }, [onClose, editMode]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return EMOJI_CATEGORIES;
    const q = search.toLowerCase();
    const results = EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((emoji) => {
        if (emoji.includes(q)) return true;
        const kw = EMOJI_KEYWORDS[emoji];
        return kw?.some((k) => k.includes(q));
      }),
    })).filter((cat) => cat.emojis.length > 0);
    return results;
  }, [search]);

  const handleEmojiClick = useCallback((emoji: string) => {
    if (editMode && editingSlot !== null) {
      const updated = [...favorites];
      updated[editingSlot] = emoji;
      setFavorites(updated);
      saveFavorites(updated);
      // Re-filter recents to exclude the new favorite
      setRecents((prev) => prev.filter((e) => !updated.includes(e)));
      // Auto-advance to next slot, or exit if last
      if (editingSlot < NUM_FAVORITES - 1) {
        setEditingSlot(editingSlot + 1);
      } else {
        setEditingSlot(null);
        setEditMode(false);
      }
    } else {
      const updatedRecents = saveRecent(emoji, favorites);
      setRecents(updatedRecents);
      onSelect(emoji);
      onClose();
    }
  }, [editMode, editingSlot, favorites, onSelect, onClose]);

  const handleFavoriteClick = (index: number) => {
    if (editMode) {
      setEditingSlot(editingSlot === index ? null : index);
    } else {
      onSelect(favorites[index]);
      onClose();
    }
  };

  const toggleEditMode = () => {
    if (editMode) {
      setEditMode(false);
      setEditingSlot(null);
    } else {
      setEditMode(true);
      setEditingSlot(0);
    }
  };

  return (
    <>
      {/* Invisible backdrop to catch outside clicks */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Picker panel */}
      <div
        className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-80 z-50 flex flex-col"
        style={{ maxHeight: "420px", ...style }}
      >
        {/* Search */}
        <div className="p-2 border-b border-gray-100 dark:border-gray-700">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search emoji..."
            className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
        </div>

        {/* Favorites bar */}
        <div className="flex items-center px-2 py-1.5 border-b border-gray-100 dark:border-gray-700 gap-0.5">
          {favorites.map((emoji, i) => (
            <button
              key={`fav-${i}`}
              type="button"
              onClick={() => handleFavoriteClick(i)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all text-lg ${
                editMode && editingSlot === i
                  ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/30 scale-110"
                  : editMode
                    ? "border border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-400"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title={editMode ? `Slot ${i + 1} — click to select, then pick an emoji below` : "Quick emoji"}
            >
              {emoji}
            </button>
          ))}
          {/* Settings gear */}
          <button
            type="button"
            onClick={toggleEditMode}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ml-auto flex-shrink-0 ${
              editMode
                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            title={editMode ? "Done editing favorites" : "Customize favorites"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Edit mode hint */}
        {editMode && (
          <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-xs text-purple-600 dark:text-purple-400 text-center">
            {editingSlot !== null
              ? `Pick an emoji below for slot ${editingSlot + 1}`
              : "Click a slot above, then pick an emoji"}
          </div>
        )}

        {/* Recently used */}
        {!search && !editMode && (() => {
          const displayRecents = recents.filter((e) => !favorites.includes(e)).slice(0, NUM_RECENTS);
          if (displayRecents.length === 0) return null;
          return (
            <div className="flex items-center px-2 py-1 border-b border-gray-100 dark:border-gray-700 gap-0.5">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-0.5 flex-shrink-0">Recent</span>
              {displayRecents.map((emoji, i) => (
                <button
                  key={`recent-${i}`}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          );
        })()}

        {/* Emoji grid */}
        <div className="overflow-y-auto flex-1 p-2">
          {filteredCategories.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">No emoji found</p>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.name}>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 mt-1">
                  {category.name}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {category.emojis.map((emoji, emojiIdx) => (
                    <button
                      key={`${emoji}-${emojiIdx}`}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-lg ${
                        editMode
                          ? "hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:ring-1 hover:ring-purple-400"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
