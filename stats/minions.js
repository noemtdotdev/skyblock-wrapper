const minion_slots = require('../constants/minion_slots')

module.exports = (profile) => {
    const constants = require('../constants/minions')

    let unlocked_minions = {}
    for (const member of Object.keys(profile.members)) {
        const minions = profile.members[member]?.player_data?.crafted_generators

        if (minions) {
          for (const minion of minions) {
            const minion_level = Number(minion.replace(/\D/g, ''))
            const minion_name = minion.substring(0, minion.length - minion_level.toString().length - 1)
            if (unlocked_minions[minion_name] < minion_level || !(minion_name in unlocked_minions) || unlocked_minions[minion_name]?.tier < minion_level) {
                let found_minion = constants.minions[minion_name];
                if (found_minion) {
                    found_minion.tier = minion_level;
                    unlocked_minions[minion_name] = found_minion;
                }
            }
        
        
            }
        }
    }
    unlocked_minions = Object.values(unlocked_minions)

    let uniqueMinions = 0;
    for (const uniques of unlocked_minions) {
        uniqueMinions += uniques.tier
    }
    
    let slots = 5;
    let nextSlot = 0;
    const minionSlotKeys = Object.keys(minion_slots).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < minionSlotKeys.length; i++) {
        if (uniqueMinions > minionSlotKeys[i]) {
            slots = i + 6
            nextSlot = (minionSlotKeys[i + 1] || 0) - uniqueMinions
        }
    }

    let bonus_slots = 0;
    const community_upgrades = profile.community_upgrades?.upgrade_states || []
    for (let i = 0; i < community_upgrades.length; i++) {
        if (community_upgrades[i].upgrade === 'minion_slots' && community_upgrades[i].tier > bonus_slots) {
            bonus_slots = community_upgrades[i].tier
        }
    }

    return {
        uniqueMinions,
        minionSlots: slots,
        bonusSlots: bonus_slots,
        nextSlot,
        unlockedMinions: unlocked_minions
    }
}