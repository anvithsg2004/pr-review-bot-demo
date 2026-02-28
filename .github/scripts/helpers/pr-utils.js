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

/**
 * Analyzes the full review status of a PR.
 *
 * Returns:
 *   status: 'ignored' | 'stalled' | 'fully_approved'
 *   approvalCount: number of unique approvals
 *   approvalsNeeded: how many more approvals are needed
 *   approvedBy: list of usernames who approved
 *   changesRequestedBy: list of usernames who requested changes
 *   commentCount: number of human comments by others
 *   reviewCount: number of reviews by others
 *   pendingReviewers: list of usernames who haven't reviewed yet
 *   reason: human-readable description
 */
async function getPRReviewStatus(github, owner, repo, pr, minApprovals) {
  // ── Get all reviews ──
  const { data: allReviews } = await github.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pr.number
  });

  // Latest review per person (excluding author)
  const latestReviews = {};
  for (const r of allReviews) {
    if (r.user.login === pr.user.login) continue;
    if (
      !latestReviews[r.user.login] ||
      new Date(r.submitted_at) > new Date(latestReviews[r.user.login].submitted_at)
    ) {
      latestReviews[r.user.login] = r;
    }
  }

  const approvedBy = Object.entries(latestReviews)
    .filter(([_, r]) => r.state === 'APPROVED')
    .map(([user]) => user);

  const changesRequestedBy = Object.entries(latestReviews)
    .filter(([_, r]) => r.state === 'CHANGES_REQUESTED')
    .map(([user]) => user);

  const reviewsByOthers = allReviews.filter(
    r => r.user.login !== pr.user.login
  );

  // ── Get comments ──
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

  // ── Get inline review comments ──
  const { data: reviewComments } = await github.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: pr.number
  });

  const inlineByOthers = reviewComments.filter(
    c => c.user.login !== pr.user.login
  );

  // ── Pending reviewers ──
  const pendingReviewers = (pr.requested_reviewers || [])
    .filter(r => !latestReviews[r.login])
    .map(r => r.login);

  // ── Determine status ──
  const approvalCount = approvedBy.length;
  const approvalsNeeded = Math.max(0, minApprovals - approvalCount);
  const hasAnyActivity =
    reviewsByOthers.length > 0 ||
    commentsByOthers.length > 0 ||
    inlineByOthers.length > 0;

  let status;
  let reason;

  if (approvalCount >= minApprovals && changesRequestedBy.length === 0) {
    status = 'fully_approved';
    reason = `fully approved with ${approvalCount} approval(s)`;
  } else if (hasAnyActivity) {
    status = 'stalled';
    reason =
      `has activity (${approvalCount} approval(s), ` +
      `${commentsByOthers.length} comment(s), ` +
      `${reviewsByOthers.length} review(s)) ` +
      `but needs ${approvalsNeeded} more approval(s)`;
  } else {
    status = 'ignored';
    reason = 'completely ignored — zero activity';
  }

  return {
    status,
    approvalCount,
    approvalsNeeded,
    approvedBy,
    changesRequestedBy,
    commentCount: commentsByOthers.length,
    inlineCommentCount: inlineByOthers.length,
    reviewCount: reviewsByOthers.length,
    pendingReviewers,
    hasAnyActivity,
    reason
  };
}

module.exports = {
  calculateSize,
  getFileDescriptions,
  formatTimeElapsed,
  calculateSeverity,
  cleanDescription,
  getPRFileDetails,
  getPRReviewStatus
};