const https = require('https');

async function sendToSlack(webhookUrl, payload) {
  const url = new URL(webhookUrl);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

function buildNotificationPayload(pr, message, authorMention, reviewerMentions, fileInfo) {
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'Pull Request — Review Requested', emoji: false }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*<${pr.html_url}|#${pr.number}: ${pr.title}>*` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: message }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Author:*\n${authorMention}` },
          { type: 'mrkdwn', text: `*Reviewers:*\n${reviewerMentions}` },
          { type: 'mrkdwn', text: `*Branch:*\n\`${pr.head.ref}\` into \`${pr.base.ref}\`` },
          { type: 'mrkdwn', text: `*Size:*\n${fileInfo.size}` },
          { type: 'mrkdwn', text: `*Files Changed:*\n${fileInfo.files.length}` },
          { type: 'mrkdwn', text: `*Lines Changed:*\n+${fileInfo.additions} / -${fileInfo.deletions}` }
        ]
      },
      { type: 'divider' },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: 'Severity: *LOW* | Reminders will follow if review remains pending' }]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Review PR', emoji: false },
            url: pr.html_url + '/files',
            style: 'primary'
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Discussion', emoji: false },
            url: pr.html_url
          }
        ]
      }
    ]
  };
}

function buildReminderPayload(pendingPRs) {
  const severityIcons = {
    low: ':white_circle:',
    medium: ':large_yellow_circle:',
    high: ':large_orange_circle:',
    critical: ':red_circle:'
  };

  const statusIcons = {
    ignored: ':no_entry_sign:',
    stalled: ':hourglass_flowing_sand:'
  };

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `PR Review Reminder — ${pendingPRs.length} PR(s) Awaiting Review`,
        emoji: false
      }
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: new Date().toUTCString() }]
    },
    { type: 'divider' }
  ];

  for (const pr of pendingPRs) {
    const sevIcon = severityIcons[pr.severity] || ':white_circle:';
    const statIcon = statusIcons[pr.review_status] || ':white_circle:';

    // Status tag
    const statusTag = pr.review_status === 'stalled'
      ? `STALLED — ${pr.approval_count}/${pr.min_approvals} approvals`
      : 'NO ACTIVITY';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${sevIcon} *[${pr.severity_label}]* ${statIcon} *${statusTag}*\n*<${pr.url}|#${pr.number}: ${pr.title}>*`
      }
    });

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: pr.status_message }
    });

    // Build fields
    const fields = [
      { type: 'mrkdwn', text: `*Author:*\n${pr.author_mention}` },
      { type: 'mrkdwn', text: `*Reviewers:*\n${pr.reviewer_mentions}` },
      { type: 'mrkdwn', text: `*Open Since:*\n${pr.created_at}` },
      { type: 'mrkdwn', text: `*Waiting For:*\n${pr.time_string}` },
      { type: 'mrkdwn', text: `*Branch:*\n\`${pr.branch_from}\` into \`${pr.branch_to}\`` },
      { type: 'mrkdwn', text: `*Size:*\n${pr.size} (+${pr.additions}/-${pr.deletions} | ${pr.changed_files} files)` }
    ];

    // Add approval progress for stalled PRs
    if (pr.review_status === 'stalled') {
      fields.push({
        type: 'mrkdwn',
        text: `*Approvals:*\n${pr.approval_count}/${pr.min_approvals} (need ${pr.approvals_needed} more)`
      });
      if (pr.approved_by && pr.approved_by.length > 0) {
        fields.push({
          type: 'mrkdwn',
          text: `*Approved By:*\n${pr.approved_by}`
        });
      }
    }

    blocks.push({ type: 'section', fields: fields.slice(0, 10) });

    const truncatedFiles = pr.file_names.length > 200
      ? pr.file_names.substring(0, 200) + '...'
      : pr.file_names;

    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Files: \`${truncatedFiles}\`` }]
    });

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Review Now', emoji: false },
          url: `${pr.url}/files`,
          style: ['high', 'critical'].includes(pr.severity) ? 'danger' : 'primary'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View PR', emoji: false },
          url: pr.url
        }
      ]
    });

    blocks.push({ type: 'divider' });
  }

  // Summary footer
  const count = sev => pendingPRs.filter(p => p.severity === sev).length;
  const ignoredCount = pendingPRs.filter(p => p.review_status === 'ignored').length;
  const stalledCount = pendingPRs.filter(p => p.review_status === 'stalled').length;

  blocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text:
        `:red_circle: Critical: ${count('critical')} | ` +
        `:large_orange_circle: High: ${count('high')} | ` +
        `:large_yellow_circle: Medium: ${count('medium')} | ` +
        `:white_circle: Low: ${count('low')} | ` +
        `:no_entry_sign: Ignored: ${ignoredCount} | ` +
        `:hourglass_flowing_sand: Stalled: ${stalledCount}`
    }]
  });

  return { blocks };
}

function buildApprovedPayload(pr, authorMention, approvedBy, reviewTime, minApprovals) {
  return {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'PR Approved — Ready to Merge', emoji: false }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*PR:*\n<${pr.html_url}|#${pr.number}: ${pr.title}>` },
          { type: 'mrkdwn', text: `*Author:*\n${authorMention}` },
          { type: 'mrkdwn', text: `*Approved By:*\n${approvedBy}` },
          { type: 'mrkdwn', text: `*Review Time:*\n${reviewTime}` }
        ]
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `All ${minApprovals} required approvals received. This PR is ready to merge.` }]
      },
      {
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'Merge PR', emoji: false },
          url: pr.html_url,
          style: 'primary'
        }]
      }
    ]
  };
}

function buildPartialApprovalPayload(pr, reviewerMention, reviewTime, stillWaiting, approvalCount, pendingCount, minApprovals) {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*Partial Approval* — *<${pr.html_url}|#${pr.number}: ${pr.title}>*\n\n` +
            `${reviewerMention} approved (review time: ${reviewTime})\n` +
            `Approvals: ${approvalCount}/${minApprovals} — need ${pendingCount} more\n` +
            `Still waiting on: ${stillWaiting}`
        }
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Reminders will continue until ${minApprovals} approvals are received.` }]
      }
    ]
  };
}

function buildChangesRequestedPayload(pr, reviewerMention, authorMention, feedback) {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*Changes Requested* on *<${pr.html_url}|#${pr.number}: ${pr.title}>*\n\n` +
            `Reviewer: ${reviewerMention}\n` +
            `${authorMention} — please address the feedback.\n\n` +
            `*Feedback:*\n> ${feedback}`
        }
      },
      {
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'View Feedback', emoji: false },
          url: pr.html_url,
          style: 'primary'
        }]
      }
    ]
  };
}

function buildMergedPayload(pr) {
  return {
    blocks: [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*PR Merged*\n\n` +
          `*<${pr.html_url}|#${pr.number}: ${pr.title}>*\n\n` +
          `Author: *${pr.user.login}*\n` +
          `Merged into \`${pr.base.ref}\`\n` +
          `+${pr.additions}/-${pr.deletions}`
      }
    }]
  };
}

function buildClosedPayload(pr) {
  return {
    blocks: [{
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*PR Closed Without Merge*\n\n` +
          `*<${pr.html_url}|#${pr.number}: ${pr.title}>*\n\n` +
          `All reminders stopped.`
      }
    }]
  };
}

module.exports = {
  sendToSlack,
  buildNotificationPayload,
  buildReminderPayload,
  buildApprovedPayload,
  buildPartialApprovalPayload,
  buildChangesRequestedPayload,
  buildMergedPayload,
  buildClosedPayload
};