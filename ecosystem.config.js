module.exports = {
  apps: [
    {
      name: 'stock-simulator',
      script: 'server.js',
      // try PORTS env var to allow backup ports
      env: {
        PORTS: '8000,8001,8002',
        NODE_ENV: 'production'
      },
      // restart automatically on crash, 5 times in 10 seconds (default)
      autorestart: true,
      // watch disabled in production
      watch: false,
      // log files
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      // max memory before restart
      max_memory_restart: '200M'
    }
  ]
};
