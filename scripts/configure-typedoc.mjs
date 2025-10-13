import {
  existsSync,
  promises as fs,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

/**
 * A post processing script to organise the output of TypeDoc to match our desired
 * documentation structure.
 */

const rootDir = path.resolve(process.cwd());
const docsRefDir = path.join(rootDir, 'docs', 'reference');
const packagesDir = path.join(docsRefDir, '01-Library Reference');
const indexMdPath = path.join(docsRefDir, '01-Library Reference', 'index.md');
const packagesMdPath = path.join(packagesDir, 'modules.md');
const packagesMdRenamedPath = path.join(packagesDir, '01-Library Reference.md');
const pagesDir = path.join(rootDir, 'docs-site', 'src', 'pages');
const readmeSrcPath = path.join(rootDir, 'README.md');
const readmeDestPath = path.join(pagesDir, 'index.md');

const filesToCopy = [
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'CONTRIBUTORS.md',
  'LICENSE',
  'PUBLISHING.md',
  'SECURITY.md',
];

/**
 * Determine if a file system entry is a directory and not node_modules or .git
 * @param {*} file
 * @returns {boolean}
 */
const isADirectory = (file) => {
  return (
    file.isDirectory() && file.name !== 'node_modules' && file.name !== '.git'
  );
};

/**
 * Remove duplicate nested directories by moving contents up one level
 * when parent and child directories have the same name.
 * Recursively processes all subdirectories.
 */
async function removeDuplicateNestedDirectories() {
  const baseDir = path.join(docsRefDir, '01-Library Reference');

  async function processDirectory(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (isADirectory(entry)) {
        const entryPath = path.join(currentDir, entry.name);
        const subEntries = await fs.readdir(entryPath, { withFileTypes: true });

        // Check for duplicate nested directories
        for (const subEntry of subEntries) {
          if (
            isADirectory(subEntry) &&
            subEntry.name === entry.name.replace('-gateway', '')
          ) {
            // Found duplicate nested directory - move all contents up one level
            const duplicateDir = path.join(entryPath, subEntry.name);
            const duplicateContents = await fs.readdir(duplicateDir, {
              withFileTypes: true,
            });

            // Move each item from the duplicate directory to its parent
            for (const item of duplicateContents) {
              const sourcePath = path.join(duplicateDir, item.name);
              const destPath = path.join(entryPath, item.name);
              await fs.rename(sourcePath, destPath);
            }

            // Remove the now-empty duplicate directory
            await fs.rmdir(duplicateDir);
            console.log(`Removed duplicate directory: ${duplicateDir}`);
          }
        }

        // Recursively process this directory
        await processDirectory(entryPath);
      }
    }
  }

  await processDirectory(baseDir);
}

/**
 * Rename modules.md to 01-Library Reference.md
 */
async function renameModulesMarkdown() {
  // Rename modules.md to 01-Library Reference.md
  try {
    await fs.rename(packagesMdPath, packagesMdRenamedPath);
    console.log(`Renamed: ${packagesMdPath} → ${packagesMdRenamedPath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error renaming packages.md:', err);
      process.exit(1);
    }
  }
}

/**
 * Process the 01-Library Reference.md file to remove any lines containing "_docs",
 * fix duplicate text in links, remove index.md from paths, and update the heading.
 */
async function processModulesMarkdown() {
  const file = path.join(
    docsRefDir,
    '01-Library Reference/01-Library Reference.md',
  );
  const content = readFileSync(file, 'utf8');

  // Split into lines and filter out lines containing "_docs"
  let lines = content.split(/\r?\n/).filter((l) => !l.includes('_docs'));

  // Fix duplicate text in links and remove index.md from paths
  lines = lines.map((line) => {
    // Change heading from "## Modules" to "# Library Reference"
    if (line.trim() === '## Modules') {
      return '# Library Reference';
    }

    // Match markdown links and simplify by removing everything after the first /
    // Pattern: [text/anything](path/anything/index.md) or [text/anything](path/anything/)
    const linkPattern = /\[([^/\]]+)\/[^\]]*\]\(([^/)]+)\/[^)]*\)/g;

    // Replace with simplified version: [construct-name](construct-name/)
    return line.replace(linkPattern, '[$1]($2/)');
  });

  const out = lines.join('\n');
  console.log(out);
  writeFileSync(file, out);
}

/**
 * Delete the root index.md file if it exists.
 */
async function deleteRootIndexMarkdownFile() {
  // Delete index.md
  try {
    await fs.unlink(indexMdPath);
    console.log(`Deleted: ${indexMdPath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error deleting index.md:', err);
      process.exit(1);
    }
  }
}

/**
 * Copy specified markdown files to the docs/reference directory and
 * copy README.md to docs-site/src/pages/index.md
 */
async function copyMarkdownFiles() {
  // Copy files
  for (const file of filesToCopy) {
    const src = path.join(rootDir, file);
    const dest = path.join(docsRefDir, file);
    try {
      await fs.copyFile(src, dest);
      console.log(`Copied: ${file} → ${dest}`);
    } catch (err) {
      console.error(`Error copying ${file}:`, err);
      process.exit(1);
    }
  }

  // Copy README.md to docs-site/src/pages/index.md
  try {
    await fs.copyFile(readmeSrcPath, readmeDestPath);
    console.log(`Copied: README.md → ${readmeDestPath}`);
  } catch (err) {
    console.error('Error copying README.md:', err);
    process.exit(1);
  }
}

/**
 * Organise markdown files by moving __docs/index.md to parent directory
 * and renaming it to match the parent directory name.
 * Finally, remove any empty __docs directories.
 */
async function organiseDocMarkdownFiles() {
  const baseDir = path.join(docsRefDir, '01-Library Reference');
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') {
      const dirPath = path.join(baseDir, e.name);
      const docsDir = path.join(dirPath, '__docs');
      if (existsSync(path.join(docsDir, 'index.md')) === true) {
        await fs.rename(
          path.join(docsDir, 'index.md'),
          path.join(docsDir, `${e.name}.md`),
        );
      }
      if (existsSync(path.join(docsDir, `${e.name}.md`)) === true) {
        await fs.rename(
          path.join(docsDir, `${e.name}.md`),
          path.join(baseDir, `${e.name}/${e.name}.md`),
        );
      }
      if (existsSync(docsDir) === true) {
        fs.rmdir(docsDir);
      }
    }
  }
}

/**
 * Delete all index.md files in the docs/reference/01-Library Reference directory and its subdirectories.
 */
async function deleteAllIndexMarkdownFiles() {
  const baseDir = path.join(docsRefDir, '01-Library Reference');

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile()) {
        if (e.name === 'index.md') {
          await fs.rm(full, { force: true });
        }
      }
    }
  }

  await walk(baseDir);
}

/**
 * Fix MDX syntax issues in generated documentation files.
 * Escapes curly braces that MDX interprets as JSX expressions.
 */
async function fixMdxSyntax() {
  const baseDir = path.join(docsRefDir, '01-Library Reference');

  async function processMarkdownFile(filePath) {
    try {
      let content = await fs.readFile(filePath, 'utf8');

      // Escape curly braces in lines that look like ARN patterns or similar
      // This specifically targets lines with patterns like {partition}, {region}, etc.
      content = content.replace(
        /^(\s*)(arn:\{[^}]+\}:[^}]*\{[^}]+\}:[^}]*\{[^}]+\}:[^}]*\{[^}]+\}:[^}]*\{[^}]+\}.*?)$/gm,
        '$1`$2`',
      );

      // Also escape isolated curly brace expressions that might be JSX-like
      content = content.replace(
        /(\s+)(\{[a-zA-Z][a-zA-Z0-9_-]*\})(\s+)/g,
        '$1`$2`$3',
      );

      await fs.writeFile(filePath, content, 'utf8');
    } catch (err) {
      console.error(`Error processing ${filePath}:`, err);
    }
  }

  async function walkAndFix(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkAndFix(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        await processMarkdownFile(fullPath);
      }
    }
  }

  await walkAndFix(baseDir);
  console.log('Fixed MDX syntax issues in documentation files');
}

/**
 * Main function to execute all steps in order.
 */
async function main() {
  await deleteRootIndexMarkdownFile();
  await renameModulesMarkdown();
  await processModulesMarkdown();
  await copyMarkdownFiles();
  await organiseDocMarkdownFiles();
  await deleteAllIndexMarkdownFiles();
  // await organiseTypeDoc();
  await removeDuplicateNestedDirectories();
  await fixMdxSyntax();
}

main();
