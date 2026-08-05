import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { parseAndNormalizeReplay } from "../domain/hots/replay/decode-replay";
import { normalizeDecodedReplay } from "../domain/hots/replay/normalize-replay";
import { issueReplayDraft } from "../domain/hots/replay/replay-draft";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpusDirectory = requireDirectory("REPLAY_CORPUS_DIR");
const legacyRoot = requireDirectory("LEGACY_HOTS_DIR");
const replayFiles = readdirSync(corpusDirectory)
  .filter((name) => name.toLowerCase().endsWith(".stormreplay"))
  .sort();

if (replayFiles.length === 0) {
  throw new Error("REPLAY_CORPUS_DIR에 .StormReplay 파일이 없습니다.");
}

process.env.LOGLEVEL = "fatal";
process.env.REPLAY_TOKEN_SECRET ??= Buffer.alloc(32, 7).toString("base64url");

{
  const legacyModule = await import(
    pathToFileURL(join(legacyRoot, "hots-parser", "parser.js")).href
  );

  const report = createReport(replayFiles.length);
  const successfulDrafts = [];
  const productionResults = new Map();
  let largestRequestBytes = 0;
  let largestResponseBytes = 0;
  let peakRssBytes = process.memoryUsage().rss;

  for (const fileName of replayFiles) {
    const path = join(corpusDirectory, fileName);
    const source = readFileSync(path);
    const sourceReplayHash = createHash("sha256").update(source).digest("hex");
    largestRequestBytes = Math.max(largestRequestBytes, source.byteLength);

    const startedAt = performance.now();
    let normalized;
    try {
      normalized = parseAndNormalizeReplay(source);
      productionResults.set(fileName, { normalized, sourceReplayHash });
      report.production.success += 1;
      increment(report.production.builds, String(normalized.build ?? "unknown"));
    } catch (error) {
      const code = readErrorCode(error);
      productionResults.set(fileName, { rejection: code });
      increment(report.production.rejections, code);
      if (!isAcceptedCorrection(code)) {
        report.unexpectedRejections += 1;
      }
    }
    const durationMs = performance.now() - startedAt;
    if (report.performance.samples === 0) {
      report.performance.coldParseMs = durationMs;
    } else {
      report.performance.warmTotalParseMs += durationMs;
    }
    report.performance.maxParseMs = Math.max(report.performance.maxParseMs, durationMs);
    report.performance.totalParseMs += durationMs;
    report.performance.samples += 1;
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);

    if (normalized) {
      const draft = issueReplayDraft({ normalizedReplay: normalized, sourceReplayHash });
      successfulDrafts.push({ draft, normalized });
      const responseBytes = Buffer.byteLength(JSON.stringify({
        preview: normalized,
        draft,
        sourceReplayHash,
        duplicatePreflight: { status: "unknown" },
      }));
      largestResponseBytes = Math.max(largestResponseBytes, responseBytes);
    }
  }

  for (const fileName of replayFiles) {
    const production = productionResults.get(fileName);
    const legacy = parseLegacySilently(
      legacyModule.processReplay,
      join(corpusDirectory, fileName),
    );
    if (production?.rejection) {
      if (legacy?.status === 1) report.acceptedLegacyCorrections += 1;
      else report.legacyAlsoRejected += 1;
      continue;
    }
    const legacyNormalized = normalizeLegacy(legacy, normalizeDecodedReplay);
    if (!production?.normalized || !legacyNormalized) {
      report.legacyFailures += 1;
      continue;
    }
    const mismatches = compareReplay(production.normalized, legacyNormalized);
    if (mismatches.length === 0) continue;
    report.parityMismatchedReplays += 1;
    for (const field of mismatches) increment(report.parityMismatches, field);
  }

  const tenLargestDrafts = successfulDrafts
    .toSorted((left, right) => Buffer.byteLength(right.draft) - Buffer.byteLength(left.draft))
    .slice(0, 10);
  const playerMappings = Object.fromEntries(tenLargestDrafts.flatMap(({ normalized }) =>
    [...normalized.game.team1.players, ...normalized.game.team2.players]
      .map((player) => [player.rawName, "00000000-0000-0000-0000-000000000000"]),
  ));
  const confirmBodyBytes = Buffer.byteLength(JSON.stringify({
    drafts: tenLargestDrafts.map(({ draft }, index) => ({
      token: draft,
      gameNumber: index + 1,
      orientation: "NORMAL",
    })),
    playerMappings,
    team1LeaderId: "00000000-0000-0000-0000-000000000001",
    team2LeaderId: "00000000-0000-0000-0000-000000000002",
    type: "LUNCH",
  }));

  report.performance.averageParseMs = round(report.performance.totalParseMs / report.performance.samples);
  report.performance.coldParseMs = round(report.performance.coldParseMs);
  report.performance.warmAverageParseMs = round(
    report.performance.warmTotalParseMs / Math.max(report.performance.samples - 1, 1),
  );
  report.performance.maxParseMs = round(report.performance.maxParseMs);
  delete report.performance.totalParseMs;
  delete report.performance.warmTotalParseMs;
  delete report.performance.samples;
  report.limits = {
    largestRequestBytes,
    largestResponseBytes,
    tenReplayConfirmBodyBytes: confirmBodyBytes,
    peakRssBytes,
    tracedFunctionBytes: readTraceSize(),
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (
    report.unexpectedRejections > 0 ||
    report.legacyFailures > 0 ||
    report.parityMismatchedReplays > 0
  ) {
    process.exitCode = 1;
  }
}

function normalizeLegacy(legacy, normalizeDecodedReplay) {
  if (!legacy || legacy.status !== 1 || !legacy.match) return null;
  for (const side of [0, 1]) {
    if (Array.isArray(legacy.match.bans?.[side])) {
      legacy.match.bans[side] = legacy.match.bans[side].filter((ban) => ban?.hero);
    }
  }
  try {
    return normalizeDecodedReplay(legacy);
  } catch {
    return null;
  }
}

function parseLegacySilently(processReplay, path) {
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return processReplay(path, { overrideVerifiedBuild: true });
  } catch {
    return null;
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

function compareReplay(current, legacy) {
  const fields = {
    build: [current.build, legacy.build],
    date: [current.playedAt, legacy.playedAt],
    map: [current.map, legacy.map],
    winner: [current.winnerSide, legacy.winnerSide],
    duration: [current.game.gameLength, legacy.game.gameLength],
    teams: [teamMembership(current), teamMembership(legacy)],
    players: [playerIdentity(current), playerIdentity(legacy)],
    stats: [playerStats(current), playerStats(legacy)],
    talents: [playerTalents(current), playerTalents(legacy)],
    bans: [teamBans(current), teamBans(legacy)],
  };
  return Object.entries(fields)
    .filter(([, [left, right]]) => !isDeepStrictEqual(left, right))
    .map(([field]) => field);
}

function teamMembership(replay) {
  return [replay.game.team1, replay.game.team2].map((team) => ({
    level: team.level,
    win: team.win,
    players: team.players.map((player) => player.rawName),
  }));
}

function playerIdentity(replay) {
  return sortedPlayers(replay).map((player) => ({
    rawName: player.rawName,
    hero: player.hero,
    position: player.position,
  }));
}

function playerStats(replay) {
  return sortedPlayers(replay).map((player) => ({
    rawName: player.rawName,
    kills: player.kills,
    deaths: player.deaths,
    takedowns: player.takedowns,
    heroDamage: player.heroDamage,
    siegeDamage: player.siegeDamage,
    damageTaken: player.damageTaken,
    healingDone: player.healingDone,
    experienceContribution: player.experienceContribution,
    timeSpentDead: player.timeSpentDead,
    timeCCdEnemyHeroes: player.timeCCdEnemyHeroes,
    dpm: player.dpm,
    mercCampCaptures: player.mercCampCaptures,
    watchTowerCaptures: player.watchTowerCaptures,
    regenGlobes: player.regenGlobes,
  }));
}

function playerTalents(replay) {
  return sortedPlayers(replay).map((player) => ({
    rawName: player.rawName,
    talents: player.talents,
  }));
}

function teamBans(replay) {
  return [replay.game.team1.bans, replay.game.team2.bans];
}

function sortedPlayers(replay) {
  return [...replay.game.team1.players, ...replay.game.team2.players]
    .toSorted((left, right) => left.rawName.localeCompare(right.rawName));
}

function createReport(total) {
  return {
    corpusFiles: total,
    production: { success: 0, rejections: {}, builds: {} },
    acceptedLegacyCorrections: 0,
    legacyAlsoRejected: 0,
    unexpectedRejections: 0,
    legacyFailures: 0,
    parityMismatchedReplays: 0,
    parityMismatches: {},
    performance: {
      samples: 0,
      totalParseMs: 0,
      warmTotalParseMs: 0,
      coldParseMs: 0,
      warmAverageParseMs: 0,
      maxParseMs: 0,
      averageParseMs: 0,
    },
    limits: {},
  };
}

function readTraceSize() {
  const tracePath = join(repositoryRoot, ".next", "server", "app", "api", "matches", "replays", "parse", "route.js.nft.json");
  if (!existsSync(tracePath)) return null;
  const trace = JSON.parse(readFileSync(tracePath, "utf8"));
  return trace.files.reduce((total, file) => {
    const path = resolve(dirname(tracePath), file);
    return total + (existsSync(path) ? statSync(path).size : 0);
  }, 0);
}

function requireDirectory(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경 변수를 설정해 주세요.`);
  const path = resolve(value);
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`${name} 디렉터리를 찾을 수 없습니다: ${relative(process.cwd(), path)}`);
  }
  return path;
}

function readErrorCode(error) {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "UNKNOWN";
}

function isAcceptedCorrection(code) {
  return code === "INVALID_REPLAY" || code === "INVALID_TEAM_SIZE" || code === "WINNER_NOT_FOUND";
}

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
