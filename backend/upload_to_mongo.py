import json
from pymongo import MongoClient
import os
import binascii # Import binascii for CRC32 calculation

# --- Configuration---
MONGODB_CONNECTION_STRING = "mongodb+srv://superuser:superuser123@cluster0.s3aalbl.mongodb.net/" # Your MongoDB connection string
DATABASE_NAME = "fintrackr"
COLLECTION_NAME = "pdf_files" # New collection for PDFs

PDF_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "PhonePe_Transaction_Statement.pdf") # Renamed from JSON_FILE_PATH
# -----------------------------------

def upload_pdf_to_mongodb(connection_string, db_name, collection_name, pdf_file_path, user_id):
    try:
        client = MongoClient(connection_string)
        db = client[db_name]
        collection = db[collection_name]

        with open(pdf_file_path, 'rb') as f:
            pdf_data = f.read()

        if pdf_data:
            # Calculate CRC32 checksum for the PDF data
            crc32_checksum = binascii.crc32(pdf_data) & 0xFFFFFFFF
            document = {
                "filename": os.path.basename(pdf_file_path),
                "data": pdf_data,
                "sub": user_id,
                "crc32_checksum": crc32_checksum
            }
            collection.insert_one(document)
            print(f"Successfully uploaded PDF file '{os.path.basename(pdf_file_path)}' with CRC32 checksum {crc32_checksum} to {db_name}.{collection_name}")
        else:
            print(f"PDF file {pdf_file_path} is empty. No document uploaded.")

    except FileNotFoundError:
        print(f"Error: PDF file not found at {pdf_file_path}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    print(f"Attempting to upload data from {PDF_FILE_PATH} to MongoDB...")
    upload_pdf_to_mongodb(MONGODB_CONNECTION_STRING, DATABASE_NAME, COLLECTION_NAME, PDF_FILE_PATH)
    print("Upload process completed.")
