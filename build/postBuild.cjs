const fs = require('fs');
const path = require('path');

module.exports = async function postBuild(result) {
  const extras = [];
  const appImage = result.artifactPaths.find((file) => file.endsWith('.AppImage'));

  if (appImage) {
    const source = path.join(__dirname, 'install-fuse2.sh');
    const target = path.join(path.dirname(appImage), 'install-fuse2.sh');
    const text = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n');
    fs.writeFileSync(target, text, { mode: 0o755 });
    extras.push(target);
  }

  if (result.artifactPaths.some((file) => file.endsWith('.exe'))) {
    fs.rmSync(path.join(result.outDir, 'win-unpacked'), { recursive: true, force: true });
  }
  if (appImage) {
    fs.rmSync(path.join(result.outDir, 'linux-unpacked'), { recursive: true, force: true });
  }

  return extras;
};
