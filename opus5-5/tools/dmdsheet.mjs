// Renders DMD scenes to a contact sheet (JSON of frames) for visual QA via tools/dmdsheet.py
import { DMD } from '../src/display/dmd.js';
import * as S from '../src/display/scenes.js';
import { JOB_DEFS } from '../src/game/rules.js';
import fs from 'fs';
const players = [{ n: 1, score: 123456780 }, { n: 2, score: 9870 }, { n: 3, score: 45000000 }];
const frames = [
  ['logo', S.logo(), 2.5], ['bigText', S.bigText('EXTRA BALL', 'SHOOT AGAIN'), 1], ['award', S.award('SKILL SHOT', 1500000), 1],
  ['award2', S.award('K-E-Y COMPLETE', null, 'BONUS 3X +KICKBACK'), 1], ['jackpot', S.jackpot('SUPER JACKPOT', 43000000), 1.2],
  ['vaultOpen', S.vaultOpen('LOCK IS LIT'), 1.6], ['ballLocked', S.ballLocked(2), 1.2], ['multiball', S.multiball(), 0.5],
  ['mystery', S.mystery('LIGHT KICKBACK'), 1.5], ['jobSelect', S.jobSelect(() => JOB_DEFS[1], () => 5.2), 0.3],
  ['jobIntro', S.jobIntro(JOB_DEFS[4]), 1], ['jobHit', S.jobHit('GETAWAY DRIVE', 2500000, '3 TO GO'), 0.5],
  ['jobComplete', S.jobComplete('CASE THE JOINT', 5000000), 0.6], ['bigScoreIntro', S.bigScoreIntro(), 1.5],
  ['bonus', S.bonusCount([['RAMPS', 12, 50000]], 3, 600000), 0.5], ['bonusTotal', S.bonusCount([['RAMPS', 12, 50000]], 3, 600000), 3.0],
  ['match', S.match(40, [40, 70], true), 2.6], ['hsEntry', S.hsEntry(() => ({ player: players[0], rank: 0, letters: [9, 14, 0], pos: 2, charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789' })), 0.1],
  ['hsPage', S.highScorePage('HIGH SCORES', [{ name: 'ACE', score: 150000000 }, { name: 'MOE', score: 100000000 }], 1), 1],
  ['textPage', S.textPage(['KNOCK DOWN THE', 'LASER GRID TO', 'CRACK THE VAULT']), 1.5], ['city', S.city(), 2],
];
const out = [];
for (const [name, sc, t] of frames) { const d = new DMD(); sc.draw(d, t, 3); out.push({ name, buf: Array.from(d.buf) }); }
const bases = [
  ['scores1', d => S.drawScores(d, 1, [players[0]], 0, 2, 'FREE PLAY')],
  ['scores3', d => S.drawScores(d, 1, players, 1, 1, 'FREE PLAY')],
  ['jobStatus', d => S.drawJobStatus(d, 1, { def: JOB_DEFS[3], id: 'DRIVE', time: 23.4, progress: 2, need: 5, value: 3000000 }, players[0])],
  ['mbStatus', d => S.drawMultiballStatus(d, 1, { jpValue: 7000000, superLit: false }, players[0])],
  ['wizStatus', d => S.drawWizardStatus(d, 1, { superLit: true, value: 1e7, level: 1 }, players[0])],
];
for (const [name, fn] of bases) { const d = new DMD(); fn(d); out.push({ name, buf: Array.from(d.buf) }); }
fs.writeFileSync(process.argv[2], JSON.stringify(out));
