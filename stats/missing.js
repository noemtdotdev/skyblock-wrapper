const { decodeData } = require("../utils/nbt");
const getMissingTalismans = require("../constants/missing");
const prices = require("../data/prices.json");

const MAGICAL_POWER = {
  common: 3,
  uncommon: 5,
  rare: 8,
  epic: 12,
  legendary: 16,
  mythic: 22,
  special: 3,
  very_special: 5,
};

function getMagicalPower(rarity) {
  return MAGICAL_POWER[rarity.toLowerCase()] ?? 0;
}

function getPrice(name) {
  name = name.toLowerCase();
  return prices[name]?.price || null;
}

function organizeTalismansByRarity(talismans) {
  const organized = {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    legendary: [],
    mythic: [],
    special: [],
    very_special: [],
    totalMissing: 0,
  };

  talismans.forEach(talisman => {
    const rarity = talisman.rarity || "common"; 
    talisman.mp = getMagicalPower(rarity);
    talisman.price = getPrice(talisman.id) || null;
    if (organized[rarity]) {
      organized[rarity].push(talisman);
    } else {
      organized.special.push(talisman);
    }
    organized.totalMissing += 1;
  });

  for (const rarity in organized) {
    if (Array.isArray(organized[rarity])) { 
      organized[rarity].sort((a, b) => b.price - a.price);
    }
  }

  return organized;
}

module.exports = async (profile) => {
  if (profile.inventory?.bag_contents?.talisman_bag?.data && profile.inventory?.inv_contents?.data) {
    let talismans = (
      await decodeData(Buffer.from(profile.inventory?.bag_contents?.talisman_bag?.data, "base64"))
    ).i;
    const inventory = (
      await decodeData(Buffer.from(profile.inventory?.inv_contents?.data, "base64"))
    ).i;
    talismans = talismans.concat(inventory);

    let talisman_ids = talismans.map(talisman => talisman?.tag?.ExtraAttributes?.id).filter(id => id);

    let missing = {
      talismans: getMissingTalismans(talisman_ids),
      maxTalismans: getMissingTalismans(talisman_ids, "max"),
    };

    missing.talismans = organizeTalismansByRarity(missing.talismans);
    missing.maxTalismans = organizeTalismansByRarity(missing.maxTalismans);

    missing.totalMissing = missing.maxTalismans.totalMissing;

    delete missing.talismans.totalMissing;
    delete missing.maxTalismans.totalMissing;

    return missing;
  } else {
    return {
      common: [],
      uncommon: [],
      rare: [],
      epic: [],
      legendary: [],
      mythic: [],
      special: [],
      very_special: [],
      totalMissing: 0, // No missing talismans
    };
  }
};