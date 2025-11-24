import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import cors from 'cors';
import { MongoClient } from 'mongodb'; // Import MongoClient
import dotenv from 'dotenv'; // Import dotenv
import { OAuth2Client } from 'google-auth-library'; // Import OAuth2Client
import multer from 'multer'; // Import multer for file uploads
import { spawn } from 'child_process'; // Import spawn from child_process
import { unlink } from 'fs/promises'; // Import unlink from fs/promises for file deletion
import { ObjectId } from 'mongodb'; // Import ObjectId from mongodb
import { setUserBudget, getUserBudget, calculateBudgetStatus } from './budgetModel.js'; // Import budget functions
// import {  analyzeWithChatGPT } from './aiAnalysticsService.js'; // Import AI analytics function

dotenv.config(); // Load environment variables

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const upload = multer({ dest: path.join(__dirname, 'uploads/') }); // Temporary directory for uploads, ensure it's in the backend folder

const PDF_COLLECTION_NAME = process.env.PDF_COLLECTION_NAME || "pdf_files"; // Collection for storing raw PDFs

// Function to upload PDF file data to MongoDB
async function uploadPdfToMongoDB(pdfBuffer, filename, userId) {
  let client;
  try {
    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(PDF_COLLECTION_NAME);

    const document = {
      filename: filename,
      data: pdfBuffer,
      sub: userId,
      uploadDate: new Date(),
    };
    const result = await collection.insertOne(document);
    console.log(`Successfully uploaded PDF file '${filename}' for user ${userId} to ${DATABASE_NAME}.${PDF_COLLECTION_NAME}. MongoDB _id: ${result.insertedId}`);
    return { status: "success", message: `PDF uploaded for user ${userId}`, pdf_mongo_id: result.insertedId.toString() };
  } catch (e) {
    console.error(`An error occurred while uploading PDF to MongoDB: ${e}`);
    return { status: "error", message: `Error uploading PDF to MongoDB: ${e.message}` };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Read client_secret from file
const credentialsPath = path.join(__dirname, 'client_secret_187428957013-97eqd6kdb9tol67u9ddmpf535b18nv7m.apps.googleusercontent.com.json');
const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
const GOOGLE_CLIENT_ID = credentials.web.client_id;
const GOOGLE_CLIENT_SECRET = credentials.web.client_secret;
const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

const app = express();
const port = process.env.PORT || 3001;

const MONGODB_CONNECTION_STRING = process.env.MONGODB_URI || "mongodb+srv://superuser:superuser123@cluster0.s3aalbl.mongodb.net/";
const DATABASE_NAME = process.env.DB_NAME || "fintrackr";
const TRANSACTIONS_COLLECTION_NAME = "transactions"; // New collection name

// Function to upload individual transaction data to MongoDB, now storing as an array per user
async function uploadTransactionsToMongoDB(transactionsArray, userId, collectionName) {
  let client;
  try {
    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(collectionName);

    if (!Array.isArray(transactionsArray) || transactionsArray.length === 0) {
      console.log('No transactions to upload.');
      return { status: "success", message: "No transactions to upload." };
    }

    const filter = { sub: userId };
    const update = {
      $push: {
        transactions: { $each: transactionsArray.map(transaction => ({ ...transaction, uploadDate: new Date() })) }
      },
      $set: { lastUpdate: new Date() }
    };
    const options = { upsert: true };

    const result = await collection.updateOne(filter, update, options);

    let message = '';
    if (result.upsertedCount > 0) {
      message = `Created new transaction document for user ${userId} and uploaded ${transactionsArray.length} transactions.`;
    } else if (result.modifiedCount > 0) {
      message = `Appended ${transactionsArray.length} transactions to existing document for user ${userId}.`;
    } else {
      message = `No changes made for user ${userId}.`;
    }

    console.log(`Successfully processed transactions for user ${userId} to ${DATABASE_NAME}.${collectionName}. ${message}`);
    return { status: "success", message: `Transactions processed for user ${userId}`, details: message };

  } catch (e) {
    console.error(`An error occurred while uploading transactions to MongoDB: ${e}`);
    return { status: "error", message: `Error uploading transactions to MongoDB: ${e.message}` };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Helper function to get user info from Google (similar to test1.js)
async function getGoogleUserInfo(idToken) {
  const ticket = await oAuth2Client.verifyIdToken({
      idToken: idToken,
      audience: GOOGLE_CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
  });
  const payload = ticket.getPayload();
  return payload; // contains user info like 'sub', 'email', 'name', etc.
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// New endpoint for Google Sign-In
app.post('/auth/google', async (req, res) => {
  const { accessToken } = req.body; // This is actually the ID Token from frontend

  try {
    const userInfo = await getGoogleUserInfo(accessToken); // Pass ID Token to verification function
    res.status(200).json({ message: 'Google authentication successful', user: userInfo });
  } catch (error) {
    console.error('Google authentication failed:', error);
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
});

// New endpoint for PDF upload
app.post('/api/upload-pdf', upload.single('pdfFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const pdfFilePath = req.file.path; // Path to the temporarily saved PDF file
  const accessToken = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null; // Extract token
  const pdfPassword = req.body.password || null; // Extract PDF password (if provided)

  if (!accessToken) {
    return res.status(401).send('Authorization token required');
  }

  try {
    const userInfo = await getGoogleUserInfo(accessToken); // Verify user
    const subId = userInfo.sub; // Get user ID

    // 1. Upload raw PDF to MongoDB
    const pdfBuffer = readFileSync(pdfFilePath); // Read the temporarily saved PDF into a buffer
    const uploadPdfResult = await uploadPdfToMongoDB(pdfBuffer, req.file.originalname, subId);

    if (uploadPdfResult.status === 'error') {
      throw new Error(uploadPdfResult.message);
    }

    const pdfMongoId = uploadPdfResult.pdf_mongo_id; // Get the MongoDB _id of the stored PDF

    // 2. Execute Python script to parse PDF from MongoDB
    const pythonExecutable = path.join(__dirname, '..', '.venv', 'bin', 'python3'); // Corrected path for .venv at project root
    const pythonScript = path.join(__dirname, 'read_pdf.py');
    const pythonProcess = spawn(pythonExecutable, [pythonScript, subId, pdfMongoId, pdfPassword || 'null'], {
      env: {
        ...process.env,
        PYTHONPATH: path.join(__dirname, '..', '.venv', 'lib', 'python3.12', 'site-packages'),
        VIRTUAL_ENV: path.join(__dirname, '..', '.venv')
      }
    });

    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
    });

    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}: ${pythonError}`);
          // Check if error is related to password
          const errorMessage = pythonError.toLowerCase();
          if (errorMessage.includes('password') || errorMessage.includes('decrypt') || errorMessage.includes('encrypted')) {
            return reject(new Error('INCORRECT_PASSWORD'));
          }
          return reject(new Error(`PDF parsing failed: ${pythonError}`));
        }
        resolve();
      });
      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python subprocess:', err);
        reject(new Error(`Failed to execute Python script: ${err.message}`));
      });
    });

    // Parse Python script's JSON output
    const parsedResult = JSON.parse(pythonOutput);

    if (parsedResult.status === 'error') {
      // Check if error message indicates password issue
      const errorMessage = parsedResult.message.toLowerCase();
      if (errorMessage.includes('password') || errorMessage.includes('decrypt') || errorMessage.includes('encrypted')) {
        throw new Error('INCORRECT_PASSWORD');
      }
      throw new Error(parsedResult.message);
    }

    // 3. Upload parsed transaction data to MongoDB
    const uploadTransactionsResult = await uploadTransactionsToMongoDB(parsedResult.data.transactions, subId, TRANSACTIONS_COLLECTION_NAME);

    if (uploadTransactionsResult.status === 'error') {
      throw new Error(uploadTransactionsResult.message);
    }

    res.status(200).json({ message: 'PDF uploaded and processed successfully', result: uploadTransactionsResult });
  } catch (error) {
    console.error('Error processing PDF upload:', error);
    // Check if error is password-related
    if (error.message === 'INCORRECT_PASSWORD') {
      return res.status(400).json({ message: 'INCORRECT_PASSWORD', error: 'The PDF password you entered is incorrect. Please try again.' });
    }
    res.status(500).json({ message: 'Error processing PDF', error: error.message });
  } finally {
    // Clean up the temporary PDF file
    if (pdfFilePath) {
      try {
        await unlink(pdfFilePath);
        console.log(`Deleted temporary PDF file: ${pdfFilePath}`);
      } catch (cleanupError) {
        console.error(`Error deleting temporary PDF file ${pdfFilePath}:`, cleanupError);
      }
    }
  }
});

// New endpoint for re-processing an existing PDF from MongoDB
app.post('/api/reprocess-pdf', async (req, res) => {
  const { subId, pdfMongoId, pdfPassword } = req.body; // Expecting these in the request body

  if (!subId || !pdfMongoId) {
    return res.status(400).json({ message: 'User ID and PDF MongoDB ID are required.' });
  }

  try {
    //  Python script to parse PDF from MongoDB
    const pythonExecutable = path.join(__dirname, '..', '.venv', 'bin', 'python3'); // Corrected path for .venv at project root
    const pythonScript = path.join(__dirname, 'read_pdf.py');
    const pythonProcess = spawn(pythonExecutable, [pythonScript, subId, pdfMongoId, pdfPassword || 'null'], {
      env: {
        ...process.env,
        PYTHONPATH: path.join(__dirname, '..', '.venv', 'lib', 'python3.12', 'site-packages'),
        VIRTUAL_ENV: path.join(__dirname, '..', '.venv')
      }
    });

    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
    });

    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}: ${pythonError}`);
          // Check if error is related to password
          const errorMessage = pythonError.toLowerCase();
          if (errorMessage.includes('password') || errorMessage.includes('decrypt') || errorMessage.includes('encrypted')) {
            return reject(new Error('INCORRECT_PASSWORD'));
          }
          return reject(new Error(`PDF parsing failed: ${pythonError}`));
        }
        resolve();
      });
      pythonProcess.on('error', (err) => {
        console.error('Failed to start Python subprocess:', err);
        reject(new Error(`Failed to execute Python script: ${err.message}`));
      });
    });

    // Parse Python script's JSON output
    const parsedResult = JSON.parse(pythonOutput);

    if (parsedResult.status === 'error') {
      // Check if error message indicates password issue
      const errorMessage = parsedResult.message.toLowerCase();
      if (errorMessage.includes('password') || errorMessage.includes('decrypt') || errorMessage.includes('encrypted')) {
        throw new Error('INCORRECT_PASSWORD');
      }
      throw new Error(parsedResult.message);
    }

    // 3. Upload parsed transaction data to MongoDB
    const uploadTransactionsResult = await uploadTransactionsToMongoDB(parsedResult.data.transactions, subId, TRANSACTIONS_COLLECTION_NAME);

    if (uploadTransactionsResult.status === 'error') {
      throw new Error(uploadTransactionsResult.message);
    }

    res.status(200).json({ message: 'PDF re-processed and transactions uploaded successfully', result: uploadTransactionsResult });

  } catch (error) {
    console.error('Error re-processing PDF:', error);
    // Check if error is password-related
    if (error.message === 'INCORRECT_PASSWORD') {
      return res.status(400).json({ message: 'INCORRECT_PASSWORD', error: 'The PDF password you entered is incorrect. Please try again.' });
    }
    res.status(500).json({ message: 'Error re-processing PDF', error: error.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  let client;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Authorization token required');
    }
    const accessToken = authHeader.split(' ')[1];
    const userInfo = await getGoogleUserInfo(accessToken);
    const subId = userInfo.sub;

    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(TRANSACTIONS_COLLECTION_NAME);

    const transactions = await collection.find({ sub: subId }).toArray();
    res.json(transactions);
  } catch (error) {
    console.error('Error serving transactions:', error);
    res.status(500).send('Error serving transactions');
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Budget Management Endpoints

// Set user budget
app.post('/api/set-budget', async (req, res) => {
  const accessToken = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
  const { budgetAmount, budgetPeriod } = req.body;

  if (!accessToken) {
    return res.status(401).send('Authorization token required');
  }

  if (!budgetAmount || budgetAmount <= 0) {
    return res.status(400).json({ message: 'Budget amount is required and must be positive' });
  }

  try {
    const userInfo = await getGoogleUserInfo(accessToken);
    const subId = userInfo.sub;

    const result = await setUserBudget(subId, budgetAmount, budgetPeriod || 'monthly');

    if (result.status === 'error') {
      return res.status(500).json({ message: result.message });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error setting budget:', error);
    res.status(500).json({ message: 'Error setting budget', error: error.message });
  }
});

// Get user budget
app.get('/api/get-budget', async (req, res) => {
  const accessToken = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

  if (!accessToken) {
    return res.status(401).send('Authorization token required');
  }

  try {
    const userInfo = await getGoogleUserInfo(accessToken);
    const subId = userInfo.sub;

    const result = await getUserBudget(subId);

    if (result.status === 'error') {
      return res.status(500).json({ message: result.message });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting budget:', error);
    res.status(500).json({ message: 'Error getting budget', error: error.message });
  }
});

// Get budget status with current spending
app.get('/api/budget-status', async (req, res) => {
  const accessToken = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

  if (!accessToken) {
    return res.status(401).send('Authorization token required');
  }

  try {
    const userInfo = await getGoogleUserInfo(accessToken);
    const subId = userInfo.sub;

    // Get user's budget
    const budgetResult = await getUserBudget(subId);

    // Get user's transactions and calculate total spending
    let client;
    try {
      client = new MongoClient(MONGODB_CONNECTION_STRING);
      await client.connect();
      const db = client.db(DATABASE_NAME);
      const collection = db.collection(TRANSACTIONS_COLLECTION_NAME);

      const userDoc = await collection.findOne({ sub: subId });
      let totalSpending = 0;

      if (userDoc && userDoc.transactions) {
        totalSpending = userDoc.transactions.reduce((sum, transaction) => sum + transaction.total, 0);
      }

      // Calculate budget status
      const budgetAmount = budgetResult.status === 'success' ? budgetResult.budget.budgetAmount : 0;
      const budgetStatus = calculateBudgetStatus(totalSpending, budgetAmount);

      res.status(200).json({
        status: 'success',
        budgetStatus: budgetStatus,
        budget: budgetResult.status === 'success' ? budgetResult.budget : null
      });

    } finally {
      if (client) {
        await client.close();
      }
    }

  } catch (error) {
    console.error('Error getting budget status:', error);
    res.status(500).json({ message: 'Error getting budget status', error: error.message });
  }
});

//AI Analytics Endpoints
app.get('/api/analytics', async (req, res) => {
  let client;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Authorization token required');
    }
    const accessToken = authHeader.split(' ')[1];
    const userInfo = await getGoogleUserInfo(accessToken);
    const subId = userInfo.sub;

    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(TRANSACTIONS_COLLECTION_NAME);

    // Fetch user's transaction document
    const userDoc = await collection.findOne({ sub: subId });
    
    if (!userDoc || !userDoc.transactions || userDoc.transactions.length === 0) {
      return res.json({
        status: 'success',
        message: 'No transactions available for analysis',
        analytics: null
      });
    }

    // Analyze transactions
    const analytics = await analyzeWithChatGPT([userDoc]);

    res.json({
      status: 'success',
      analytics: analytics
    });

  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error generating analytics',
      error: error.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Delete all transactions and PDFs for a user
app.delete('/api/delete-transactions', async (req, res) => {
  let client;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Authorization token required');
    }
    const accessToken = authHeader.split(' ')[1];
    const userInfo = await getGoogleUserInfo(accessToken);
    const subId = userInfo.sub;

    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);

    // Delete all PDFs for the user
    const pdfCollection = db.collection(PDF_COLLECTION_NAME);
    const pdfDeleteResult = await pdfCollection.deleteMany({ sub: subId });
    console.log(`Deleted ${pdfDeleteResult.deletedCount} PDF file(s) for user ${subId}`);

    // Delete all transactions for the user
    const transactionsCollection = db.collection(TRANSACTIONS_COLLECTION_NAME);
    const transactionsDeleteResult = await transactionsCollection.deleteMany({ sub: subId });
    console.log(`Deleted ${transactionsDeleteResult.deletedCount} transaction document(s) for user ${subId}`);

    res.json({
      status: 'success',
      message: 'All transactions and PDFs deleted successfully',
      deletedPdfs: pdfDeleteResult.deletedCount,
      deletedTransactions: transactionsDeleteResult.deletedCount
    });

  } catch (error) {
    console.error('Error deleting transactions and PDFs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting transactions and PDFs',
      error: error.message
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Friends Feature Endpoints
const FRIENDS_COLLECTION_NAME = "friends";
const BUDGET_COLLECTION_NAME = "budgets";

// Send friend request
app.post('/api/friends/send-request', async (req, res) => {
  let client;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Authorization token required');
    }
    const accessToken = authHeader.split(' ')[1];
    const userInfo = await getGoogleUserInfo(accessToken);
    const senderSub = userInfo.sub;
    const senderEmail = userInfo.email;
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    if (recipientEmail === senderEmail) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(FRIENDS_COLLECTION_NAME);

    // Check if request already exists
    const existingRequest = await collection.findOne({
      $or: [
        { senderSub, recipientEmail, status: 'pending' },
        { senderSub, recipientEmail, status: 'accepted' }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent or already friends' });
    }

    // Create friend request
    const friendRequest = {
      senderSub,
      senderEmail,
      recipientEmail,
      status: 'pending',
      createdAt: new Date()
    };

    await collection.insertOne(friendRequest);
    res.json({ status: 'success', message: 'Friend request sent successfully' });

  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Error sending friend request', error: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Get friend requests (received and sent)
app.get('/api/friends/requests', async (req, res) => {
  let client;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Authorization token required');
    }
    const accessToken = authHeader.split(' ')[1];
    const userInfo = await getGoogleUserInfo(accessToken);
    const userSub = userInfo.sub;
    const userEmail = userInfo.email;

    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(FRIENDS_COLLECTION_NAME);

    // Get received requests (pending)
    const receivedRequests = await collection.find({
      recipientEmail: userEmail,
      status: 'pending'
    }).toArray();

    // Get sent requests (pending)
    const sentRequests = await collection.find({
      senderSub: userSub,
      status: 'pending'
    }).toArray();

    // Get accepted friends
    const friendsRaw = await collection.find({
      $or: [
        { senderSub: userSub, status: 'accepted' },
        { recipientEmail: userEmail, status: 'accepted' }
      ]
    }).toArray();

    // Map friends to include the friend's email (the other person's email)
    const friends = friendsRaw.map(friend => ({
      ...friend,
      friendEmail: friend.senderSub === userSub ? friend.recipientEmail : friend.senderEmail
    }));

    res.json({
      receivedRequests,
      sentRequests,
      friends
    });

  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ message: 'Error fetching friend requests', error: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Accept friend request
app.post('/api/friends/accept', async (req, res) => {
  let client;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Authorization token required');
    }
    const accessToken = authHeader.split(' ')[1];
    const userInfo = await getGoogleUserInfo(accessToken);
    const userEmail = userInfo.email;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(FRIENDS_COLLECTION_NAME);

    // Update request status to accepted
    const result = await collection.updateOne(
      { _id: new ObjectId(requestId), recipientEmail: userEmail, status: 'pending' },
      { $set: { status: 'accepted', acceptedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    res.json({ status: 'success', message: 'Friend request accepted' });

  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Error accepting friend request', error: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Ignore/Reject friend request
app.post('/api/friends/ignore', async (req, res) => {
  let client;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Authorization token required');
    }
    const accessToken = authHeader.split(' ')[1];
    const userInfo = await getGoogleUserInfo(accessToken);
    const userEmail = userInfo.email;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(FRIENDS_COLLECTION_NAME);

    // Delete the request (ignore it)
    const result = await collection.deleteOne({
      _id: new ObjectId(requestId),
      recipientEmail: userEmail,
      status: 'pending'
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    res.json({ status: 'success', message: 'Friend request ignored' });

  } catch (error) {
    console.error('Error ignoring friend request:', error);
    res.status(500).json({ message: 'Error ignoring friend request', error: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Leaderboard Endpoint
app.get('/api/leaderboard', async (req, res) => {
  let client;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send('Authorization token required');
    }
    const accessToken = authHeader.split(' ')[1];
    const userInfo = await getGoogleUserInfo(accessToken);
    const userSub = userInfo.sub;
    const userEmail = userInfo.email;

    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const friendsCollection = db.collection(FRIENDS_COLLECTION_NAME);
    const transactionsCollection = db.collection(TRANSACTIONS_COLLECTION_NAME);
    const budgetCollection = db.collection(BUDGET_COLLECTION_NAME);

    // Get user's friends
    const friendsRaw = await friendsCollection.find({
      $or: [
        { senderSub: userSub, status: 'accepted' },
        { recipientEmail: userEmail, status: 'accepted' }
      ]
    }).toArray();

    // Get friend emails
    const friendEmails = friendsRaw.map(friend => 
      friend.senderSub === userSub ? friend.recipientEmail : friend.senderEmail
    );

    // Get user's own budget and spending
    const userBudget = await budgetCollection.findOne({ sub: userSub });
    const userTransactions = await transactionsCollection.findOne({ sub: userSub });
    const userSpending = userTransactions && userTransactions.transactions 
      ? userTransactions.transactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0)
      : 0;
    const userBudgetAmount = userBudget ? userBudget.budgetAmount : 0;
    const userDifference = userBudgetAmount - userSpending;

    // Create leaderboard entry for current user
    const leaderboard = [{
      email: userEmail,
      sub: userSub,
      spending: userSpending,
      budget: userBudgetAmount,
      difference: userDifference,
      isCurrentUser: true
    }];

    // Get friends' data
    for (const friendEmail of friendEmails) {
      // Find friend's sub by searching for requests where they are the sender
      const friendRequestAsSender = await friendsCollection.findOne({
        senderEmail: friendEmail,
        status: 'accepted'
      });

      let friendSubToUse = null;
      if (friendRequestAsSender) {
        friendSubToUse = friendRequestAsSender.senderSub;
      } else {
        // If not found as sender, search where they are recipient and get senderSub from reverse request
        const friendRequestAsRecipient = await friendsCollection.findOne({
          recipientEmail: friendEmail,
          status: 'accepted'
        });
        if (friendRequestAsRecipient) {
          // Find reverse request where friendEmail is the sender
          const reverseRequest = await friendsCollection.findOne({
            senderEmail: friendEmail,
            recipientEmail: friendRequestAsRecipient.senderEmail,
            status: 'accepted'
          });
          if (reverseRequest) {
            friendSubToUse = reverseRequest.senderSub;
          }
        }
      }

      if (friendSubToUse) {
        const friendBudget = await budgetCollection.findOne({ sub: friendSubToUse });
        const friendTransactionsDoc = await transactionsCollection.findOne({ sub: friendSubToUse });
        const friendSpending = friendTransactionsDoc && friendTransactionsDoc.transactions
          ? friendTransactionsDoc.transactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0)
          : 0;
        const friendBudgetAmount = friendBudget ? friendBudget.budgetAmount : 0;
        const friendDifference = friendBudgetAmount - friendSpending;

        leaderboard.push({
          email: friendEmail,
          sub: friendSubToUse,
          spending: friendSpending,
          budget: friendBudgetAmount,
          difference: friendDifference,
          isCurrentUser: false
        });
      }
    }

    // Sort by difference (highest difference = best, meaning most under budget)
    leaderboard.sort((a, b) => b.difference - a.difference);

    // Add rank
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.json({ leaderboard });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});