# WhisperBox API Documentation

## Authentication
- **Bearer Token**: All endpoints (except `/auth/register` and `/auth/login`) require a Bearer token in the `Authorization` header.
- **Token Expiry**: Access tokens expire after 15 minutes. Use refresh tokens for renewal.

## Endpoints

### Auth
- `POST /auth/register`: Create a new account. Requires `username`, `password`, `public_key`, `wrapped_private_key`, and `pbkdf2_salt`.
- `POST /auth/login`: Authenticate and receive tokens + key material (`wrapped_private_key`, `pbkdf2_salt`).
- `GET /auth/me`: Fetch current user profile and key material.
- `POST /auth/refresh`: Renew access token using a refresh token.
- `POST /auth/logout`: Revoke refresh token.

### Users
- `GET /users/search?q=<query>`: Search for users.
- `GET /users/{userId}/public-key`: Fetch a specific user's RSA-OAEP public key.

### Messages
- `GET /conversations`: List all conversations.
- `GET /conversations/{userId}/messages`: Get message history (paginated, newest first).
- `POST /messages`: Send an encrypted message (offline fallback).

### WebSocket
- `WS /ws?token=<access_token>`: Real-time messaging connection.
- Events: `message.send` (client to server), `message.receive` (server to client).

## Encryption Workflow
1. **Key Setup**: RSA-OAEP 2048-bit keypair + PBKDF2 salt. Private key wrapped with AES-KW derived from password.
2. **Sending**:
   - Fetch recipient's public key.
   - Generate AES-GCM key and IV.
   - Encrypt plaintext with AES-GCM.
   - Encrypt AES key with recipient's RSA public key and sender's RSA public key.
3. **Receiving**:
   - Decrypt `encryptedKey` with RSA private key.
   - Decrypt `ciphertext` with AES-GCM key + IV.
