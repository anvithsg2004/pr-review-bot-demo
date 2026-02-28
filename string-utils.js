// string-utils.js

/**
 * Utility functions for string manipulation
 */

function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str) {
  if (!str) return '';
  return str.replace(/([-_][a-z])/ig, (match) => {
    return match.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
}

module.exports = {
  capitalize,
  toCamelCase
};