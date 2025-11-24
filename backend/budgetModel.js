import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_CONNECTION_STRING = process.env.MONGODB_URI || "mongodb+srv://superuser:superuser123@cluster0.s3aalbl.mongodb.net/";
const DATABASE_NAME = process.env.DB_NAME || "fintrackr";
const BUDGET_COLLECTION_NAME = "budgets";

// Function to set or update user budget
async function setUserBudget(userId, budgetAmount, budgetPeriod = 'monthly') {
  let client;
  try {
    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(BUDGET_COLLECTION_NAME);

    const filter = { sub: userId };
    const update = {
      $set: {
        budgetAmount: budgetAmount,
        budgetPeriod: budgetPeriod,
        lastUpdated: new Date()
      }
    };
    const options = { upsert: true };

    const result = await collection.updateOne(filter, update, options);

    let message = '';
    if (result.upsertedId) {
      message = `Created new budget for user ${userId}: ₹${budgetAmount} (${budgetPeriod})`;
    } else if (result.modifiedCount > 0) {
      message = `Updated budget for user ${userId}: ₹${budgetAmount} (${budgetPeriod})`;
    } else {
      message = `No changes made for user ${userId}`;
    }

    console.log(`Budget operation for user ${userId}: ${message}`);
    return { status: "success", message: message, budgetAmount: budgetAmount, budgetPeriod: budgetPeriod };

  } catch (e) {
    console.error(`An error occurred while setting budget: ${e}`);
    return { status: "error", message: `Error setting budget: ${e.message}` };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Function to get user budget
async function getUserBudget(userId) {
  let client;
  try {
    client = new MongoClient(MONGODB_CONNECTION_STRING);
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(BUDGET_COLLECTION_NAME);

    const budget = await collection.findOne({ sub: userId });

    if (budget) {
      return { 
        status: "success", 
        budget: {
          budgetAmount: budget.budgetAmount,
          budgetPeriod: budget.budgetPeriod,
          lastUpdated: budget.lastUpdated
        }
      };
    } else {
      return { status: "not_found", message: "No budget set for this user" };
    }

  } catch (e) {
    console.error(`An error occurred while getting budget: ${e}`);
    return { status: "error", message: `Error getting budget: ${e.message}` };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Function to calculate budget status based on total spending
function calculateBudgetStatus(totalSpending, budgetAmount) {
  if (!budgetAmount || budgetAmount <= 0) {
    return {
      status: "no_budget",
      message: "No budget set",
      totalSpending: totalSpending,
      budgetAmount: 0,
      difference: 0
    };
  }

  const difference = budgetAmount - totalSpending;
  
  if (difference >= 0) {
    return {
      status: "within_budget",
      message: "Within Budget",
      totalSpending: totalSpending,
      budgetAmount: budgetAmount,
      difference: difference,
      percentage: ((totalSpending / budgetAmount) * 100).toFixed(1)
    };
  } else {
    return {
      status: "over_budget",
      message: "Over Budget",
      totalSpending: totalSpending,
      budgetAmount: budgetAmount,
      difference: Math.abs(difference),
      percentage: ((totalSpending / budgetAmount) * 100).toFixed(1)
    };
  }
}

export { setUserBudget, getUserBudget, calculateBudgetStatus };
