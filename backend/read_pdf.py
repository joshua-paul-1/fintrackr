import pdfplumber
import re
import io
from collections import defaultdict
import dotenv
import os
import json
from pymongo import MongoClient
from datetime import datetime # Import datetime
import sys # Import sys to read command line arguments
from bson import ObjectId # Import ObjectId

dotenv.load_dotenv()

MONGODB_CONNECTION_STRING = os.getenv("MONGODB_CONNECTION_STRING", "mongodb+srv://superuser:superuser123@cluster0.s3aalbl.mongodb.net/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "fintrackr")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "transactions") # Changed to "transactions"
PDF_COLLECTION_NAME = os.getenv("PDF_COLLECTION_NAME", "pdf_files") # New: Collection for storing raw PDFs
password = os.getenv("PDF_PASSWORD")                      # PDF password

SPENDING_GOAL = 3000.0 # Example spending goal in INR

def get_grand_total(transactions_list):
    grand_total = 0
    for transaction in transactions_list:
        grand_total += transaction["total"]
    return grand_total

def upload_transactions_to_mongodb(transactions_array, user_id):
    """Upload transactions as an array for a single user"""
    client = None
    try:
        client = MongoClient(MONGODB_CONNECTION_STRING)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]

        if not transactions_array or len(transactions_array) == 0:
            return {"status": "success", "message": "No transactions to upload."}

        # Add user_id and uploadDate to each transaction
        transactions_with_metadata = []
        for transaction in transactions_array:
            transaction_with_metadata = {
                **transaction,
                "sub": user_id,
                "uploadDate": datetime.now()
            }
            transactions_with_metadata.append(transaction_with_metadata)

        # Use upsert to create or update user document with transactions array
        filter_query = {"sub": user_id}
        update_query = {
            "$push": {
                "transactions": {"$each": transactions_with_metadata}
            },
            "$set": {
                "lastUpdate": datetime.now()
            }
        }
        result = collection.update_one(filter_query, update_query, upsert=True)

        if result.upserted_id is not None:
            message = f"Created new transaction document for user {user_id} and uploaded {len(transactions_array)} transactions."
        elif result.modified_count > 0:
            message = f"Appended {len(transactions_array)} transactions to existing document for user {user_id}."
        else:
            message = f"No changes made for user {user_id}."

        return {"status": "success", "message": message, "transactions_count": len(transactions_array)}

    except Exception as e:
        return {"status": "error", "message": f"Error uploading transactions: {str(e)}"}
    finally:
        if client:
            client.close()

def read_pdf_from_mongodb(user_id, pdf_mongo_id, password):
    client = None
    try:
        client = MongoClient(MONGODB_CONNECTION_STRING)
        db = client[DATABASE_NAME]
        collection = db[PDF_COLLECTION_NAME]

        # Find the PDF document for the specific user and mongo _id
        pdf_document = collection.find_one({"sub": user_id, "_id": ObjectId(pdf_mongo_id)})

        if pdf_document:
            return io.BytesIO(pdf_document["data"])
        else:
            return None
    except Exception as e:
        return None
    finally:
        if client:
            client.close()

# Main execution block to be called from Node.js
if __name__ == "__main__":
    if len(sys.argv) < 4 or len(sys.argv) > 5:
        print(json.dumps({"status": "error", "message": "Usage: python read_pdf.py <user_id> <pdf_mongo_id> [password]"}))
        sys.exit(1)

    user_id = sys.argv[1]
    pdf_mongo_id = sys.argv[2]
    pdf_password_arg = sys.argv[3] if len(sys.argv) == 4 and sys.argv[3] != 'null' else password

    pdf_file_object = read_pdf_from_mongodb(user_id, pdf_mongo_id, pdf_password_arg)
    
    if not pdf_file_object:
        print(json.dumps({"status": "error", "message": "PDF not found or error reading from MongoDB."}))
        sys.exit(1)

    text = ""
    try:
        with pdfplumber.open(pdf_file_object, password=pdf_password_arg) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Error reading PDF: {e}"}))
        sys.exit(1)

    # Updated pattern to capture date, paid to, and amount, and then a separate regex for time.
    # Date: Month Day, Year (e.g., Aug 23, 2025)
    # Paid to Name: (.*?)
    # Amount: INR (\d+\.?\d*)
    # Time: on the next line, HH:MM AM/PM

    transaction_pattern = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\s+Paid to (.*?)\s+Debit INR (\d+\.?\d*)"
    time_pattern = r"(\d{2}:\d{2}\s*(?:AM|PM))"

    transactions_raw = []
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        match = re.search(transaction_pattern, lines[i])
        if match:
            date_str_month, name, amount_str = match.groups()
            date_str = match.group(0).split('Paid to')[0].strip()
            amount = float(amount_str)
            name = name.strip()

            transaction_datetime = None
            time_str = None

            # Check the next line for time
            if i + 1 < len(lines):
                time_match = re.search(time_pattern, lines[i+1])
                if time_match:
                    time_str = time_match.group(1)

            try:
                if time_str:
                    dt_string = f"{date_str} {time_str}"
                    # Example: Aug 23, 2025 02:21 PM
                    transaction_datetime = datetime.strptime(dt_string, "%b %d, %Y %I:%M %p")
                else:
                    # Example: Aug 23, 2025
                    transaction_datetime = datetime.strptime(date_str, "%b %d, %Y")
            except ValueError as e:
                print(f"Warning: Could not parse date/time '{date_str} {time_str}': {e}", file=sys.stderr)

            transactions_raw.append({
                "name": name,
                "total": amount,
                "date": transaction_datetime.isoformat() if transaction_datetime else None,
                "time": transaction_datetime.strftime("%H:%M:%S") if transaction_datetime else None
            })
            i += 1 # Move to the next line after finding a transaction and potentially its time
        i += 1

    transactions = []
    for t_raw in transactions_raw:
        transactions.append({
            "name": t_raw["name"],
            "total": t_raw["total"],
            "date": t_raw["date"],
            "time": t_raw["time"]
        })

    # Upload transactions to MongoDB as an array for the user
    upload_result = upload_transactions_to_mongodb(transactions, user_id)
    
    if upload_result["status"] == "error":
        print(json.dumps({"status": "error", "message": upload_result["message"]}))
        sys.exit(1)

    data = {"transactions": transactions}

    grand_total_amount = sum(t["total"] for t in transactions)
    
    if grand_total_amount <= SPENDING_GOAL:
        data["overallGoalStatus"] = "Met Goal"
        data["overallDifference"] = SPENDING_GOAL - grand_total_amount
    else:
        data["overallGoalStatus"] = "Exceeded Goal"
        data["overallDifference"] = grand_total_amount - SPENDING_GOAL

    # Include upload result in the response
    data["upload_result"] = upload_result

    print(json.dumps({"status": "success", "data": data})) # Output the parsed data as JSON
