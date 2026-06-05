// PM2 process definition for the Meridian backend (which also serves the built
// frontend from ../dist). Started by deploy.sh.
module.exports = {
  apps: [
    {
      name: 'meridian',
      script: 'index.js',
      cwd: '/opt/meridian/server',
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
