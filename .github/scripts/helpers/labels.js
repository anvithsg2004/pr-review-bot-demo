const ALL_SEVERITY_LABELS = [
  'review-severity:low',
  'review-severity:medium',
  'review-severity:high',
  'review-severity:critical'
];

async function updateSeverityLabel(github, owner, repo, prNumber, severity) {
  const newLabel = `review-severity:${severity}`;

  for (const label of ALL_SEVERITY_LABELS) {
    if (label !== newLabel) {
      try {
        await github.rest.issues.removeLabel({
          owner, repo, issue_number: prNumber, name: label
        });
      } catch (e) {}
    }
  }

  try {
    await github.rest.issues.addLabels({
      owner, repo, issue_number: prNumber, labels: [newLabel]
    });
    console.log(`PR #${prNumber} labeled ${newLabel}`);
  } catch (e) {
    console.log(`Could not add label: ${e.message}`);
  }
}

async function cleanupAllLabels(github, owner, repo, prNumber, extraLabels = []) {
  const toRemove = [...ALL_SEVERITY_LABELS, ...extraLabels];

  for (const label of toRemove) {
    try {
      await github.rest.issues.removeLabel({
        owner, repo, issue_number: prNumber, name: label
      });
    } catch (e) {}
  }
}

module.exports = {
  ALL_SEVERITY_LABELS,
  updateSeverityLabel,
  cleanupAllLabels
};