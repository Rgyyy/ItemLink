module.exports = {
  apps: [
    {
      name: 'itemlink-backend',
      script: './dist/index.js',
      instances: 1, // 프리티어는 1개 인스턴스만 사용
      exec_mode: 'fork', // 클러스터 모드는 여러 코어 필요
      watch: false, // 프로덕션에서는 watch 비활성화
      max_memory_restart: '300M', // 메모리 300MB 초과 시 재시작 (t2.micro는 1GB)
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
    },
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-ec2-ip-or-domain',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/itemlink.git',
      path: '/home/ubuntu/itemlink',
      'post-deploy':
        'cd backend && npm install && npm run build && npx prisma migrate deploy && pm2 reload ecosystem.config.js --env production',
    },
  },
};
