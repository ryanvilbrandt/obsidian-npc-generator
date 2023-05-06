import { cr_list, total_damage_dict, die_types, races, roles } from "./enums.js";

console.debug(races);
console.debug(roles);

function create_npc(cr=null, level=null, race="", role="", damage_die_type="", kwargs={}) {
    // Meant to be used with encounter calculators like https://kastark.co.uk/rpgs/encounter-calculator-5th/
    if (race === "")
        race = "Human";
    // Allow "hp" as a valid kwarg
    if ("hp" in kwargs)
        kwargs["hit_points"] = kwargs["hp"];
    let name;
    if ("name" in kwargs)
        name = kwargs["name"];
    else
        name = `the ${race.toLowerCase()}`;
    const normalized_cr = get_normalized_cr(cr, level);
    const cr_values = get_cr_values(normalized_cr);
    const atk_dict = get_attack(normalized_cr, race, role);
    const def_dict = get_defense(normalized_cr, race, role);
    const num_attacks = adjust(atk_dict["num_attacks"], kwargs["num_attacks"]);
    const total_damage = Math.floor(adjust(atk_dict["total_damage"], kwargs["total_damage"]));
    const damage = get_dmg_value(total_damage, num_attacks, damage_die_type);
    const double_damage = get_dmg_value(total_damage * 2, 1, "");
    const triple_damage = get_dmg_value(total_damage * 3, 1, "");
    const save_dc = atk_dict["save_dc"];
    const special_abilities = adjust(
        fill_placeholders(get_list(race, role, "special_abilities"), damage, double_damage, triple_damage, save_dc, name),
        kwargs["special_abilities"]
    );
    const bonus_actions = adjust(
        fill_placeholders(get_list(race, role, "bonus_actions"), damage, double_damage, triple_damage, save_dc, name),
        kwargs["bonus_actions"]
    );
    const actions = adjust(
        fill_placeholders(get_list(race, role, "actions"), damage, double_damage, triple_damage, save_dc, name),
        kwargs["actions"]
    );
    const reactions = adjust(
        fill_placeholders(get_list(race, role, "reactions"), damage, double_damage, triple_damage, save_dc, name),
        kwargs["reactions"]
    );
    const villain_actions = adjust(
        fill_placeholders(get_list(race, role, "villain_actions"), damage, double_damage, triple_damage, save_dc, name),
        kwargs["villain_actions"]
    );
    return {
        "cr": cr,
        "level": level,
        "race": race,
        "role": role,
        "speed": adjust(get_speed(races[race]), kwargs["speed"]),
        "stat_bonus": adjust(cr_values["stat_bonus"], kwargs["stat_bonus"]),
        "prof_bonus": adjust(cr_values["prof_bonus"], kwargs["prof_bonus"]),
        "armor_class": adjust(def_dict["ac"], kwargs["armor_class"]),
        "hit_points": adjust(def_dict["hp"], kwargs["hit_points"]),
        "damage_resistances": adjust(get_trait(race, role, "damage_resistances"), kwargs["damage_resistances"]),
        "damage_immunities": adjust(get_trait(race, role, "damage_immunities"), kwargs["damage_immunities"]),
        "damage_vulnerabilities": adjust(get_trait(race, role, "damage_vulnerabilities"), kwargs["damage_vulnerabilities"]),
        "senses": adjust(get_trait(race, role, "senses"), kwargs["senses"]),
        "special_abilities": special_abilities,
        "bonus_actions": bonus_actions,
        "actions": actions,
        "reactions": reactions,
        "villain_actions": villain_actions,
        "attack": adjust(atk_dict["attack"], kwargs["attack"]),
        "damage": adjust(damage, kwargs["damage"]),
        "double_damage": double_damage,
        "triple_damage": triple_damage,
        "save_dc": adjust(save_dc, kwargs["save_dc"]),
        "num_attacks": num_attacks,
    };
}


function get_cr_values(normalized_cr) {
    // Using equations from http://blogofholding.com/?p=7338
    const total_damage = total_damage_dict[normalized_cr] || 5 * (normalized_cr + 1);
    const s = 2 + Math.floor(normalized_cr / 4);
    const good_save = 4 + Math.floor(normalized_cr / 2);
    return {
        "stat_bonus": s,
        "prof_bonus": good_save - s,
        "ac": 13 + Math.floor(normalized_cr / 3),
        "hp": total_damage * 3,
        "attack": 4 + Math.floor(normalized_cr / 2),
        "total_damage": total_damage,
        "save_dc": 11 + Math.floor(normalized_cr / 2),
        "num_attacks": Math.floor((normalized_cr - 1) / 5) + 2,
    };
}


function get_normalized_cr(cr, level = null) {
    // Adjusts "0", "1/8", "1/4", and "1/2" to -3, -2, -1, and 0 respectively
    if (level !== null)
        return Math.floor(level) - 3;
    const c = ["0", "1/8", "1/4", "1/2"];
    if (c.includes(cr.toString()))
       return c.indexOf(cr.toString()) - 3;
    return Math.floor(cr)
}


function get_speed(d) {
    if ("speed" in d)
        return d["speed"];
    return "30 ft.";
}


function get_attack(cr, race, role) {
    return get_adjusted_cr_values(cr, race, role, "atk_cr", ["num_attacks"]);
}


function get_defense(cr, race, role) {
    return get_adjusted_cr_values(cr, race, role, "def_cr", ["ac"]);
}


function get_adjusted_cr_values(cr, race, role, key, extra_keys = null) {
    cr = adjust_cr(cr, races[race][key] || 0);
    cr = adjust_cr(cr, roles[role][key] || 0);
    const cr_values = get_cr_values(cr);
    if (extra_keys) {
        for (const extra_key in extra_keys) {
            cr_values[extra_key] = adjust(cr_values[extra_key], races[race][extra_key]);
            cr_values[extra_key] = adjust(cr_values[extra_key], roles[role][extra_key]);
        }
    }
    return cr_values
}


function adjust_cr(cr, adjustment) {
    if (adjustment === 0)
        return cr;
    cr += adjustment;
    if (cr < -3)
        return -3;
    if (cr > 30)
        return 30;
    return cr;
}


function get_trait(race, role, key) {
    return get_list(race, role, key).join(",");
}


function fill_placeholders(ability_list, damage, double_damage, triple_damage, save_dc, name) {
    for (let i = 0; i < ability_list.length; i++) {
        ability_list[i] = ability_list[i].replace("{damage}", damage);
        ability_list[i] = ability_list[i].replace("{double_damage}", double_damage);
        ability_list[i] = ability_list[i].replace("{triple_damage}", triple_damage);
        ability_list[i] = ability_list[i].replace("{save_dc}", save_dc);
        ability_list[i] = ability_list[i].replace("{name}", name);
        ability_list[i] = ability_list[i].replace("{Name}", toTitleCase(name));
    }
    return ability_list;
}

function toTitleCase(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function get_list(race, role, key) {
    let item_list = [];
    let d = races[race];
    if (key in d)
        item_list += d[key];
    d = roles[role];
    if (key in d)
        item_list += d[key];
    return item_list;
}


function get_dmg_value(value, num_attacks, die_type) {
    const avg_damage = Math.round(value / Math.floor(num_attacks));
    console.debug(`Inputs: ${value} | ${num_attacks} | ${Math.floor(num_attacks)} | ${value / Math.floor(num_attacks)} | ${avg_damage}`);
    // print(f"Average damage: {avg_damage}")
    let die_avg;
    if (die_type === "")
        die_avg = 3.5;  // Default to d6
    else
        die_avg = die_types[die_type];
    // print(f"Die type: {die_type}")
    // print(f"Die average: {die_avg}")
    let num_dice = Math.floor(avg_damage / die_avg);  // Number of d6s
    // print(f"Num dice: {num_dice}")
    if (num_dice === 0) {
        if (die_type === "") {  // If die_type is undefined and the damage is too small, allow us to drop to d4
            die_type = "d4";
            die_avg = 2.5;
            num_dice = Math.floor(avg_damage / die_avg);  // Number of d4s
        }
        if (num_dice === 0)
            num_dice = 1;  // Always roll a minimum of 1 die, and let the modifier be negative
        // print(f"Num dice: {num_dice}")
    }
    if (die_type === "")
        die_type = "d6";
    let mod = avg_damage - num_dice * die_avg;
    mod = mod >= 0 ? Math.floor(mod) : Math.ceil(mod);
    console.debug(`Stuff: ${avg_damage} | ${num_dice} | ${die_avg} | ${mod}`);
    if (mod === 0)
        return `${avg_damage} (${num_dice}${die_type})`;
    else if (mod > 0)
        return `${avg_damage} (${num_dice}${die_type} + ${mod})`;
    else
        return `${avg_damage} (${num_dice}${die_type} - ${Math.abs(mod)})`;
}


function adjust(value, adjustment) {
    // If adjustment isn't defined, just return value
    if (adjustment === null || adjustment === undefined)
        return value;
    // If value is a list, assume adjustment is a list and concat them
    if (Array.isArray(value))
        return value.concat(adjustment);
    // If value is a dict, assume adjustment is a dict and merge them
    if (typeof value === "object") {
        console.error("object adjustment is not yet supported");
        return value;
    }
    // let value = value.copy()
    // value.update(adjustment)
    // return value
    try {
        value = Number(value);
    } catch {
    }
    // If the adjustment is a string, try to process it like a number
    if (typeof adjustment === "string") {
        if (adjustment.charAt(0) === "+" || adjustment.charAt(0) === "-")
            return (value + Number(adjustment)).toString();
        if (adjustment.charAt(0) === "x")
            return (Math.floor(value * Number(adjustment.slice(1)))).toString();
        if (adjustment.charAt(0) === "/")
            return (Math.floor(value / Number(adjustment.slice(1)))).toString();
    }
    if (typeof adjustment === "number")
        return adjustment.toString();
    return adjustment;
}


// Unit Tests

function assertEqual(actual, expected) {
    if (typeof actual === "object" && typeof expected === "object") {
        const actual_string = JSON.stringify(actual);
        const expected_string = JSON.stringify(expected);
        if (actual_string !== expected_string)
            console.error(`${actual_string} (type=${typeof actual}) != ${expected_string} (type=${typeof expected})`);
        return
    }
    if (Array.isArray(actual) && Array.isArray(expected)) {
        if (!actual.every((val, idx) => val === expected[idx]))
            console.error(`${actual} (type=${typeof actual}) != ${expected} (type=${typeof expected})`);
        return;
    }
    if (actual !== expected)
        console.error(`${actual} (type=${typeof actual}) != ${expected} (type=${typeof expected})`);
}

export function run_tests() {
    assertEqual(adjust_cr(-3, 1), -2);
    assertEqual(adjust_cr(-3, 2), -1);
    assertEqual(adjust_cr(-3, 3), 0);
    assertEqual(adjust_cr(-3, 4), 1);
    assertEqual(adjust_cr(-3, 5), 2);
    assertEqual(adjust_cr(29, 5), 30);
    assertEqual(adjust_cr(2, 0), 2);
    assertEqual(adjust_cr(2, -1), 1);
    assertEqual(adjust_cr(2, -2), 0);
    assertEqual(adjust_cr(2, -3), -1);
    assertEqual(adjust_cr(2, -4), -2);
    assertEqual(adjust_cr(2, -5), -3);
    assertEqual(adjust_cr(2, -6), -3);

    assertEqual(get_normalized_cr("0"), -3);
    assertEqual(get_normalized_cr("1/8"), -2);
    assertEqual(get_normalized_cr("1/4"), -1);
    assertEqual(get_normalized_cr("1/2"), 0);
    assertEqual(get_normalized_cr("1"), 1);
    assertEqual(get_normalized_cr("2"), 2);
    assertEqual(get_normalized_cr("3"), 3);
    assertEqual(get_normalized_cr(null, "1"), -2);
    assertEqual(get_normalized_cr(null, "2"), -1);
    assertEqual(get_normalized_cr(null, "3"), 0);
    assertEqual(get_normalized_cr(null, "4"), 1);

    assertEqual("13", adjust(10, "+3"));
    assertEqual("7", adjust(10, "-3"));
    assertEqual("30", adjust(10, "x3"));
    assertEqual("3", adjust(10, "3"));
    assertEqual("3", adjust(10, +3));
    assertEqual("-3", adjust(10, -3));
    assertEqual([1, 2, 3], adjust(10, [1, 2, 3]));
    assertEqual({"a": 1, "b": 2}, adjust(10, {"a": 1, "b": 2}));
    assertEqual(10, adjust(10, null));
    assertEqual("soup", adjust(10, "soup"));
    assertEqual("13", adjust("10", "+3"));
    assertEqual("soup", adjust("soap", "soup"));
    assertEqual(["a", "b", "c", 1, 2, 3], adjust(["a", "b", "c"], [1, 2, 3]));
    assertEqual({"a": 1, "b": 2, "c": 3, "d": 4}, adjust({"c": 3, "d": 4}, {"a": 1, "b": 2}));
    assertEqual(10, adjust(10, undefined));

    for (let i=-3; i <= 20; i++)
        console.log(`${i}: ${JSON.stringify(get_cr_values(i))}`);

    cr_list.forEach(cr => {
        const npc = create_npc(cr);
        console.log(`${cr}: ${npc['num_attacks']} / ${npc['damage']} / ${npc['double_damage']} / ${npc['triple_damage']}`);
    });
}