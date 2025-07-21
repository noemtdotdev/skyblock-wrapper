//CREDIT: https://github.com/Senither/hypixel-skyblock-facade (Modified)
const getRank = require("../stats/rank");
const getHypixelLevel = require("../stats/hypixelLevel");
const getSkills = require("../stats/skills");
const getCakebag = require("../stats/cakebag");
const getMinions = require("../stats/minions");
const getSlayer = require("../stats/slayer");
const getTalismans = require("../stats/talismans");
const getCollections = require("../stats/collections");
const getFarming = require("../stats/farming");
const getMining = require("../stats/mining");
const getDungeons = require("../stats/dungeons.js");
const getCrimson = require("../stats/crimson.js");
const getMissing = require("../stats/missing");
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

    const [networth, notCosmeticNetworth, missing, talismans] =
      await Promise.all([
        networthManager.getNetworth(),
        networthManager.getNonCosmeticNetworth(),
        getMissing(profile),
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
      discord: player.discord,
      sbLevel: getSBLevel(profile),
      isIronman: profileData?.game_mode === "ironman" ? true : false,
      selected: profileData.selected ?? false,
      gamemode: profileData?.game_mode || "normal",
      skills: getSkills(profile),
      networth: networth,
      dungeons: getDungeons(player, profile, player.dungeons?.secrets),
      crimson: getCrimson(profile),
      farming: getFarming(player, profile),
      mining: getMining(player, profile),
      slayer: getSlayer(profile),
      missing: missing,
      talismans: talismans,
      collections: getCollections(profileData),
      minions: getMinions(profileData),
      garden: gardenRes?.garden ?? {},
      factory: profile?.events?.easter ?? {},
    };
  },

  parseProfilev2: async function parseProfilev2(player, profileResponse, uuid, profileid, res, museumResponse, gardenResponse) {
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

    const [networth, notCosmeticNetworth, missing, talismans] =
      await Promise.all([
        networthManager.getNetworth(),
        networthManager.getNonCosmeticNetworth(),
        getMissing(profile),
        getTalismans(profile),
        getCakebag(profile),
      ]);

      networth.cosmeticNetworth = networth.networth - notCosmeticNetworth.networth;
      delete networth.noInventory;
      delete networth.isNonCosmetic;

      networth.liquid = {
        bank: networth.bank,
        purse: networth.purse,
        personalBank: networth.personalBank,
        total: networth.bank + networth.purse + networth.personalBank,
      }

      delete networth.bank;
      delete networth.purse;
      delete networth.personalBank;

      networth.itemTypes = networth.types;
      delete networth.types;

      return {

      accountInfo: {
        username: player.name,
        uuid: uuid,
        playerRank: player.rank,
        linkedDiscord: player.discord,
      },
      profileInfo: {
        cuteName: profileData.cute_name,
        profileId: profileData.profile_id,
        gamemode: profileData?.game_mode || "normal",
        isIronman: profileData?.game_mode === "ironman" ? true : false,
        isStranded: profileData?.game_mode === "stranded" ? true : false,
        isSelected: profileData.selected ?? false,
      },

      networth: networth,

      sbLevel: getSBLevel(profile),
      skills: getSkills(profile),
      dungeons: getDungeons(player, profile, player.dungeons?.secrets),
      crimson: getCrimson(profile),
      farming: getFarming(player, profile),
      mining: getMining(player, profile),
      slayer: getSlayer(profile),
      missing: missing,
      talismans: talismans,
      collections: getCollections(profileData),
      minions: getMinions(profileData),
      garden: gardenRes?.garden ?? {},
      factory: profile?.events?.easter ?? {},
    };
  }
};
