const fs = require('fs');
const path = require('path');

function loadConfig() {
  const configPath = path.join(
    process.cwd(),
    '.github/config/team-config.json'
  );
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function getSlackMention(config, githubUsername) {
  const member = config.team_members[githubUsername];
  return member ? `<@${member.slack_id}>` : `@${githubUsername}`;
}

function getMemberName(config, githubUsername) {
  const member = config.team_members[githubUsername];
  return member ? member.name : githubUsername;
}

function getReviewerMentions(config, requestedReviewers) {
  if (!requestedReviewers || requestedReviewers.length === 0) {
    return 'No reviewers assigned';
  }
  return requestedReviewers
    .map(r => getSlackMention(config, r.login))
    .join(', ');
}

module.exports = {
  loadConfig,
  getSlackMention,
  getMemberName,
  getReviewerMentions
};