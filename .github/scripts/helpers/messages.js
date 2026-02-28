const { getFileDescriptions } = require('./pr-utils');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Notification message (new PR opened) ──

function generateNotificationMessage({ pr, config, size, additions, deletions, files, fileNames, branchFrom, branchTo, description }) {
  const filesDesc = getFileDescriptions(files).join(' and ');

  const memberName = config.team_members[pr.user.login]
    ? config.team_members[pr.user.login].name
    : pr.user.login;

  const authorLink = `<https://github.com/${pr.user.login}|${memberName}>`;

  const reviewEstimate = size === 'Small' ? 'a quick'
    : size === 'Medium' ? 'a moderate'
    : 'a thorough';

  const openings = [
    `${authorLink} has opened a new PR that updates ${filesDesc}.`,
    `A ${size.toLowerCase()} pull request by ${authorLink} introduces changes to ${filesDesc}.`,
    `New changes from ${authorLink} are ready for review, touching ${filesDesc}.`,
    `${authorLink} submitted a PR modifying ${filesDesc} on the ${branchFrom} branch.`,
    `A pull request from ${authorLink} with updates to ${filesDesc} has just been opened.`
  ];

  const details = [
    `It is a ${size.toLowerCase()} change with ${additions} lines added and ${deletions} removed across ${files.length} file(s), and should require ${reviewEstimate} review.`,
    `The change includes ${additions} additions and ${deletions} deletions spanning ${files.length} file(s), making it ${reviewEstimate} review.`,
    `This ${size.toLowerCase()} update adds ${additions} lines across ${files.length} file(s) and is merging into ${branchTo}.`,
    `With ${additions} new lines and ${deletions} deletions in ${files.length} file(s), this should be ${reviewEstimate} review for the team.`,
    `The PR contains ${additions} additions and ${deletions} deletions in ${files.length} file(s), targeting the ${branchTo} branch.`
  ];

  const closings = [
    'Please take a look and share your feedback when you get a chance.',
    'A timely review would be greatly appreciated.',
    'Looking forward to the team\'s feedback on this one.',
    'Please review at your earliest convenience so we can keep things moving.',
    'Your review will help the author iterate and move forward.'
  ];

  return [pick(openings), pick(details), pick(closings)].join(' ');
}

// ── Reminder message — IGNORED (zero activity) ──

function generateReminderMessage({ pr, config, files, additions, deletions, size, timeString, createdFormatted, severity }) {
  const filesDesc = getFileDescriptions(files).join(' and ');

  const memberName = config.team_members[pr.user.login]
    ? config.team_members[pr.user.login].name
    : pr.user.login;

  const authorLink = `<https://github.com/${pr.user.login}|${memberName}>`;

  const openings = [
    `${authorLink} submitted a ${size.toLowerCase()} change to ${filesDesc} that adds ${additions} lines and removes ${deletions} lines.`,
    `A pull request updating ${filesDesc} with ${additions} additions and ${deletions} deletions was opened by ${authorLink}.`,
    `This ${size.toLowerCase()} PR by ${authorLink} introduces changes to ${filesDesc}, adding ${additions} lines across ${files.length} file(s).`,
    `${authorLink} has a ${size.toLowerCase()} PR open that modifies ${filesDesc} with ${additions} new lines of code.`,
    `Changes to ${filesDesc} totaling ${additions} additions and ${deletions} deletions are waiting for review from ${authorLink}.`
  ];

  const timeSentences = [
    `It has been open for ${timeString} since ${createdFormatted}, and no one has reviewed, commented, or acknowledged it.`,
    `This PR was created on ${createdFormatted} and has been sitting unreviewed for ${timeString} with zero activity.`,
    `Since being opened ${timeString} ago on ${createdFormatted}, this PR has received absolutely no attention.`,
    `For the past ${timeString}, since ${createdFormatted}, this change has had no reviews, no comments, and no engagement.`,
    `It has now been ${timeString} since this was submitted on ${createdFormatted}, and not a single person has looked at it.`
  ];

  const urgencyPhrases = {
    low: [
      'A quick review would be much appreciated whenever someone has a moment.',
      'If you have a few spare minutes, this could use a pair of fresh eyes.',
      'It would be great if someone could take a look when they get a chance.',
      'This should be a quick one to review if anyone can pick it up.',
      'Whenever you find some time, this PR could use your attention.'
    ],
    medium: [
      'The review delay is starting to add up, so it would be helpful to get this looked at soon.',
      'This has been waiting longer than usual. Could someone please prioritize a review?',
      'We are past the typical review window now. It would be great to get some feedback moving.',
      'The clock is ticking on this one. A timely review would really help keep things on track.',
      'This PR has been in the queue for a while now. Please consider reviewing it today.'
    ],
    high: [
      'This is blocking progress and needs immediate reviewer attention. Please prioritize this.',
      'The lack of review is now holding up work. This needs to be addressed as soon as possible.',
      'This PR has been waiting far too long without any feedback. It is becoming a bottleneck.',
      'We need someone to step up and review this urgently. The author cannot move forward without it.',
      'This delay is impacting the team workflow. Please review this at your earliest opportunity today.'
    ],
    critical: [
      'This has been ignored for an unacceptable amount of time and must be reviewed immediately.',
      'We are well past the critical threshold. This PR requires urgent attention right now.',
      'This has been completely unattended and is severely blocking progress. Immediate action is needed.',
      'This PR has reached critical status. All other work should be deprioritized until this is reviewed.',
      'The review for this PR is critically overdue. Someone must pick this up without further delay.'
    ]
  };

  return [
    pick(openings),
    pick(timeSentences),
    pick(urgencyPhrases[severity])
  ].join(' ');
}

// ── Stalled message — HAS ACTIVITY but not enough approvals ──

function generateStalledMessage({
  pr,
  config,
  files,
  additions,
  deletions,
  size,
  timeString,
  createdFormatted,
  reviewStatus,
  minApprovals
}) {
  const filesDesc = getFileDescriptions(files).join(' and ');

  const memberName = config.team_members[pr.user.login]
    ? config.team_members[pr.user.login].name
    : pr.user.login;

  const authorLink = `<https://github.com/${pr.user.login}|${memberName}>`;

  const approvedByNames = reviewStatus.approvedBy
    .map(u => {
      const m = config.team_members[u];
      return m ? m.name : u;
    })
    .join(', ');

  const approvalsNeeded = reviewStatus.approvalsNeeded;

  // Build activity summary
  const activityParts = [];
  if (reviewStatus.approvalCount > 0) {
    activityParts.push(
      `${reviewStatus.approvalCount} approval${reviewStatus.approvalCount > 1 ? 's' : ''} (from ${approvedByNames})`
    );
  }
  if (reviewStatus.changesRequestedBy.length > 0) {
    activityParts.push(
      `${reviewStatus.changesRequestedBy.length} change request${reviewStatus.changesRequestedBy.length > 1 ? 's' : ''}`
    );
  }
  if (reviewStatus.commentCount > 0) {
    activityParts.push(
      `${reviewStatus.commentCount} comment${reviewStatus.commentCount > 1 ? 's' : ''}`
    );
  }
  if (reviewStatus.inlineCommentCount > 0) {
    activityParts.push(
      `${reviewStatus.inlineCommentCount} inline comment${reviewStatus.inlineCommentCount > 1 ? 's' : ''}`
    );
  }
  const activitySummary = activityParts.join(', ') || 'some review activity';

  // Opening — describes the PR
  const openings = [
    `This ${size.toLowerCase()} PR by ${authorLink} updates ${filesDesc} with ${additions} additions and ${deletions} deletions.`,
    `${authorLink} has a ${size.toLowerCase()} change to ${filesDesc} that adds ${additions} lines across ${files.length} file(s).`,
    `A pull request modifying ${filesDesc} was opened by ${authorLink} with ${additions} new lines of code.`,
    `${authorLink} submitted changes to ${filesDesc}, a ${size.toLowerCase()} update with ${additions} additions.`,
    `Changes to ${filesDesc} by ${authorLink} include ${additions} additions and ${deletions} deletions across ${files.length} file(s).`
  ];

  // Middle — describes the stalled state
  const stalledSentences = [
    `It has been open for ${timeString} since ${createdFormatted} and has ${activitySummary}, but still needs ${approvalsNeeded} more approval${approvalsNeeded > 1 ? 's' : ''} to meet the minimum of ${minApprovals}.`,
    `This PR was created on ${createdFormatted} and has been open for ${timeString}. While there has been ${activitySummary}, it is still ${approvalsNeeded} approval${approvalsNeeded > 1 ? 's' : ''} short of the required ${minApprovals}.`,
    `Since being opened ${timeString} ago on ${createdFormatted}, this PR has received ${activitySummary} but remains ${approvalsNeeded} approval${approvalsNeeded > 1 ? 's' : ''} away from being merge-ready.`,
    `Although this PR has seen ${activitySummary} since ${createdFormatted}, it has been waiting ${timeString} and still requires ${approvalsNeeded} additional approval${approvalsNeeded > 1 ? 's' : ''}.`,
    `Over the past ${timeString} since ${createdFormatted}, this PR has gathered ${activitySummary}, yet it needs ${approvalsNeeded} more approval${approvalsNeeded > 1 ? 's' : ''} before it can be merged.`
  ];

  // Closing — asks for action
  const closings = [
    'If you have not reviewed this yet, please take a look so the author can move forward.',
    'Another reviewer needs to step in to unblock this PR.',
    'Please help complete the review process so this change can be merged.',
    'The author is waiting for one more set of eyes on this. Your review would make a difference.',
    'This PR is close to being ready. One more review will get it across the finish line.'
  ];

  // Pending reviewer specific closing
  const pendingClosings = [];
  if (reviewStatus.pendingReviewers.length > 0) {
    const pendingNames = reviewStatus.pendingReviewers
      .map(u => {
        const m = config.team_members[u];
        return m ? m.name : u;
      })
      .join(', ');
    pendingClosings.push(
      `${pendingNames} — you have been assigned as a reviewer and have not yet responded.`,
      `A review from ${pendingNames} is still pending. Please take a look when possible.`,
      `${pendingNames}, this PR is waiting on your review to proceed.`
    );
  }

  const closing = pendingClosings.length > 0 && Math.random() > 0.5
    ? pick(pendingClosings)
    : pick(closings);

  return [pick(openings), pick(stalledSentences), closing].join(' ');
}

module.exports = {
  generateNotificationMessage,
  generateReminderMessage,
  generateStalledMessage
};