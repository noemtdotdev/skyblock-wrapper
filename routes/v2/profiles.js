const { makeRequest, wrap } = require("../../utils/request");
const { parseHypixel, parseProfilev2 } = require("../../utils/hypixel");
const redis = require("redis");

const client = redis.createClient();

client.on("error", (err) => {
  console.error("Redis client error:", err);
});

(async () => {
  try {
    await client.connect();
    console.log("Redis client connected successfully.");
  } catch (err) {
    console.error("Failed to connect Redis client:", err);
  }
})();

module.exports = wrap(async function (req, res) {
  let uuid = req.params.uuid.replace(/-/g, "");
  
  const cacheKeyPlayer = `player:${uuid}`;
  const cacheKeyProfile = `profiles:${uuid}`;
  
  let playerRes, profileRes;
  let museumRes;
  let gardenRes;
  let profileData;

  try {
    playerRes = await client.get(cacheKeyPlayer);
    profileRes = await client.get(cacheKeyProfile);
  } catch (err) {
    console.warn("Redis cache read failed:", err.message);
    playerRes = null;
    profileRes = null;
  }

  const cute_names = {};

  try {
    if (!playerRes) {
      const playerResponse = await makeRequest(
        res,
        `https://api.hypixel.net/player?key=${process.env.HYPIXEL_API_KEY}&uuid=${uuid}`
      );
      try {
        const cacheableData = {
          success: playerResponse.success,
          data: playerResponse.data,
          status: playerResponse.status
        };
        await client.set(cacheKeyPlayer, JSON.stringify(cacheableData), { EX: 120 });
        console.log(
          `Set cache for ${cacheKeyPlayer} with expiration of 120 seconds`
        );
      } catch (err) {
        console.warn("Redis cache write failed:", err.message);
      }
      playerRes = playerResponse;
    } else {
      playerRes = JSON.parse(playerRes);
    }

    const playerData = playerRes.data || playerRes;
    
    if (playerRes.success === false || playerData.success === false) {
      const errorCause = playerRes.cause || playerData.cause || "Unknown error";
      console.error("Hypixel API error:", errorCause);
      return res
        .status(400)
        .json({ status: 400, message: `Hypixel API error: ${errorCause}` });
    }
    
    if (!playerData || typeof playerData !== 'object') {
      console.error("Invalid player data structure:", playerData);
      return res
        .status(500)
        .json({ status: 500, message: "Invalid player data received." });
    }

    if (!profileRes) {
      const profileResponse = await makeRequest(
        res,
        `https://api.hypixel.net/v2/skyblock/profiles?key=${process.env.HYPIXEL_API_KEY}&uuid=${uuid}`
      );
      
      try {
        const cacheableData = {
          success: profileResponse.success,
          data: profileResponse.data,
          status: profileResponse.status
        };
        await client.set(cacheKeyProfile, JSON.stringify(cacheableData), {
          EX: 120,
        });
        console.log(
          `Set cache for ${cacheKeyProfile} with expiration of 120 seconds`
        );
      } catch (err) {
        console.warn("Redis cache write failed:", err.message);
      }
      profileRes = profileResponse;
    } else {
      profileRes = JSON.parse(profileRes);
      console.log("Loaded profile data from cache, type:", typeof profileRes, "has data:", !!profileRes?.data);
    }

    profileData = profileRes.data || profileRes;
    
    if (profileRes.success === false || profileData.success === false) {
      const errorCause = profileRes.cause || profileData.cause || "Unknown error";
      console.error("Hypixel API error:", errorCause);
      return res
        .status(400)
        .json({ status: 400, message: `Hypixel API error: ${errorCause}` });
    }
    
    if (!profileData || !profileData.profiles || !Array.isArray(profileData.profiles)) {
      console.error("Invalid profile data structure:", profileData);
      return res
        .status(500)
        .json({ status: 500, message: "Invalid profile data received." });
    }

    let profileUuid;
    try {
      for (const profile of profileData.profiles) {
        if (profile?.selected === true) {
          profileUuid = profile.profile_id;
          break;
        }
      }
    } catch (err) {
      console.error("Error finding selected profile:", err);
      return res
        .status(500)
        .json({ status: 500, message: "User has no selected profile." });
    }

    const cacheKeyMuseum = `museum:${profileUuid}`;
    const cacheKeyGarden = `garden:${profileUuid}`;

    try {
      museumRes = await client.get(cacheKeyMuseum);
      gardenRes = await client.get(cacheKeyGarden);
    } catch (err) {
      console.warn("Redis cache read failed:", err.message);
      museumRes = null;
      gardenRes = null;
    }

    if (!museumRes) {
      const museumResponse = await makeRequest(
        res,
        `https://api.hypixel.net/v2/skyblock/museum?key=${process.env.HYPIXEL_API_KEY}&profile=${profileUuid}`
      );
      if (museumResponse.status === 404) {
        museumRes = {};
      } else {
        try {
          const cacheableData = {
            success: museumResponse.success,
            data: museumResponse.data,
            status: museumResponse.status
          };
          await client.set(cacheKeyMuseum, JSON.stringify(cacheableData), {
            EX: 120,
          });
          console.log(
            `Set cache for ${cacheKeyMuseum} with expiration of 120 seconds`
          );
        } catch (err) {
          console.warn("Redis cache write failed:", err.message);
        }
        museumRes = museumResponse;
      }
    } else {
      museumRes = JSON.parse(museumRes);
    }

    if (!gardenRes) {
      const gardenResponse = await makeRequest(
        res,
        `https://api.hypixel.net/v2/skyblock/garden?key=${process.env.HYPIXEL_API_KEY}&profile=${profileUuid}`
      );
      if (gardenResponse.status === 404) {
        gardenRes = {};
      } else {
        try {
          const cacheableData = {
            success: gardenResponse.success,
            data: gardenResponse.data,
            status: gardenResponse.status
          };
          await client.set(cacheKeyGarden, JSON.stringify(cacheableData), {
            EX: 120,
          });
          console.log(
            `Set cache for ${cacheKeyGarden} with expiration of 120 seconds`
          );
        } catch (err) {
          console.warn("Redis cache write failed:", err.message);
        }
        gardenRes = gardenResponse;
      }
    } else {
      gardenRes = JSON.parse(gardenRes);
    }
  } catch (err) {
    console.error("API request error:", err);
    return res
      .status(500)
      .json({ status: 500, message: err.message || "Internal server error" });
  }

  try {
    if (profileData && profileData.profiles && Array.isArray(profileData.profiles)) {
      for (const profile of profileData.profiles) {
        cute_names[profile.cute_name] = profile?.game_mode || "normal";
      }
    }
  } catch (err) {
    console.error("Error processing profile names:", err);
    return res
      .status(500)
      .json({ status: 500, message: "User has no profiles." });
  }

  const player = parseHypixel(playerRes, uuid, res);
  const profile = await parseProfilev2(
    player,
    profileRes,
    uuid,
    null,
    res,
    museumRes,
    gardenRes
  );

  return res
    .status(200)
    .json({ status: 200, data: profile, profiles: cute_names });
});
