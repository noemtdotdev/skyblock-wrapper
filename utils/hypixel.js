//CREDIT: https://github.com/Senither/hypixel-skyblock-facade (Modified)
const getRank = require("../stats/rank");
const getHypixelLevel = require("../stats/hypixelLevel");
const getSkills = require("../stats/skills");
const getMilestones = require("../stats/milestones");
const getCakebag = require("../stats/cakebag");
const getMinions = require("../stats/minions");
const getSlayer = require("../stats/slayer");
const getKills = require("../stats/kills");
const getDeaths = require("../stats/deaths");
const getPets = require("../stats/pets");
const getBingo = require("../stats/bingo");
const getEquipment = require("../stats/equipment");
const getArmor = require("../stats/armor");
const getTalismans = require("../stats/talismans");
const getCollections = require("../stats/collections");
const getEnchanting = require("../stats/enchanting");
const getFarming = require("../stats/farming");
const getMining = require("../stats/mining");
const getDungeons = require("../stats/dungeons.js");
const getCrimson = require("../stats/crimson.js");
const getWeight = require("../stats/weight");
const getMissing = require("../stats/missing");
const getBestiary = require("../stats/bestiary");
const getContent = require("../stats/items");
const getSBLevel = require("../stats/sbLevel");
const { isUuid } = require("./uuid");
const { ProfileNetworthCalculator, getPrices } = require('skyhelper-networth');

let prices = {};
getPrices().then((data) => {
  prices = data;
});
setInterval(async () => {
  prices = await getPrices();
}, 1000 * 60 * 5); // 5 minutes

module.exports = {
  parseHypixel: function parseHypixel(playerResponse, uuid, res) {
    const playerRes = playerResponse.data || playerResponse;

    if (playerRes.hasOwnProperty("player") && playerRes.player == null) {
      return res.status(404).json({
        status: 404,
        reason: `Found no Player data for a user with a UUID of '${uuid}'`,
      });
    }
    const data = playerRes.player;

    const achievements = data?.achievements || {};

    return {
      name: data.displayname,
      rank: getRank(data),
      hypixelLevel: getHypixelLevel(data),
      karma: data.karma,
      discord: data.socialMedia && data.socialMedia.links && data.socialMedia.links.DISCORD ? data.socialMedia.links.DISCORD : 'NA',
      skills: {
        mining: achievements?.skyblock_excavator || 0,
        foraging: achievements?.skyblock_gatherer || 0,
        enchanting: achievements?.skyblock_augmentation || 0,
        farming: achievements?.skyblock_harvester || 0,
        combat: achievements?.skyblock_combat || 0,
        fishing: achievements?.skyblock_angler || 0,
        alchemy: achievements?.skyblock_concoctor || 0,
        taming: achievements?.skyblock_domesticator || 0,
      },
      dungeons: {
        secrets: achievements?.skyblock_treasure_hunter || 0,
      },
    };
  },
  parseProfile: async function parseProfile(player, profileResponse, uuid, profileid, res, museumResponse, gardenResponse) {
    const profileRes = profileResponse.data || profileResponse;
    const museumRes = museumResponse?.data || museumResponse;
    const gardenRes = gardenResponse?.data || gardenResponse;
    
    if (profileRes.hasOwnProperty("profiles") && profileRes.profiles == null) {
      return res.status(404).json({
        status: 404,
        reason: profileid ? 
          `Found no SkyBlock profiles for a user with a UUID of '${uuid}' and profile of '${profileid}'` :
          `Found no SkyBlock profiles for a user with a UUID of '${uuid}'.`,
      });
    }

    let profileData;
    
    if (profileid) {
      if (!isUuid(profileid)) {
        for (const profile of profileRes?.profiles || []) {
          if (profile.cute_name.toLowerCase() === profileid.toLowerCase()) {
            profileid = profile.profile_id;
            break;
          }
        }
      }

      profileData = profileRes.profiles.find((a) => a.profile_id === profileid);
      if (!profileData) {
        return res.status(404).json({
          status: 404,
          reason: `Found no SkyBlock profiles for a user with a UUID of '${uuid}' and profile of '${profileid}'`,
        });
      }
    } else {
      // If no profileid provided, find selected profile
      profileData = profileRes.profiles.find((profile) => 
        profile.selected && Object.keys(profile.members).includes(uuid)
      );
      
      if (!profileData) {
        return res.status(404).json({
          status: 404,
          reason: `Found no selected SkyBlock profile for a user with a UUID of '${uuid}'.`,
        });
      }
    }

    if (!Object.keys(profileData.members).includes(uuid)) {
      return res.status(404).json({
        status: 404,
        reason: `Found no SkyBlock profiles for a user with a UUID of '${uuid}'`,
      });
    }

    const profile = profileData.members[uuid];
    const museum = museumRes?.members[uuid];

    const bankBalance = profileData?.banking?.balance || 0;
    const networthManager = new ProfileNetworthCalculator(profile, museum, bankBalance);

    const [networth, notCosmeticNetworth, weight, missing, armor, equipment, talismans, cakebag] =
      await Promise.all([
        networthManager.getNetworth(),
        networthManager.getNonCosmeticNetworth(),
        getWeight(profile, uuid),
        getMissing(profile),
        getArmor(profile),
        getEquipment(profile),
        getTalismans(profile),
        getCakebag(profile),
      ]);

    networth.cosmeticTotal = networth.networth - notCosmeticNetworth.networth;
    return {
      username: player.name,
      uuid: uuid,
      name: profileData.cute_name,
      id: profileData.profile_id,
      rank: player.rank,
      hypixelLevel: player.hypixelLevel,
      karma: player.karma,
      discord: player.discord,
      sbLevel: getSBLevel(profile),
      isIronman: profileData?.game_mode === "ironman" ? true : false,
      selected: profileData.selected ?? false,
      gamemode: profileData?.game_mode || "normal",
      last_save: profile.last_save,
      first_join: profile.first_join,
      last_join: profile.last_join,
      fairy_souls: profile.fairy_souls_collected || 0,
      purse: profile.coin_purse || 0,
      skyblock_level: profile.experience_skill_skyblock || 0,
      bank: profileData.banking?.balance || 0,
      skills: getSkills(profile),
      networth: networth,
      weight: weight,
      bestiary: getBestiary(profile),
      dungeons: getDungeons(player, profile, player.dungeons?.secrets),
      crimson: getCrimson(profile),
      enchanting: getEnchanting(player, profile),
      farming: getFarming(player, profile),
      mining: getMining(player, profile),
      slayer: getSlayer(profile),
      milestones: getMilestones(profile),
      missing: missing,
      kills: getKills(profile),
      deaths: getDeaths(profile),
      armor: armor,
      equipment: equipment,
      pets: getPets(profile),
      talismans: talismans,
      collections: getCollections(profileData),
      minions: getMinions(profileData),
      cakebag: cakebag,
      garden: gardenRes?.garden ?? {},
      factory: profile?.events?.easter ?? {},
    };
  },
  parseProfiles2: async function parseProfile(player, profileRes, uuid, res) {
    if (profileRes.hasOwnProperty("profiles") && profileRes.profiles == null) {
      return res.status(404).json({
        status: 404,
        reason: `Found no SkyBlock profiles for a user with a UUID of '${uuid}'.`,
      });
    }

    const result = [];

    for (const profileData of profileRes.data.profiles) {
      if (!Object.keys(profileData.members).includes(uuid)) {
        continue;
      }
      const profile = profileData.members[uuid];
      const [networth, weight, missing, armor, equipment, talismans, cakebag] =
        await Promise.all([
          getNetworth(profile, profileData?.banking?.balance, { prices, v2Endpoint: true }),
          getWeight(profile, uuid),
          getMissing(profile),
          getArmor(profile),
          getEquipment(profile),
          getTalismans(profile),
          getCakebag(profile),
        ]);

      result.push({
        username: player.name,
        uuid: uuid,
        name: profileData.cute_name,
        id: profileData.profile_id,
        rank: player.rank,
        hypixelLevel: player.hypixelLevel,
        karma: player.karma,
        sbLevel: getSBLevel(profile),
        isIronman: profileData?.game_mode === "ironman" ? true : false,
        selected: profileData.selected ?? false,
        gamemode: profileData?.game_mode || "normal",
        last_save: profile.last_save,
        first_join: profile.first_join,
        fairy_souls: profile.fairy_souls_collected || 0,
        purse: profile.coin_purse || 0,
        bank: profileData.banking?.balance || 0,
        skills: getSkills(profile),
        networth: networth,
        weight: weight,
        bestiary: getBestiary(profile),
        dungeons: getDungeons(player, profile),
        crimson: getCrimson(profile),
        enchanting: getEnchanting(player, profile),
        farming: getFarming(player, profile),
        mining: getMining(player, profile),
        slayer: getSlayer(profile),
        milestones: getMilestones(profile),
        missing: missing,
        kills: getKills(profile),
        deaths: getDeaths(profile),
        armor: armor,
        equipment: equipment,
        pets: getPets(profile),
        talismans: talismans,
        collections: getCollections(profileData),
        minions: getMinions(profileData),
        cakebag: cakebag,
      });
    }
    if (result.length == 0)
      return res.status(404).json({
        status: 404,
        reason: `Found no SkyBlock profiles for a user with a UUID of '${uuid}'.`,
      });
    return result.sort((a, b) => b.selected - a.selected);
  },



  parseProfileItems: async function parseProfileItems(
    player,
    profileRes,
    uuid,
    profileid,
    res
  ) {
    if (
      profileRes.hasOwnProperty("profiles") &&
      profileRes.profiles == null
    ) {
      return res.status(404).json({
        status: 404,
        reason: `Found no SkyBlock profiles for a user with a UUID of '${uuid}' and profile of '${profileid}'`,
      });
    }

    if (!isUuid(profileid)) {
      for (const profile of profileRes?.profiles || []) {
        if (profile.cute_name.toLowerCase() === profileid.toLowerCase()) {
          profileid = profile.profile_id;
        }
      }
    }

    const profileData = profileRes.profiles.find(
      (a) => a.profile_id === profileid
    );
    if (!profileData) {
      return res.status(404).json({
        status: 404,
        reason: `Found no SkyBlock profiles for a user with a UUID of '${uuid}' and profile of '${profileid}'`,
      });
    }

    if (!Object.keys(profileData.members).includes(uuid)) {
      return res.status(404).json({
        status: 404,
        reason: `Found no SkyBlock profiles for a user with a UUID of '${uuid}'`,
      });
    }

    const profile = profileData.members[uuid];

    return {
      username: player.name,
      uuid: uuid,
      name: profileData.cute_name,
      id: profileData.profile_id,
      selected: profileData.selected ?? false,
      data: await getContent(profile),
    };
  },

  parseProfilesItems: async function parseProfileItems(
    player,
    profileRes,
    uuid,
    res
  ) {
    if (
      profileRes.hasOwnProperty("profiles") &&
      profileRes.profiles == null
    ) {
      return res.status(404).json({
        status: 404,
        reason: `Found no SkyBlock profiles for a user with a UUID of '${uuid}'.`,
      });
    }

    const result = [];

    for (const profileData of profileRes.profiles) {
      if (!Object.keys(profileData.members).includes(uuid)) {
        continue;
      }
      const profile = profileData.members[uuid];

      result.push({
        username: player.name,
        uuid: uuid,
        name: profileData.cute_name,
        id: profileData.profile_id,
        selected: profileData.selected ?? false,
        data: await getContent(profile),
      });
    }
    if (result.length == 0)
      res.status(404).json({
        status: 404,
        reason: `Found no SkyBlock profiles for a user with a UUID of '${uuid}'.`,
      });
    return result.sort((a, b) => b.selected - a.selected);
  },
  parseBingoProfile: function parseBingoProfile(profile, bingo, uuid) {
    return {
      uuid: uuid,
      profile: getBingo(profile, bingo.data),
    };
  },
};
