const data = [
    {
        "u": "storm_ui_icon_xalatath_q_shadowmark.png",
        "n": "VoidAdept"
    },
    {
        "u": "storm_ui_icon_xalatath_e_darkheartritual.png",
        "n": "AnchoredCore"
    },
    {
        "u": "storm_ui_icon_xalatath_w_voidstep.png",
        "n": "CloakofShadows"
    },
    {
        "u": "storm_ui_icon_xalatath_q_shadowmark.png",
        "n": "ColdFeet"
    },
    {
        "u": "storm_ui_icon_xalatath_e_darkheartritual.png",
        "n": "DarkBarrier"
    },
    {
        "u": "storm_ui_icon_xalatath_w_voidstep.png",
        "n": "VoidAcolyte"
    },
    {
        "u": "storm_ui_icon_xalatath_q_shadowmark.png",
        "n": "ToxicMark"
    },
    {
        "u": "storm_ui_icon_xalatath_w_voidstep_c.png",
        "n": "SilenceoftheLamb"
    },
    {
        "u": "storm_ui_icon_xalatath_w_voidstep_b.png",
        "n": "VoidSummoner"
    },
    {
        "u": "storm_ui_icon_xalatath_r1_voideruption.png",
        "n": "VoidEruption"
    },
    {
        "u": "storm_ui_icon_xalatath_r2_voidconvergence.png",
        "n": "VoidConvergence"
    },
    {
        "u": "storm_ui_icon_xalatath_e_darkheartritual.png",
        "n": "PulloftheDarkHeart"
    },
    {
        "u": "storm_ui_icon_xalatath_e_darkheartritual_b.png",
        "n": "DarkHeart'sProtection"
    },
    {
        "u": "storm_ui_icon_xalatath_trait.png",
        "n": "CrushingCascade"
    },
    {
        "u": "storm_ui_icon_xalatath_q_shadowmark.png",
        "n": "MarkedResilience"
    },
    {
        "u": "storm_ui_icon_xalatath_w_voidstep.png",
        "n": "RelentlessWhispers"
    },
    {
        "u": "storm_ui_icon_xalatath_trait.png",
        "n": "FracturedReality"
    },
    {
        "u": "storm_ui_icon_xalatath_r1_voideruption_b.png",
        "n": "Harbinger'sConsumption"
    },
    {
        "u": "storm_ui_icon_xalatath_r2_voidconvergence.png",
        "n": "RiftInvasion"
    },
    {
        "u": "storm_ui_icon_xalatath_q_shadowmark.png",
        "n": "DuelingOrbs"
    },
    {
        "u": "storm_ui_icon_xalatath_e_darkheartritual.png",
        "n": "UnstableCore"
    },
    {
        "u": "storm_ui_icon_xalatath_w_voidstep.png",
        "n": "ParadoxLoop"
    }
]

const prefix = "./public/talents/xalatath/";

const fs = require("fs");

for (const item of data) {
    const path = prefix + item.u;
    const dest = prefix + item.n + ".png";

    // copy to 
    fs.copyFileSync(path, dest);
}