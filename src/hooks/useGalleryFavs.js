import { useState } from "react";

const KEY = "fp-gallery-favs";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function useGalleryFavs() {
  const [favs, setFavs] = useState(load);

  const save = (next) => {
    setFavs(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const addFav = (bjId) => {
    const id = bjId.trim();
    if (!id || favs.includes(id)) return false;
    save([...favs, id]);
    return true;
  };

  const removeFav = (bjId) => save(favs.filter(id => id !== bjId));

  return { favs, addFav, removeFav };
}
