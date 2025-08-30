require('dotenv').config();
const fastify = require('fastify')();
// const fastify = require('fastify')({ logger: true });
const { MongoClient, ObjectId } = require('mongodb');
const argon2 = require('argon2');
const { execSync } = require('child_process');
const testPreview = require('./app_modules/testPreview');
const tests = require('./app_modules/tests');
const TestRunner = require('./app_modules/agent/test-runner');
const testRunComparisons = require('./app_modules/test-run-comparisons');

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-super-secret-session-key';
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'uatng';

let db;
let testRunner;

// MongoDB connection
async function connectDB() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DB_NAME);
  testRunner = new TestRunner(db);
  console.log('Connected to MongoDB');
}

// Register cookie support
fastify.register(require('@fastify/cookie'), {
  secret: SESSION_SECRET,
  parseOptions: {}
});

// Register session support
fastify.register(require('@fastify/session'), {
  secret: SESSION_SECRET,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

// Authentication middleware
async function authenticate(request, reply) {
  if (!request.session.userId) {
    reply.code(401).send({ error: 'Not authenticated' });
    return;
  }

  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(request.session.userId) });
    if (!user) {
      request.session.destroy();
      reply.code(401).send({ error: 'Invalid session' });
      return;
    }
    request.user = user;
  } catch (error) {
    request.session.destroy();
    reply.code(401).send({ error: 'Invalid session' });
  }
}

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true
});

// User endpoints
fastify.post('/user/create', async (request, reply) => {
  const { username, password, role } = request.body;
  
  if (!username || !password || !role || !['admin', 'user'].includes(role)) {
    return reply.code(400).send({ error: 'Invalid input' });
  }

  const existingUser = await db.collection('users').findOne({ username });
  if (existingUser) {
    return reply.code(400).send({ error: 'User already exists' });
  }

  const hashedPassword = await argon2.hash(password);
  const result = await db.collection('users').insertOne({
    username,
    password: hashedPassword,
    role,
    createdAt: new Date()
  });

  reply.send({ userId: result.insertedId });
});

fastify.get('/user/login', async (request, reply) => {
  const { username, password } = request.query;
  
  if (!username || !password) {
    return reply.code(400).send({ error: 'Username and password required' });
  }

  const user = await db.collection('users').findOne({ username });
  if (!user || !(await argon2.verify(user.password, password))) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  request.session.userId = user._id.toString();
  request.session.username = user.username;
  request.session.role = user.role;
  
  reply.send({ success: true, role: user.role, username: user.username });
});

fastify.post('/user/logout', { preHandler: authenticate }, async (request, reply) => {
  request.session.destroy();
  reply.send({ success: true });
});

fastify.get('/user/me', { preHandler: authenticate }, async (request, reply) => {
  reply.send({
    username: request.user.username,
    role: request.user.role
  });
});

// Test suite endpoints
fastify.post('/testSuite/create', { preHandler: authenticate }, async (request, reply) => {
  const { name } = request.body;
  
  if (!name) {
    return reply.code(400).send({ error: 'Name required' });
  }

  const result = await db.collection('testSuites').insertOne({
    name,
    userId: request.user._id,
    createdAt: new Date()
  });

  reply.send({ testSuiteId: result.insertedId });
});

fastify.get('/testSuite/list', { preHandler: authenticate }, async (request, reply) => {
  const query = request.user.role === 'admin' ? {} : { userId: request.user._id };
  const testSuites = await db.collection('testSuites').find(query).toArray();
  reply.send(testSuites);
});

// Device endpoint
fastify.get('/devices/list', { preHandler: authenticate }, async (request, reply) => {
  try {
    const stdout = execSync('adb devices', { encoding: 'utf8' });
    
    const lines = stdout.split('\n').slice(1); // Skip header
    const devices = {};
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2 && parts[1] !== 'offline') {
        devices[parts[0]] = parts[1];
      }
    });

    reply.send(devices);
  } catch (error) {
    reply.code(500).send({ error: 'Failed to get devices' });
  }
});

// Test preview endpoints
fastify.post('/test/preview/createFromTeaching', { preHandler: authenticate }, async (request, reply) => {
  const result = await testPreview.createFromTeaching(db, request.body, request.user);
  reply.send(result);
});

fastify.post('/test/preview/createFromInstruction', { preHandler: authenticate }, async (request, reply) => {
  const result = await testPreview.createFromInstruction(db, request.body, request.user);
  reply.send(result);
});

fastify.post('/test/preview/cmdlineTest', { preHandler: authenticate }, async (request, reply) => {
  const result = await testPreview.cmdlineTest(db, request.body, request.user);
  reply.send(result);
});

fastify.get('/test/preview/teach/getScreen', { preHandler: authenticate }, async (request, reply) => {
  try {
    const imageBuffer = await testPreview.getScreen(db, request.query, request.user);
    reply.type('image/jpeg').send(imageBuffer);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

fastify.post('/test/preview/teach/tap', { preHandler: authenticate }, async (request, reply) => {
  try {
    const result = await testPreview.teachTap(db, request.body, request.user);
    reply.send(result);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

fastify.post('/test/preview/input/tap', { preHandler: authenticate }, async (request, reply) => {
  try {
    const result = await testPreview.inputTap(db, request.body, request.user);
    reply.send(result);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

fastify.post('/test/preview/teach/stop', { preHandler: authenticate }, async (request, reply) => {
  try {
    const result = await testPreview.stopTeaching(db, request.body, request.user);
    reply.send(result);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

fastify.post('/test/preview/update', { preHandler: authenticate }, async (request, reply) => {
  try {
    const result = await testPreview.updateTest(db, request.body, request.user);
    reply.send(result);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

// Test endpoints
fastify.get('/test/list', { preHandler: authenticate }, async (request, reply) => {
  const result = await tests.list(db, request.query, request.user);
  reply.send(result);
});

fastify.get('/test/:testId', { preHandler: authenticate }, async (request, reply) => {
  try {
    const result = await tests.getById(db, request.params.testId, request.user);
    reply.send(result);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

// Test run endpoints
fastify.post('/test/run/create', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { testId } = request.body;
    if (!testId) {
      return reply.code(400).send({ error: 'testId is required' });
    }
    
    const result = await testRunner.createTestRun(testId, request.user);
    reply.send(result);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

fastify.post('/test/run/stop', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { testRunId } = request.body;
    if (!testRunId) {
      return reply.code(400).send({ error: 'testRunId is required' });
    }
    
    const result = await testRunner.stopTestRun(testRunId, request.user);
    reply.send(result);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

fastify.get('/test/run/list', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { testId } = request.query;
    let matchFilter = {};
    
    if (testId) {
      // Verify user has access to the test
      const test = await db.collection('tests').findOne({ 
        _id: new ObjectId(testId),
        ...(request.user.role !== 'admin' && { userId: request.user._id })
      });
      
      if (!test) {
        return reply.code(404).send({ error: 'Test not found or access denied' });
      }
      
      matchFilter.testId = new ObjectId(testId);
    } else {
      // List all test runs user can access
      if (request.user.role !== 'admin') {
        matchFilter.userId = request.user._id;
      }
    }

    const testRuns = await db.collection('testRuns')
      .find(matchFilter, { projection: { steps: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    
    reply.send(testRuns);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

fastify.get('/test/run/:testRunId', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { testRunId } = request.params;
    
    const testRun = await db.collection('testRuns').findOne({ 
      _id: new ObjectId(testRunId),
      ...(request.user.role !== 'admin' && { userId: request.user._id })
    });
    
    if (!testRun) {
      return reply.code(404).send({ error: 'Test run not found or access denied' });
    }
    
    reply.send(testRun);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

// Test run comparison endpoint
fastify.post('/test/run/compare', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { firstRunId, secondRunId } = request.body;
    
    if (!firstRunId || !secondRunId) {
      return reply.code(400).send({ error: 'Both firstRunId and secondRunId are required' });
    }
    
    const result = await testRunComparisons.compareTestRuns(db, firstRunId, secondRunId, request.user);
    reply.send(result);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

// Get comparison by ID for polling
fastify.get('/test/run/comparison/:comparisonId', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { comparisonId } = request.params;
    
    const comparison = await db.collection('comparisons').findOne({ 
      _id: new ObjectId(comparisonId),
      ...(request.user.role !== 'admin' && { userId: request.user._id })
    });
    
    if (!comparison) {
      return reply.code(404).send({ error: 'Comparison not found or access denied' });
    }
    
    reply.send(comparison);
  } catch (error) {
    reply.code(400).send({ error: error.message });
  }
});

// Start server
const start = async () => {
  try {
    await connectDB();
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
