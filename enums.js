export const cr_list = [
    "0", "1/8", "1/4", "1/2", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14",
    "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30"
]
// Uses adjusted CR
export const total_damage_dict = {
    "-3": 1,
    "-2": 3,
    "-1": 5,
    "0": 8,
}

export const die_types = {
    "d2": 1.5,
    "d3": 2,
    "d4": 2.5,
    "d6": 3.5,
    "d8": 4.5,
    "d10": 5.5,
    "d12": 6.5,
    "d20": 10.5,
}

async function build_enum_dict(enum_type) {
    if (enum_type === "races") {
        return {
            ...await get_json("./npc_races_base.json"),
            ...await get_json("./npc_races_monsters.json"),
            ...await get_json("./npc_races_custom.json"),
        }
    } else if (enum_type === "roles") {
        return {
            ...await get_json("./npc_roles_base.json"),
            ...await get_json("./npc_roles_custom.json"),
        }
    } else {
        console.error(`Unknown enum type: ${enum_type}`);
        return null;
    }
}

async function get_json(path) {
    const response = await fetch(path);
    return await response.json();
}

export const races = await build_enum_dict("races");
export const roles = await build_enum_dict("roles");