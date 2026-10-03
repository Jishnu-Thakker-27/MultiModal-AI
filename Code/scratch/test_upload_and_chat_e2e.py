import requests
import os

BASE_URL = "http://127.0.0.1:8000/api"

def test_e2e():
    # 1. Create a conversation
    res = requests.post(f"{BASE_URL}/conversations", json={"title": "Data Structures Session", "topic_name": "General"})
    conv_data = res.json()
    conv_id = conv_data["id"]
    print(f"1. Created conversation ID: {conv_id}")

    # 2. Find sample PDF in sample_data
    sample_dir = "sample_data"
    pdf_files = [os.path.join(sample_dir, f) for f in os.listdir(sample_dir) if f.endswith(".pdf")] if os.path.exists(sample_dir) else []
    
    if pdf_files:
        sample_pdf = pdf_files[0]
        print(f"2. Uploading sample PDF: {sample_pdf}")
        with open(sample_pdf, "rb") as f:
            upload_res = requests.post(f"{BASE_URL}/conversations/{conv_id}/upload", files={"file": f})
        print(f"Upload Response: {upload_res.json()}")

    # 3. Send chat prompt for covered concept
    question = "Explain what a B-Tree is"
    print(f"3. Sending prompt: '{question}'")
    chat_res = requests.post(f"{BASE_URL}/conversations/{conv_id}/chat", json={"question": question})
    chat_data = chat_res.json()
    print("Chat Response:")
    print(f"Grounded: {chat_data.get('is_grounded')}")
    print(f"Citations Count: {len(chat_data.get('citations', []))}")
    print("Citations List:")
    for c in chat_data.get('citations', []):
        print(f"  - Document: {c.get('document_title')} | Page: {c.get('page')}")
    print("\nAnswer Output:")
    print(chat_data.get('answer', ''))

if __name__ == "__main__":
    test_e2e()
