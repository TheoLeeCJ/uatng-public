const { ObjectId } = require('mongodb');

async function list(db, query, user) {
  const { testSuiteId } = query;
  
  let matchFilter = {};
  
  if (testSuiteId) {
    // Verify user has access to the test suite
    const testSuite = await db.collection('testSuites').findOne({ 
      _id: new ObjectId(testSuiteId),
      ...(user.role !== 'admin' && { userId: user._id })
    });
    
    if (!testSuite) {
      throw new Error('Test suite not found or access denied');
    }
    
    matchFilter.testSuiteId = new ObjectId(testSuiteId);
  } else {
    // List all tests user can access
    if (user.role !== 'admin') {
      matchFilter.userId = user._id;
    }
  }

  // Aggregate to include last test run status
  const tests = await db.collection('tests').aggregate([
    { $match: matchFilter },
    {
      $lookup: {
        from: 'testRuns',
        let: { testId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$testId', '$$testId'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { status: 1, startedAt: 1, endedAt: 1, reason: 1 } }
        ],
        as: 'lastRun'
      }
    },
    {
      $addFields: {
        lastRun: { $arrayElemAt: ['$lastRun', 0] }
      }
    },
    { $project: { taughtSteps: 0 } }
  ]).toArray();
  
  return tests;
}

async function getById(db, testId, user) {
  if (!testId) {
    throw new Error('Test ID is required');
  }

  // Get full test details including taughtSteps
  const test = await db.collection('tests').findOne({ 
    _id: new ObjectId(testId),
    ...(user.role !== 'admin' && { userId: user._id })
  });
  
  if (!test) {
    throw new Error('Test not found or access denied');
  }

  return test;
}

module.exports = {
  list,
  getById
};
