module.exports = {
  apps: [
    {
      name: 'doc-server',
      script: 'dist/main.js',
      cwd: './apps/server',
      instances: 1,
      autorestart: true,
    },
  ],
}