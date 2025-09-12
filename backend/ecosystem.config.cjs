module.exports = {
  apps: [
    {
      name: 'emotional-api',
      script: 'npx',
      args: 'tsx services/emotional-api.ts',
      cwd: '/home/ec2-user/sentientiq-production/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        WS_PORT: 8080,
        NATS_URL: 'nats://localhost:4222',
        VITE_API_URL: 'https://api.sentientiq.app'
      },
      error_file: '/home/ec2-user/sentientiq-production/logs/emotional-api-error.log',
      out_file: '/home/ec2-user/sentientiq-production/logs/emotional-api-out.log',
      merge_logs: true,
      time: true,
      max_restarts: 10,
      restart_delay: 4000,
      autorestart: true,
      watch: false
    }
  ]
};