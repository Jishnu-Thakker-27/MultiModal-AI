import requests
import os

BASE_URL = "http://127.0.0.1:8000/api"

def test_covered():
    conv = requests.post(f"{BASE_URL}/conversations", json={"title": "BST Session"}).json()
    conv_id = conv["id"]
    print(f"Created session: {conv_id}")

    sample_pdf = "sample_data/Data_Structures_Overview.pdf"
    with open(sample_pdf, "rb") as f:
        res_upload = requests.post(f"{BASE_URL}/conversations/{conv_id}/upload", files={"file": f}).json()
    print(f"Upload Result: {res_upload}")

    chat_res = requests.post(f"{BASE_URL}/conversations/{conv_id}/chat", json={"question": "What is a Binary Search Tree?"}).json()
    print(f"\nGrounded: {chat_res.get('is_grounded')}")
    print(f"Citations: {chat_res.get('citations')}")
    print(f"\nAnswer Output:\n{chat_res.get('answer')}")

if __name__ == "__main__":
    test_covered()
