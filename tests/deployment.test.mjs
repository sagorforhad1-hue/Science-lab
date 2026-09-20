import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = new URL('../', import.meta.url);
test('clean deployment builds all static assets without a pre-existing dist or secrets', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'science-lab-build-'));
  for (const name of ['public', 'src']) {
    await fs.cp(new URL(name, root), path.join(dir, name), {recursive:true});
  }
  await fs.copyFile(new URL('build.mjs', root), path.join(dir, 'build.mjs'));
  await fs.writeFile(path.join(dir, '.env.local'), 'GROQ_API_KEY=not-a-real-key-test-sentinel');
  execFileSync(process.execPath, [fileURLToPath(new URL('build.mjs', root))], {cwd:dir});
  const files = (await fs.readdir(path.join(dir, 'dist'), {withFileTypes:true})).filter(entry=>entry.isFile()).map(entry=>entry.name);
  assert.deepEqual(files.sort(), ['app.js','cloud.js','push.js','firebase-messaging-sw.js','data.js','favicon.svg','i18n.js','index.html','integrations.js','storage.js','style.css','zip.js'].sort());
  const agentFiles = await fs.readdir(path.join(dir, 'dist', 'agents'));
  assert.deepEqual(agentFiles.sort(), ['app-doctor-reference.jpg','ask-me-reference.jpg','communication-reference.jpg','help-reference.jpg','student-reference.jpg'].sort());
  for (const file of files) {
    assert.ok(!(await fs.readFile(path.join(dir, 'dist', file), 'utf8')).includes('not-a-real-key-test-sentinel'));
  }
  const config = JSON.parse(await fs.readFile(new URL('vercel.json', root), 'utf8'));
  assert.equal(config.framework, null);
  assert.equal(config.outputDirectory, 'dist');
});
