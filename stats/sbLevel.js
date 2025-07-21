module.exports = function getSBLevel(profile) {
    const experience = profile.leveling?.experience || 0;
    const sbLevel = experience / 100;
    return sbLevel;
};
