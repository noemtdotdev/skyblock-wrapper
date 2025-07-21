const { trophy_fish } = require("../constants/trophyFish.js");

module.exports = (profile) => {
  const netherData = profile.nether_island_player_data;
  const trophyFishData = profile.trophy_fish;

  return {
    kuudra: netherData ? netherData.kuudra_completed_tiers : {},
    dojo: netherData && netherData.dojo && typeof netherData.dojo === 'object' && Object.keys(netherData.dojo).length > 0 ? netherData.dojo : DOJO_CLEAN,
    abiphone: netherData ? netherData.abiphone : {},
    matriarch: netherData ? netherData.matriarch : {},
    factions: {
      name: netherData ? netherData.selected_faction : {},
      barbarians_reputation: netherData ? netherData.barbarians_reputation : 0,
      mages_reputation: netherData ? netherData.mages_reputation : 0,
    },
    trophy_fish: {
      level: trophyFishData && trophyFishData.rewards ? formatTrophyFishRank(trophyFishData.rewards.length) : 0,
      total_caught: trophyFishData ? trophyFishData.total_caught : 0,
      fish: trophyFishData && Object.keys(trophyFishData).length > 3 ? formatTrophyFish(trophyFishData) : trophy_fish,
    },
  };
};

function formatTrophyFishRank(points) {
  if (points === 1) return "Novice Trophy Fisher (Bronze)";
  if (points === 2) return "Adept Trophy Fisher (Silver)";
  if (points === 3) return "Trophy Fisher (Gold)";
  if (points === 4) return "Master Trophy Fisher (Diamond)";
  return "None";
}

const DOJO_CLEAN = {
  dojo_points_mob_kb: 0,
  dojo_time_mob_kb: 0,
  dojo_points_wall_jump: 0,
  dojo_time_wall_jump: 0,
  dojo_points_archer: 0,
  dojo_time_archer: 0,
  dojo_points_sword_swap: 0,
  dojo_time_sword_swap: 0,
  dojo_points_snake: 0,
  dojo_time_snake: 0,
  dojo_points_fireball: 0,
  dojo_time_fireball: 0,
  dojo_points_lock_head: 0,
  dojo_time_lock_head: 0
}

function formatTrophyFish(calculated) {
  const output = {};
  for (const key of Object.keys(calculated).filter((key) => ["rewards", "total_caught"].includes(key) === false)) {
    const ID = key.replace("_bronze", "").replace("_silver", "").replace("_gold", "").replace("_diamond", "").toUpperCase();

    // Skip this iteration if trophy_fish[ID] does not exist to avoid TypeError
    if (!trophy_fish[ID]) {
      console.warn(`Warning: Trophy fish ID '${ID}' not found in trophy_fish constants.`);
      continue;
    }

    if (output[ID] !== undefined) continue;

    output[ID] = {
      name: trophy_fish[ID].name,
      id: ID,
      description: trophy_fish[ID].description,
      total: calculated[key],
      bronze: calculated[`${key}_bronze`] || 0, // Ensure fallback to 0 if undefined
      silver: calculated[`${key}_silver`] || 0, // Ensure fallback to 0 if undefined
      gold: calculated[`${key}_gold`] || 0, // Ensure fallback to 0 if undefined
      diamond: calculated[`${key}_diamond`] || 0, // Ensure fallback to 0 if undefined
    }
  }

  return output;
}
