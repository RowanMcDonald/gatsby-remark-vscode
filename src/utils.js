// @ts-check
const fs = require('fs');
const util = require('util');
const zlib = require('zlib');
const path = require('path');
const JSON5 = require('json5');
const plist = require('plist');
const uniq = require('lodash.uniq');

const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);
const gunzip = util.promisify(zlib.gunzip);

/**
 * Splits a Visual Studio Marketplace extension identifier into publisher and extension name.
 * @param {string} identifier The unique identifier of a VS Code Marketplace extension in the format 'publisher.extension-name'.
 */
function parseExtensionIdentifier(identifier) {
  const [publisher, name] = identifier.split('.');
  if (!name) {
    throw new Error(`Extension identifier must be in format 'publisher.extension-name'.`);
  }

  return { publisher, name };
}

/**
 * Gets the absolute path to the download path of a downloaded extension.
 * @param {string} identifier
 * @param {string} extensionDir
 */
function getExtensionBasePath(identifier, extensionDir) {
  return path.join(extensionDir, identifier);
}

/**
 * Gets the absolute path to the data directory of a downloaded extension.
 * @param {string} identifier
 * @param {string} extensionDir
 */
function getExtensionPath(identifier, extensionDir) {
  return path.join(getExtensionBasePath(identifier, extensionDir), 'extension');
}

/**
 * Gets the package.json of an extension as a JavaScript object.
 * @param {string} identifier
 * @param {string} extensionDir
 * @returns {object}
 */
function getExtensionPackageJson(identifier, extensionDir) {
  return require(path.join(getExtensionPath(identifier, extensionDir), 'package.json'));
}

/**
 * Gets the array of language codes that can be used to set the language of a Markdown code fence.
 * @param {*} languageRegistration A 'contributes.languages' entry from an extension’s package.json.
 */
function getLanguageNames(languageRegistration) {
  return uniq(
    [languageRegistration.id, ...(languageRegistration.aliases || []), ...(languageRegistration.extensions || [])].map(
      name => name.toLowerCase().replace(/[^a-z0-9_+#-]/g, '')
    )
  );
}

/**
 * Strips special characters, replaces space with dashes, and lowercases a string.
 * @param {string} str
 */
function sanitizeForClassName(str) {
  return str
    .replace(/\s+/g, '-')
    .replace(/[^-_a-z0-9]/gi, '')
    .toLowerCase();
}

/**
 * @param {import('vscode-textmate').IToken} token
 * @param {import('vscode-textmate').ITokenizeLineResult2} binaryTokens
 */
function getMetadataForToken(token, binaryTokens) {
  const index = binaryTokens.tokens.findIndex((_, i) => {
    return !(i % 2) && binaryTokens.tokens[i + 2] > token.startIndex;
  });

  if (index > -1) {
    return binaryTokens.tokens[index + 1];
  }
  return binaryTokens.tokens[binaryTokens.tokens.length - 1];
}

/**
 * @param {*} cache
 * @param {string} key
 * @param {object} value
 */
async function mergeCache(cache, key, value) {
  await cache.set(key, { ...(await cache.get(key)), ...value });
}

const requireJson = /** @param {string} pathName */ pathName => JSON5.parse(fs.readFileSync(pathName, 'utf8'));
const requirePlistOrJson = /** @param {string} pathName */ async pathName =>
  path.extname(pathName) === '.json' ? requireJson(pathName) : plist.parse(await readFile(pathName, 'utf8'));

module.exports = {
  readFile,
  exists,
  gunzip,
  parseExtensionIdentifier,
  getExtensionPath,
  getExtensionBasePath,
  getExtensionPackageJson,
  getLanguageNames,
  sanitizeForClassName,
  requireJson,
  requirePlistOrJson,
  getMetadataForToken,
  mergeCache,
};
