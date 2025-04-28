# Troubleshooting Guide

This guide will help you resolve common issues that might arise when setting up and running the Vendor SaaS MVP.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Server Startup Issues](#server-startup-issues)
3. [Client Startup Issues](#client-startup-issues)
4. [Firebase Configuration Issues](#firebase-configuration-issues)
5. [Stripe Integration Issues](#stripe-integration-issues)
6. [Authentication Issues](#authentication-issues)
7. [Deployment Issues](#deployment-issues)

## Installation Issues

### "Node modules not found" or other dependency errors

**Solution**: Make sure you've installed all dependencies:

```bash
# Run from the project root
npm run install-all
```

This will install dependencies for the root project, client, and server.

### Package version conflicts

**Solution**: Clear npm cache and reinstall:

```bash
npm cache clean --force
rm -rf node_modules
rm -rf client/node_modules
rm -rf server/node_modules
npm run install-all
```

## Server Startup Issues

### Missing environment variables

**Solution**: Create a `.env` file in the server directory based on `.env.example`:

```bash
cd server
cp .env.example .env
```

Then fill in the required values in the `.env` file.

### Firebase service account file missing

**Solution**: Get your Firebase service account key:

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the file as `server/config/serviceAccountKey.json`

### Port conflict

**Solution**: Change the port number in your `.env` file:

```
PORT=5001  # Change from default 5000
```

### Database connection fails

**Solution**: Check your Firebase service account key and make sure the Firebase project exists and has Firestore enabled.

## Client Startup Issues

### Missing environment variables

**Solution**: Create a `.env` file in the client directory based on `.env.example`:

```bash
cd client
cp .env.example .env
```

Then fill in the required values, particularly the Firebase configuration.

### React build errors

**Solution**: Check for syntax errors in your code. Common issues include:

- Missing imports
- Incorrect JSX syntax
- Undefined variables

Run with verbose output:

```bash
cd client
REACT_APP_DEBUG=true npm start
```

### "Module not found" errors

**Solution**: Ensure all required packages are installed:

```bash
cd client
npm install --save [missing-package]
```

## Firebase Configuration Issues

### Authentication not working

**Solution**:

1. Make sure Firebase Authentication is enabled in your Firebase console
2. Enable Email/Password authentication method
3. Check your Firebase config in `client/src/config/firebase.js`

### Firestore permission denied

**Solution**: Check your Firestore security rules in `firestore.rules` and make sure they match the ones provided in the project.

### Storage permission denied

**Solution**: Check your Storage security rules in `storage.rules` and make sure they match the ones provided in the project.

## Stripe Integration Issues

### Stripe API key issues

**Solution**: Make sure your Stripe API keys are correct:

1. Get your API keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Update your server `.env` file with the correct keys
3. Make sure to use test mode keys for development

### Webhook errors

**Solution**:

1. Set up a webhook endpoint in your Stripe Dashboard pointing to your application's `/api/stripe/webhook` endpoint
2. Get the webhook signing secret and add it to your server `.env` file
3. For local development, use Stripe CLI to forward webhook events

## Authentication Issues

### User registration fails

**Solution**:

1. Check Firebase Authentication is enabled
2. Ensure email/password auth is enabled in Firebase Console
3. Check network requests for specific error messages

### Login fails

**Solution**:

1. Check browser console for errors
2. Verify Firebase configuration
3. Make sure the user exists in Firebase Authentication

## Deployment Issues

### Firebase deployment fails

**Solution**:

1. Make sure you're logged in to Firebase CLI:
   ```bash
   firebase login
   ```

2. Make sure your Firebase project exists and is correctly initialized:
   ```bash
   firebase projects:list
   ```

3. Check your `firebase.json` configuration

### Client builds but server fails to deploy

**Solution**: Firebase Functions requires a production-ready server. Make sure:

1. All required dependencies are in `server/package.json` (not devDependencies)
2. Environment variables are set in Firebase Functions:
   ```bash
   firebase functions:config:set stripe.secret=your_stripe_secret_key stripe.webhook=your_webhook_secret
   ```

3. Make sure your Firebase plan supports Cloud Functions (Blaze plan required)

## Still Having Issues?

If you're still experiencing problems after trying these solutions, please:

1. Check the project documentation again
2. Search for similar issues in the project repository issues
3. Create a new issue in the repository with detailed information about your problem
