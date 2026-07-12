import process from 'node:process';

// Root .env points DB_HOST at the Docker Compose service name ('mysql-db'),
// which is only resolvable from inside the Compose network. Tests run on the
// host against the same container via its published port, so we override to
// 'localhost' here before any test file imports the app/models.
process.env.DB_HOST = 'localhost';
process.env.NODE_ENV ||= 'dev';
