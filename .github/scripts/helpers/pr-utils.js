function calculateSize(additions, deletions) {
  const total = additions + deletions;
  if (total > 500) return 'Large';
  if (total > 200) return 'Medium';
  return 'Small';
}

function getFileDescriptions(files) {
  const typeMap = {
    '.js': 'JavaScript module',
    '.ts': 'TypeScript file',
    '.jsx': 'React component',
    '.tsx': 'React component',
    '.yml': 'workflow configuration',
    '.yaml': 'workflow configuration',
    '.json': 'configuration file',
    '.md': 'documentation',
    '.css': 'stylesheet',
    '.scss': 'stylesheet',
    '.html': 'template',
    '.py': 'Python script',
    '.java': 'Java class',
    '.go': 'Go file',
    '.sql': 'SQL migration',
    '.sh': 'shell script',
    '.xml': 'XML config',
    '.env': 'environment file',
    '.toml': 'config file',
    '.lock': 'lock file'
  };

  return files.map(f => {
    const name = typeof f === 'string' ? f : f.filename;
    const ext = '.' + name.split('.').pop();
    const type = typeMap[ext] || 'file';
    return `${type} ${name}`;
  });
}

function formatTimeElapsed(minutesElapsed) {
  const hoursElapsed = minutesElapsed / 60;

  if (minutesElapsed < 60) {
    return Math.round(minutesElapsed) + ' minutes';
  }

  if (hoursElapsed < 24) {
    const h = Math.floor(hoursElapsed);
    const m = Math.round(minutesElapsed % 60);
    return (
      h + ' hour' + (h > 1 ? 's' : '') +
      (m > 0 ? ' and ' + m + ' minutes' : '')
    );
  }

  const days = Math.floor(hoursElapsed / 24);
  const remainingHours = Math.round(hoursElapsed % 24);
  return (
    days + ' day' + (days > 1 ? 's' : '') +
    (remainingHours > 0
      ? ' and ' + remainingHours + ' hour' + (remainingHours > 1 ? 's' : '')
      : '')
  );
}

function calculateSeverity(minutesElapsed, thresholds) {
  if (minutesElapsed >= thresholds.critical.minutes) return 'critical';
  if (minutesElapsed >= thresholds.high.minutes) return 'high';
  if (minutesElapsed >= thresholds.medium.minutes) return 'medium';
  return 'low';
}

function cleanDescription(body) {
  return (body || 'No description provided')
    .substring(0, 300)
    .replace(/`/g, '')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/#/g, '')
    .replace(/\*/g, '')
    .trim();
}

async function getPRFileDetails(github, owner, repo, prNumber) {
  const { data: files } = await github.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber
  });

  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return {
    files,
    additions,
    deletions,
    size: calculateSize(additions, deletions),
    fileNames: files.map(f => f.filename).join(', '),
    fileDescriptions: getFileDescriptions(files)
  };
}

async function isPRIgnored(github, owner, repo, pr) {
  const { data: reviews } = await github.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pr.number
  });

  const reviewsByOthers = reviews.filter(
    r => r.user.login !== pr.user.login
  );
  if (reviewsByOthers.length > 0) {
    return { ignored: false, reason: `has ${reviewsByOthers.length} review(s)` };
  }

  const { data: comments } = await github.rest.issues.listComments({
    owner,
    repo,
    issue_number: pr.number
  });

  const commentsByOthers = comments.filter(
    c =>
      c.user.login !== pr.user.login &&
      c.user.type !== 'Bot' &&
      !c.body.includes('Slack Notification Sent')
  );
  if (commentsByOthers.length > 0) {
    return { ignored: false, reason: `has ${commentsByOthers.length} comment(s)` };
  }

  const { data: reviewComments } = await github.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: pr.number
  });

  const inlineByOthers = reviewComments.filter(
    c => c.user.login !== pr.user.login
  );
  if (inlineByOthers.length > 0) {
    return { ignored: false, reason: `has ${inlineByOthers.length} inline comment(s)` };
  }

  return { ignored: true, reason: 'completely ignored' };
}

module.exports = {
  calculateSize,
  getFileDescriptions,
  formatTimeElapsed,
  calculateSeverity,
  cleanDescription,
  getPRFileDetails,
  isPRIgnored
};