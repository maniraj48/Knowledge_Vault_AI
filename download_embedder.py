from sentence_transformers import SentenceTransformer
import os

# Define where to save it (inside your existing models folder)
save_path = "./models/all-MiniLM-L6-v2"

print("Downloading embedding model...")
# Load the model from the internet
model = SentenceTransformer('all-MiniLM-L6-v2')

# Save it to your local folder
model.save(save_path)

print(f"Success! Model saved to: {save_path}")
print("You can now go offline.")