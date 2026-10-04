// Crafting bridge for the sandbox runtime.
// Recipes and item definitions come from the same content data used by THE LAST SAVE.

function craftItem(raw = "") {
  const text = String(raw || "").trim().toLowerCase();
  if (!text) {
    print("Usage: craft <item> [amount]");
    print("Example: craft iron sword 1");
    return false;
  }
  const [name, amountText] = parseCraftArgs(text);
  const recipeName = findRecipeName(name);
  const amount = Math.max(1, Number(amountText || 1));
  if (!recipeName || !recipes[recipeName]) {
    print("No recipe matches '" + name + "'.");
    return false;
  }
  const need = recipes[recipeName];
  const missing = [];
  for (const [item, count] of Object.entries(need)) {
    const have = GAME.inventory[item] || 0;
    if (have < count * amount) missing.push((count * amount - have) + " " + item);
  }
  if (missing.length) {
    print("Missing: " + missing.join(", ") + ".");
    return false;
  }
  for (const [item, count] of Object.entries(need)) removeItem(item, count * amount);
  addItem(recipeName, amount, true);
  print("CRAFTED " + amount + " × " + title(recipeName));
  if (ITEMS[recipeName]) print("  " + (describeBuffs(recipeName) || "gear"));
  if (USABLE_ITEMS[recipeName]) print("  " + (describeUsable(recipeName) || "consumable"));
  saveGame(true);
  return true;
}

function parseCraftArgs(text) {
  const parts = text.split(/\s+/);
  let amount = "";
  if (/^\d+$/.test(parts.at(-1))) amount = parts.pop();
  return [parts.join(" "), amount];
}

function findRecipeName(query) {
  const q = String(query || "").trim().toLowerCase();
  const keys = Object.keys(recipes);
  return keys.find((k) => k === q) || keys.find((k) => k.includes(q)) || null;
}

function listRecipes(filter = "") {
  const q = String(filter || "").trim().toLowerCase();
  const rows = Object.keys(recipes)
    .filter((name) => !q || name.includes(q))
    .slice(0, 80);
  print("RECIPES · " + rows.length + " shown");
  rows.forEach((name) => {
    const req = Object.entries(recipes[name]).map(([item, n]) => n + " " + item).join(", ");
    const ready = Object.entries(recipes[name]).every(([item, n]) => (GAME.inventory[item] || 0) >= n);
    print((ready ? "✓ " : "· ") + name + " — " + req);
  });
  if (rows.length === 80) print("…use 'recipes <search>' for a narrower list.");
}
