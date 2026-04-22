// Cross-platform dev launcher: unsets ELECTRON_RUN_AS_NODE before starting electron-vite
const { spawnSync } = require('child_process')
delete process.env.ELECTRON_RUN_AS_NODE
const result = spawnSync('npx', ['electron-vite', 'dev'], { stdio: 'inherit', shell: true })
process.exit(result.status ?? 0)
