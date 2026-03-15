from cryptography.fernet import Fernet

# Generate and print a new key
key = Fernet.generate_key()
print(key.decode()) # Save this key to .env as FERNET_KEY