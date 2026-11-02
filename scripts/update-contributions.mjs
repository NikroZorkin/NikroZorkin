import { execFileSync } from 'node:child_process';
import { readFile, writeFile, rename, appendFile } from 'node:fs/promises';
import { profile } from './artwork.mjs';

// Only daily totals are retained; no repository names or private activity details.
const query = `query($login:String!) { user(login:$login) { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`;
const response = JSON.parse(execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`, '-f', `login=${profile.login}`], { encoding: 'utf8' }));
if (response.errors) throw new Error(JSON.stringify(response.errors));
const calendar = response.data?.user?.contributionsCollection?.contributionCalendar;
if (!calendar) throw new Error('GitHub returned no contribution calendar. Existing data was kept.');
const days = calendar.weeks.flatMap(week => week.contributionDays.map(day => ({ date: day.date, count: day.contributionCount })));
if (!days.length || days.some(day => !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isInteger(day.count) || day.count < 0)) throw new Error('Invalid contribution calendar.');
if (days.reduce((sum, day) => sum + day.count, 0) !== calendar.totalContributions) throw new Error('Contribution totals do not match.');
if (days.length < 365 || days.length > 373 || days.some((day, index) => index && Date.parse(day.date) - Date.parse(days[index - 1].date) !== 86400000)) throw new Error('Incomplete or unordered contribution calendar. Existing data was kept.');
let previous;
try { previous = JSON.parse(await readFile('design/contributions.json', 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const changed = previous?.login !== profile.login || previous?.total !== calendar.totalContributions || JSON.stringify(previous?.days) !== JSON.stringify(days);
if (changed) {
  await writeFile('design/contributions.json.tmp', JSON.stringify({ login: profile.login, fetchedAt: new Date().toISOString(), source: 'GitHub contributionCalendar', total: calendar.totalContributions, days }, null, 2) + '\n');
  await rename('design/contributions.json.tmp', 'design/contributions.json');
}
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
console.log(changed ? `Saved ${days.length} days and ${calendar.totalContributions} contributions for ${profile.login}.` : 'Contribution data is unchanged; no commit needed.');
