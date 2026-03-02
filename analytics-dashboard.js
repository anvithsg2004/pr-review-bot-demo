// analytics-dashboard.js

/**
 * AnalyticsDashboard — Tracks and reports PR review metrics.
 * 
 * This module collects data on review times, response rates,
 * and team performance to help improve the code review process.
 */

class AnalyticsDashboard {
  constructor() {
    this.metrics = {
      totalReviews: 0,
      averageReviewTime: 0,
      reviewTimes: [],
      reviewerStats: {}
    };
  }

  /**
   * Records a completed review with timing data.
   * @param {string} reviewer - GitHub username of the reviewer
   * @param {number} minutesTaken - Time in minutes from PR open to review
   * @param {string} outcome - 'approved' | 'changes_requested' | 'commented'
   */
  recordReview(reviewer, minutesTaken, outcome) {
    this.metrics.totalReviews += 1;
    this.metrics.reviewTimes.push(minutesTaken);

    // Update average
    const sum = this.metrics.reviewTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageReviewTime = Math.round(sum / this.metrics.reviewTimes.length);

    // Track per-reviewer stats
    if (!this.metrics.reviewerStats[reviewer]) {
      this.metrics.reviewerStats[reviewer] = {
        totalReviews: 0,
        approvals: 0,
        changesRequested: 0,
        comments: 0,
        averageTime: 0,
        times: []
      };
    }

    const stats = this.metrics.reviewerStats[reviewer];
    stats.totalReviews += 1;
    stats.times.push(minutesTaken);
    stats.averageTime = Math.round(
      stats.times.reduce((a, b) => a + b, 0) / stats.times.length
    );

    if (outcome === 'approved') stats.approvals += 1;
    else if (outcome === 'changes_requested') stats.changesRequested += 1;
    else if (outcome === 'commented') stats.comments += 1;

    console.log(
      `[Analytics] Review recorded: ${reviewer} — ${outcome} in ${minutesTaken}min`
    );

    return stats;
  }

  /**
   * Returns the top reviewers sorted by number of reviews.
   * @param {number} limit - Maximum number of reviewers to return
   * @returns {Array} Sorted list of reviewer stats
   */
  getTopReviewers(limit = 5) {
    return Object.entries(this.metrics.reviewerStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalReviews - a.totalReviews)
      .slice(0, limit);
  }

  /**
   * Returns the fastest reviewers sorted by average review time.
   * @param {number} limit - Maximum number of reviewers to return
   * @returns {Array} Sorted list of reviewer stats
   */
  getFastestReviewers(limit = 5) {
    return Object.entries(this.metrics.reviewerStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .filter(r => r.totalReviews >= 2)
      .sort((a, b) => a.averageTime - b.averageTime)
      .slice(0, limit);
  }

  /**
   * Generates a summary report of all review metrics.
   * @returns {Object} Summary report
   */
  generateReport() {
    const report = {
      totalReviews: this.metrics.totalReviews,
      averageReviewTime: this.metrics.averageReviewTime,
      fastestReview: this.metrics.reviewTimes.length > 0
        ? Math.min(...this.metrics.reviewTimes)
        : 0,
      slowestReview: this.metrics.reviewTimes.length > 0
        ? Math.max(...this.metrics.reviewTimes)
        : 0,
      totalReviewers: Object.keys(this.metrics.reviewerStats).length,
      topReviewers: this.getTopReviewers(3),
      fastestReviewers: this.getFastestReviewers(3)
    };

    console.log('[Analytics] Report generated');
    console.log(`  Total reviews: ${report.totalReviews}`);
    console.log(`  Average time: ${report.averageReviewTime} min`);
    console.log(`  Fastest: ${report.fastestReview} min`);
    console.log(`  Slowest: ${report.slowestReview} min`);

    return report;
  }

  /**
   * Resets all collected metrics.
   */
  reset() {
    this.metrics = {
      totalReviews: 0,
      averageReviewTime: 0,
      reviewTimes: [],
      reviewerStats: {}
    };
    console.log('[Analytics] Metrics reset');
  }
}

module.exports = new AnalyticsDashboard();