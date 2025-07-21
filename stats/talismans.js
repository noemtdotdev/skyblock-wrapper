const { decodeData } = require("../utils/nbt");
const { capitalize } = require("../constants/functions");
const { talismans: allTalismans } = require("../constants/talismans");

const MAGICAL_POWER = {
  common: 3,
  uncommon: 5,
  rare: 8,
  epic: 12,
  legendary: 16,
  mythic: 22,
  special: 3,
  very: 5,
};

function getMagicalPower(rarity = "", id = null) {
  try {
    if (id === "HEGEMONY_ARTIFACT") {
      return rarity.toLowerCase() === "legendary" ? 32 : 44;
    }
    return MAGICAL_POWER[rarity.toLowerCase()] ?? 0;
  } catch (e) {
    return 0;
  }
}

function getRarity(lore) {
  let last_index = lore[lore.length - 1];
  last_index = last_index.replace(/\u00A7[0-9A-FK-OR]/gi, "").toLowerCase();
  if (last_index.startsWith("a ")) last_index = last_index.substring(2);
  last_index = last_index.substring(0, last_index.indexOf(" "));
  return last_index;
}

module.exports = async (profile) => {
  let totalMagicalPower = 0; // Initialize total magical power

  if (profile.inventory?.bag_contents?.talisman_bag?.data) {
    const talisman_bag = (await decodeData(Buffer.from(profile.inventory?.bag_contents?.talisman_bag?.data, "base64"))).i;
    const talismans = {
      talismanBagUpgrades: profile?.accessory_bag_storage?.bag_upgrades_purchased,
      currentReforge: profile?.accessory_bag_storage?.selected_power,
      unlockedReforges: profile?.accessory_bag_storage?.unlocked_powers,
      tuningsSlots: profile?.accessory_bag_storage?.tuning?.highest_unlocked_slot,
      tunings: profile?.accessory_bag_storage?.tuning,
      common: [],
      uncommon: [],
      rare: [],
      epic: [],
      legendary: [],
      mythic: [],
      special: [],
      very: [],
    };
    delete talismans?.tunings?.highest_unlocked_slot;

    talisman_bag.forEach(talisman => {
      if (talisman.tag?.display.Name && talisman.tag?.ExtraAttributes) {
        const name = talisman.tag?.display.Name.replace(/\u00A7[0-9A-FK-OR]/gi, "") || null;
        const reforge = capitalize(talisman.tag?.ExtraAttributes.modifier || null);
        const isRecombed = talisman.tag?.ExtraAttributes.rarity_upgrades > 0;
        const rarity = getRarity(talisman.tag?.display.Lore).toUpperCase();
        const id = talisman.tag?.ExtraAttributes.id || null;
        const mp = getMagicalPower(rarity, id);

        totalMagicalPower += mp; // Accumulate total magical power

        const newTalisman = {
          name: allTalismans[id]?.name || name,
          id,
          reforge,
          rarity,
          recombobulated: isRecombed,
          mp,
        };

        // Add to respective rarity list
        if (!talismans[rarity.toLowerCase()]) {
          talismans[rarity.toLowerCase()] = [newTalisman];
        } else {
          talismans[rarity.toLowerCase()].push(newTalisman);
        }
      }
    });

    talismans.totalMagicalPower = totalMagicalPower; // Assign calculated total magical power

    return talismans;
  } else {
    return {
      common: [],
      uncommon: [],
      rare: [],
      epic: [],
      legendary: [],
      mythic: [],
      special: [],
      very: [],
      totalMagicalPower: 0,
    };
  }
};
