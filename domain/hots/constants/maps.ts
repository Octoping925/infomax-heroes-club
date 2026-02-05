import { GameMap } from "../models/map";

export const MAPS: Record<GameMap, string> = {
  SkyTemple: "하늘 사원",
  TowersOfDoom: "파멸의 탑",
  HauntedMines: "죽음의 광산",
  BattlefieldOfEternity: "영원의 전쟁터",
  BlackheartsBay: "블랙하트 항만",
  CursedHollow: "저주받은 골짜기",
  DragonShire: "용의 둥지",
  HauntedWoods: "공포의 정원",
  InfernalShrines: "불지옥 신단",
  TombOfTheSpiderQueen: "거미 여왕의 무덤",
  VolskayaFoundry: "볼스카야 공장",
  WarheadJunction: "핵탄두 격전지",
  BraxisHoldout: "브락시스 항전",
  Hanamura: "하나무라 사원",
  AlteracPass: "알터랙 고개",
};

export const MAPS_IMAGE: Record<GameMap, string> = {
  SkyTemple: "https://nexuscompendium.com/images/battlegrounds/sky-temple/main.jpg",
  TowersOfDoom: "https://nexuscompendium.com/images/battlegrounds/towers-of-doom/main.jpg",
  HauntedMines: "https://nexuscompendium.com/images/battlegrounds/haunted-mines/main.jpg",
  BattlefieldOfEternity: "https://nexuscompendium.com/images/battlegrounds/battlefield-of-eternity/main.jpg",
  BlackheartsBay: "https://nexuscompendium.com/images/battlegrounds/blackhearts-bay/main.jpg",
  CursedHollow: "https://nexuscompendium.com/images/battlegrounds/cursed-hollow/main.jpg",
  DragonShire: "https://nexuscompendium.com/images/battlegrounds/dragon-shire/main.jpg",
  HauntedWoods: "https://nexuscompendium.com/images/battlegrounds/garden-of-terror/main.jpg",
  InfernalShrines: "https://nexuscompendium.com/images/battlegrounds/infernal-shrines/main.jpg",
  TombOfTheSpiderQueen: "https://nexuscompendium.com/images/battlegrounds/tomb-of-the-spider-queen/main.jpg",
  VolskayaFoundry: "https://nexuscompendium.com/images/battlegrounds/volskaya-foundry/main.jpg",
  WarheadJunction: "https://nexuscompendium.com/images/battlegrounds/warhead-junction/main.jpg",
  BraxisHoldout: "https://nexuscompendium.com/images/battlegrounds/braxis-holdout/main.jpg",
  Hanamura: "https://nexuscompendium.com/images/battlegrounds/hanamura/main.jpg",
  AlteracPass: "https://nexuscompendium.com/images/battlegrounds/alterac-pass/main.jpg",
};

export const MAPS_IMAGE_LOCAL: Record<GameMap, string> = {
  SkyTemple: "/maps/SkyTemple.jpg",
  TowersOfDoom: "/maps/TowersOfDoom.jpg",
  HauntedMines: "/maps/HauntedMines.jpg",
  BattlefieldOfEternity: "/maps/BattlefieldOfEternity.jpg",
  BlackheartsBay: "/maps/BlackheartsBay.jpg",
  CursedHollow: "/maps/CursedHollow.jpg",
  DragonShire: "/maps/DragonShire.jpg",
  HauntedWoods: "/maps/HauntedWoods.jpg",
  InfernalShrines: "/maps/InfernalShrines.jpg",
  TombOfTheSpiderQueen: "/maps/TombOfTheSpiderQueen.jpg",
  VolskayaFoundry: "/maps/VolskayaFoundry.jpg",
  WarheadJunction: "/maps/WarheadJunction.jpg",
  BraxisHoldout: "/maps/BraxisHoldout.jpg",
  Hanamura: "/maps/Hanamura.jpg",
  AlteracPass: "/maps/AlteracPass.jpg",
};

export const MAPS_NAMUWIKI_URL: Record<GameMap, string> = {
  SkyTemple: "https://namu.wiki/w/%ED%95%98%EB%8A%98%20%EC%82%AC%EC%9B%90",
  TowersOfDoom: "https://namu.wiki/w/%ED%8C%8C%EB%A9%B8%EC%9D%98%20%ED%83%91",
  HauntedMines: "https://namu.wiki/w/%EC%A3%BD%EC%9D%8C%EC%9D%98%20%EA%B4%91%EC%82%B0",
  BattlefieldOfEternity: "https://namu.wiki/w/%EC%98%81%EC%9B%90%EC%9D%98%20%EC%A0%84%EC%9F%81%ED%84%B0",
  BlackheartsBay: "https://namu.wiki/w/%EB%B8%94%EB%9E%99%ED%95%98%ED%8A%B8%20%ED%95%AD%EB%A7%8C",
  CursedHollow: "https://namu.wiki/w/%EC%A0%80%EC%A3%BC%EB%B0%9B%EC%9D%80%20%EA%B3%A8%EC%A7%9C%EA%B8%B0",
  DragonShire: "https://namu.wiki/w/%EC%9A%A9%EC%9D%98%20%EB%91%A5%EC%A7%80",
  HauntedWoods: "https://namu.wiki/w/%EA%B3%B5%ED%8F%AC%EC%9D%98%20%EC%A0%95%EC%9B%90",
  InfernalShrines: "https://namu.wiki/w/%EB%B6%88%EC%A7%80%EC%98%A5%20%EC%8B%A0%EB%8B%A8",
  TombOfTheSpiderQueen: "https://namu.wiki/w/%EA%B1%B0%EB%AF%B8%20%EC%97%AC%EC%99%95%EC%9D%98%20%EB%AC%B4%EB%8D%A4",
  VolskayaFoundry: "https://namu.wiki/w/%EB%B3%BC%EC%8A%A4%EC%B9%B4%EC%95%BC%20%EA%B3%B5%EC%9E%A5",
  WarheadJunction: "https://namu.wiki/w/%ED%95%B5%ED%83%84%EB%91%90%20%EA%B2%A9%EC%A0%84%EC%A7%80",
  BraxisHoldout: "https://namu.wiki/w/%EB%B8%8C%EB%9D%BD%EC%8B%9C%EC%8A%A4%20%ED%95%AD%EC%A0%84",
  Hanamura: "https://namu.wiki/w/%ED%95%98%EB%82%98%EB%AC%B4%EB%9D%BC%20%EC%82%AC%EC%9B%90",
  AlteracPass: "https://namu.wiki/w/%EC%95%8C%ED%84%B0%EB%9E%99%20%EA%B3%A0%EA%B0%9C",
};

export const MAPS_DESCRIPTION: Record<GameMap, string> = {
  SkyTemple:
    "사원은 주기적으로 활성화됩니다. 활성화된 사원에 서서 사원의 힘을 확보하십시오! 사원에 굳건히 서 있으면 사원이 상대 팀 요새에 맹렬한 공격을 가합니다! 수호병들이 자신들의 사원을 되찾으려고 노력할 것입니다. 그들을 저지하며 사원의 힘을 지켜내십시오!",
  TowersOfDoom:
    "양 팀의 핵은 강력한 방벽으로 보호받고 있어 영웅들이 공격할 수 없습니다. 승리하려면 제단을 활성화해야 합니다. 제단이 주기적으로 솟아오릅니다.제단을 활성화하면 아군이 보유한 종탑이 상대 팀 핵에 포격을 가합니다. 상대 팀의 탑을 파괴하면 그 탑은 아군의 소유가 됩니다.더 많은 탑을 보유할수록 제단을 활성화할 때 더 많은 피해를 줍니다.",
  HauntedMines:
    "언데드가 우글거리는 죽음의 광산이 주기적으로 열립니다. 언데드를 처치하고 해골을 수집해서 아군 골렘을 강화시키세요! 언데드를 모두 처치하면 양 팀 골렘이 일어납니다! 해골을 많이 수집할수록 골렘이 더욱 강력해집니다!",
  BattlefieldOfEternity:
    "두 불멸자가 전장 중앙에서 전투를 펼칩니다. 아군 불멸자가 승리하게 도운 다음, 불멸자와 함께 진격하며 상대 팀 방어선을 파괴하세요.",
  BlackheartsBay:
    "보물 상자를 공격하고 용병과 해골 선원들을 처치해서 금화를 수집하세요. 수집한 금화를 블랙하트에게 지불하세요. 그 전에 죽으면 금화를 모두 떨어트리게 됩니다! 금화를 충분히 지불하면 블랙하트가 유령선으로 상대 팀 요새에 포격을 가합니다!",
  CursedHollow:
    "까마귀 군주는 주기적으로 공물을 생성합니다. 공물을 세 개 수집하면 까마귀 군주가 상대 팀에 저주를 내립니다. 저주받은 팀은 요새의 공격이 중단되고 모든 돌격병의 생명력이 1로 감소합니다.",
  DragonShire:
    "전장의 두 신단을 점령하면 용기사 석상을 활성화할 수 있습니다. 영웅이 활성화된 용기사 석상으로 가면 용기사를 해방시킬 수 있습니다!",
  HauntedWoods:
    "밤그늘 여왕은 주기적으로 씨앗을 소환합니다. 괴식물 수호자들을 물리치고 씨앗을 차지하세요! 씨앗을 3개 차지하면 각 공격로에 정원 공포가 생성됩니다. 정원 공포들은 적의 구조물들을 무력화시킵니다.정원 공포와 함께 적을 무찌르세요!",
  InfernalShrines: "상대 팀보다 먼저 수호자 40마리를 처치하고 강력한 응징자를 불러내세요.",
  TombOfTheSpiderQueen:
    "상대 팀 거미 돌격병과 영웅이 죽을 때 보석을 떨어트립니다. 보석을 최대한 많이 모으세요. 수집한 보석을 거미 여왕의 제단 중 하나로 가져가세요. 그 전에 죽으면 모두 떨어트리게 됩니다! 먼저 충분한 보석을 반납한 팀은 강력한 거미 시종의 도움을 받아 적의 방어선을 파괴할 수 있습니다.",
  VolskayaFoundry:
    "주기적으로 거점이 활성화됩니다. 거점을 완전히 점령하면 거대 로봇을 조종할 수 있습니다. 트리글라브 수호자 로봇은 두 플레이어가 조종할 수 있습니다. 한 명은 조종사를, 한 명은 사수를 맡아 협력하십시오.",
  WarheadJunction:
    "전장 곳곳에 다수의 핵탄두가 주기적으로 생성됩니다. 핵탄두를 획득하면 핵 공격을 할 수 있습니다. 핵탄두를 사용하지 못하고 죽으면 핵탄두를 떨어트리게 됩니다!",
  BraxisHoldout:
    "주기적으로 두 곳의 신호기가 활성화됩니다. 양쪽 신호기를 모두 점령하면 해당 팀의 수용실에 저그가 모입니다. 어느 한 쪽의 수용실이 가득 차면, 모든 수용실이 개방되고 각각의 수용실에서 저그 무리가 상대방 진영으로 돌격합니다.",
  Hanamura:
    "주기적으로 전장 중앙에 화물이 생성됩니다. 화물은 양 팀 모두 호위할 수 있습니다. 화물을 목적지까지 호위하세요. 화물을 탈취하려는 적 또한 막아야 합니다. 화물을 목적지까지 호위하면 화물이 적 구조물에 포격을 가합니다!",
  AlteracPass:
    "적의 포로수용소를 공격하면 아군의 기병대가 충원됩니다. 수용소는 영웅이나 돌격병이 다시 빼앗을 수 있으니 주의하세요! 기병대는 각 공격로에 소환되어 적을 향해 돌진합니다. 기병대 주위의 아군 영웅은 공격력과 이동 속도가 증가합니다.",
};
